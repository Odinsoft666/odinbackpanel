import express from 'express';
import { userDBService } from '../database.js';
import { logger } from '../utils/logger.js';
import { protect, authorize } from '../middleware/routeProtection.js';
import adminController from '../controllers/adminController.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', authorize(['admin']), adminController.getDashboardStats);
router.get('/players', authorize(['admin']), adminController.getPlayers);
router.get('/operators', authorize(['admin']), adminController.getOperators);
router.post('/operators', authorize(['admin']), adminController.createOperator);

// Admin dashboard route
router.get('/dashboard', protect, authorize(['SUPERADMIN']), async (req, res) => {
  try {
    const stats = await userDBService.getAdminStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin user management routes
router.get('/users', protect, authorize(['SUPERADMIN']), async (req, res) => {
  try {
    const users = await userDBService.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;