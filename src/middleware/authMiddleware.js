import jwt from 'jsonwebtoken';
import { userDBService } from '../database.js';
import { logger } from '../utils/logger.js';
import { ADMIN_ROLES } from '../config/constants.js';

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get fresh user data from DB
      const { user } = await userDBService.authenticate(req.user.username, '', true);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // SUPERADMIN has all access
      if (user.role === ADMIN_ROLES.SUPERADMIN) {
        req.user = user;
        return next();
      }

      // Check if user has one of the required roles
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};