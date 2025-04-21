import express from 'express';
import { Notification } from '../models/Notification.js';
import { verifyToken, authorize } from '../middleware/authMiddleware.js'; // Changed authenticate to verifyToken
import { validate } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import User from '../models/User.js';

const router = express.Router();

// Get user notifications
router.get('/', verifyToken, async (req, res) => {  // Changed authenticate to verifyToken
  try {
    const notifications = await Notification.find({ 
      userId: req.user._id 
    }).sort({ createdAt: -1 }).limit(50);
    
    res.json(notifications);
  } catch (error) {
    logger.error('Failed to fetch notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {  // Changed authenticate to verifyToken
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Update notification preferences
router.put('/preferences', verifyToken, validate, async (req, res) => {  // Changed authenticate to verifyToken
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { notificationPreferences: req.body } },
      { new: true }
    );
    
    res.json(user.notificationPreferences);
  } catch (error) {
    logger.error('Failed to update notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;