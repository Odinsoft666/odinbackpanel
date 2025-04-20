const { authenticate } = require('./authMiddleware'); // Import from authMiddleware
const { authorize } = require('./auth'); // Import from auth
const { 
  apiLimiter, 
  loginLimiter, 
  loginSlowDown 
} = require('./rateLimit');
const { 
  validate, 
  validateRequest,
  validateBody,
  validateQuery,
  validateParams 
} = require('./validation');
const errorHandler = require('./errorHandler');

module.exports = {
  authenticate, // Now correctly exported
  authorize,
  apiLimiter,
  loginLimiter,
  loginSlowDown,
  validate,
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
  errorHandler
};