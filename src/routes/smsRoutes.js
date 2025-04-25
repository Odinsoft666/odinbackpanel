import express from 'express';
import { protect } from '../middleware/routeProtection.js';

const router = express.Router();

// Basic SMS routes
router.post('/send', protect, (req, res) => {
  res.json({ message: 'SMS sent' });
});

router.get('/history', protect, (req, res) => {
  res.json({ message: 'SMS history' });
});

export default router;