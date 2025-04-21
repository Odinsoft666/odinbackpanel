// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { userDBService } from '../database.js';
import { logger } from '../utils/logger.js';
import { ADMIN_ROLES } from '../config/constants.js';

// Renamed to 'protect' for clearer semantics
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('Authorization header missing or invalid');
      return res.status(401).json({ 
        success: false,
        error: 'Unauthorized - No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Session expired - Please login again' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      error: 'Not authorized - Invalid token' 
    });
  }
};

// Flexible role authorization middleware
export const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('Attempt to access protected route without authentication');
        return res.status(401).json({ 
          success: false,
          error: 'Not authenticated' 
        });
      }

      // Get fresh user data from DB
      const { user } = await userDBService.authenticate(req.user.username, '', true);
      if (!user) {
        logger.warn(`User not found: ${req.user.username}`);
        return res.status(401).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // SUPERADMIN bypasses all role checks
      if (user.role === ADMIN_ROLES.SUPERADMIN) {
        req.user = user;
        return next();
      }

      // Check if user has required role
      if (roles.length && !roles.includes(user.role)) {
        logger.warn(`User ${user.username} attempted unauthorized access to ${req.originalUrl}`);
        return res.status(403).json({ 
          success: false,
          error: 'Forbidden - Insufficient permissions' 
        });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  };
};

// Convenience middleware for admin-only routes
export const admin = authorize([ADMIN_ROLES.SUPERADMIN]);

// Middleware to check if user is logged in (without failing)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = decoded;
    } catch (error) {
      // Silently fail - user is not authenticated
    }
  }
  next();
};