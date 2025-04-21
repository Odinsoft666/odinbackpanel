// src/middleware/index.js
import { protect, authorize, admin, optionalAuth } from './routeProtection.js';
import { 
  generateAccessToken, 
  verifyAccessToken,
  generateRefreshToken 
} from '../utils/tokenUtils.js';
import { 
  apiLimiter, 
  loginLimiter, 
  loginSlowDown 
} from './rateLimit.js';
import { 
  validate, 
  validateRequest,
  validateBody,
  validateQuery,
  validateParams 
} from './validation.js';
import errorHandler from './errorHandler.js';

export {
  // Route Protection
  protect,          // previously called 'authenticate'
  authorize,
  admin,
  optionalAuth,
  
  // Token Utilities
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  
  // Rate Limiting
  apiLimiter,
  loginLimiter,
  loginSlowDown,
  
  // Validation
  validate,
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  
  // Error Handling
  errorHandler
};