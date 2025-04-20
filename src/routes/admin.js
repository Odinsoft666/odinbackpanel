import express from 'express';
import UserDatabaseService from '../database.js';
import { logger } from '../utils/logger.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Admin dashboard route
router.get('/dashboard', verifyToken, isAdmin, async (req, res) => {
  try {
    const stats = await UserDatabaseService.getAdminStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin user management routes
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await UserDatabaseService.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Add more admin routes as needed...

export default router;