import { Router } from 'express';
import { db } from '../config/db.js';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import DatabaseService from '../database.js';
import { ADMIN_CLASSES } from '../config/constants.js';

const router = Router();
const Database = DatabaseService;

// Rate limiting for admin routes
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Enhanced authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authorization token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Database.getUserById(decoded.id);
    
    if (!user || ![
      'SUPERADMIN',
      'FINANCE_ADMIN',
      'CALL_ADMIN',
      'LIVE_SUPPORT_ADMIN',
      'MARKETING_ADMIN',
      'ACCOUNTING_ADMIN'
    ].includes(user.adminClass)) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    // Attach full user object with permissions
    req.admin = {
      id: user._id,
      adminClass: user.adminClass,
      permissions: await Database.getRolePermissions(user.adminClass)
    };

    next();
  } catch (err) {
    logger.error('Authentication error:', err);
    return res.status(401).json({ 
      error: err.name === 'TokenExpiredError' 
        ? 'Session expired' 
        : 'Invalid authentication token'
    });
  }
};

// Validation middleware for operator creation
const validateOperatorInput = [
  body('adminName').isAlphanumeric().withMessage('Invalid admin name format'),
  body('email').isEmail().normalizeEmail(),
  body('password').isStrongPassword({
    minLength: 12,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1
  }),
  body('adminClass').isIn([
    'FINANCE_ADMIN',
    'CALL_ADMIN',
    'LIVE_SUPPORT_ADMIN',
    'MARKETING_ADMIN',
    'ACCOUNTING_ADMIN'
  ]),
  body('phone').isMobilePhone()
];

// Enhanced dashboard with caching
router.get('/dashboard', 
  authenticateAdmin,
  adminRateLimiter,
  async (req, res) => {
    try {
      if (!req.admin.permissions.viewDashboard) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const stats = await Database.getDashboardStats({
        cache: true,
        ttl: 300 // 5 minutes cache
      });
      
      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      logger.error('Dashboard error:', err);
      res.status(500).json({ 
        error: process.env.NODE_ENV === 'development' 
          ? err.message 
          : 'Failed to load dashboard data'
      });
    }
  }
);

// Operator management with advanced features
router.post('/operators',
  authenticateAdmin,
  validateOperatorInput,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.admin.permissions.manageOperators) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const operatorData = {
        ...req.body,
        password: await bcrypt.hash(req.body.password, 12),
        createdBy: req.admin.id,
        lastModifiedBy: req.admin.id
      };

      const operator = await Database.createOperator(operatorData);
      
      await Database.logAdminAction({
        adminId: req.admin.id,
        action: 'OPERATOR_CREATE',
        targetId: operator.id,
        metadata: {
          adminClass: operatorData.adminClass,
          email: operatorData.email
        },
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: {
          id: operator.id,
          adminName: operator.adminName,
          adminClass: operator.adminClass,
          status: 'ACTIVE'
        }
      });
    } catch (err) {
      logger.error('Operator creation error:', err);
      
      const errorResponse = {
        error: 'Failed to create operator',
        code: 'OPERATOR_CREATION_FAILED'
      };

      if (err.code === 11000) {
        errorResponse.details = 'Admin name or email already exists';
      }

      res.status(400).json(errorResponse);
    }
  }
);

// Unified response format middleware
router.use((req, res, next) => {
  res.apiSuccess = (data, meta) => res.json({
    success: true,
    data,
    meta
  });

  res.apiError = (error, code = 'SERVER_ERROR') => res.status(400).json({
    success: false,
    error,
    code
  });

  next();
});

export default router;