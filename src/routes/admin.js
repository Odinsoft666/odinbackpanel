import express from 'express';
import { userDBService } from '../database.js';
import { logger } from '../utils/logger.js';
import { verifyToken, authorize } from '../middleware/routeProtection.js';



const router = express.Router();

// Admin dashboard route
router.get('/dashboard', verifyToken, authorize(['SUPERADMIN']), async (req, res) => {
  try {
    const stats = await userDBService.getAdminStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin user management routes
router.get('/users', verifyToken, authorize(['SUPERADMIN']), async (req, res) => {
  try {
    const users = await userDBService.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;