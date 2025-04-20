import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import CONSTANTS from '../config/constants.js';
import { logger } from '../utils/logger.js';

// API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMITS.api.windowMs,
  max: CONSTANTS.RATE_LIMITS.api.max,
  handler: (req, res) => {
    logger.warn(`API rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests, please try again later' });
  }
});

// Login Rate Limiter
export const loginLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMITS.login.windowMs,
  max: CONSTANTS.RATE_LIMITS.login.max,
  handler: (req, res) => {
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many login attempts, please try again later' });
  }
});

// Login Slow Down
export const loginSlowDown = slowDown({
  windowMs: CONSTANTS.RATE_LIMITS.login.windowMs,
  delayAfter: 3,
  delayMs: 1000
});