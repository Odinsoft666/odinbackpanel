import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Admin from '../models/Admin.js';
import adminController from '../controllers/adminController.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Dashboard Routes
router.get('/dashboard', authorize(['SUPERADMIN', 'FINANCE_ADMIN', 'RISK_ADMIN']), adminController.getDashboardStats);

// Player Management
router.get('/players', authorize(['SUPERADMIN', 'RISK_ADMIN', 'LIVE_SUPPORT_ADMIN']), adminController.getPlayers);

// Operator Management
router.get('/operators', authorize(['SUPERADMIN']), adminController.getOperators);
router.get('/operators/:id', authorize(['SUPERADMIN']), adminController.getOperator);
router.post('/operators', authorize(['SUPERADMIN']), adminController.createOperator);
router.put('/operators/:id', authorize(['SUPERADMIN']), adminController.updateOperator);
router.delete('/operators/:id', authorize(['SUPERADMIN']), adminController.deleteOperator);
router.get('/operator-classes', authorize(['SUPERADMIN']), adminController.getOperatorClasses);

// Admin User Management
router.post('/', 
  authorize('SUPERADMIN'),
  async (req, res) => {
    try {
      const newAdmin = await Admin.create(req.body);
      res.status(201).json({
        success: true,
        data: {
          id: newAdmin._id,
          adminName: newAdmin.adminName,
          role: newAdmin.role,
          name: newAdmin.firstName,
          email: newAdmin.email,
          isActive: newAdmin.isActive
        }
      });
    } catch (error) {
      logger.error('Create admin error:', error);
      res.status(400).json({
        success: false,
        error: error.message.includes('duplicate key') 
          ? 'Admin name or email already exists' 
          : error.message
      });
    }
  }
);

router.get('/', 
  authorize(['SUPERADMIN', 'FINANCE_ADMIN']),
  async (req, res) => {
    try {
      const admins = await Admin.find()
        .select('-password -__v -loginHistory -activityLog')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: admins.length,
        data: admins
      });
    } catch (error) {
      logger.error('Get admins error:', error);
      res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
);

router.patch('/:id/status',
  authorize('SUPERADMIN'),
  async (req, res) => {
    try {
      if (req.params.id === req.user.id && req.body.isActive === false) {
        return res.status(400).json({
          success: false,
          error: 'Cannot deactivate your own account'
        });
      }

      const admin = await Admin.findByIdAndUpdate(
        req.params.id,
        { isActive: req.body.isActive },
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      logger.info(`Admin ${admin._id} status changed to ${admin.isActive} by ${req.user.id}`);
      
      res.json({
        success: true,
        data: admin
      });
    } catch (error) {
      logger.error('Update admin status error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Admin Profile Management
router.get('/me', 
  authorize(['SUPERADMIN', 'FINANCE_ADMIN', 'RISK_ADMIN', 'LIVE_SUPPORT_ADMIN']),
  async (req, res) => {
    try {
      const admin = await Admin.findById(req.user.id)
        .select('-password -__v -loginHistory -activityLog');

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      res.json({
        success: true,
        data: admin
      });
    } catch (error) {
      logger.error('Get admin profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
);

export default router;