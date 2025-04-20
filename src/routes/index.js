import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import { authLimiter, sensitiveLimiter } from '../services/auth.js';

const router = Router();

// Apply rate limiting
router.use(authLimiter);
router.use('/auth', sensitiveLimiter, authRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
router.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

export default router;