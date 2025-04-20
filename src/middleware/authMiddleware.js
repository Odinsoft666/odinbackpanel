// authMiddleware.js (updated)
import jwt from 'jsonwebtoken';
import { databaseService as db } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.sendStatus(401);
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    
    next();
  };
};

export const verifyToken = (roles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.sendStatus(401);
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get fresh database connection
      const database = await db.getDB();
      const user = await database.collection('users').findOne({
        _id: decoded.userId,
        isActive: true
      });

      if (!user || (roles.length && !roles.includes(user.role))) {
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      res.sendStatus(401);
    }
  };
};

// Add this alias for better readability
export const authenticate = verifyToken();