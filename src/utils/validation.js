// utils/validation.js
const Joi = require('joi');
const CONSTANTS = require('../constants');

// Custom Joi extensions
Joi.objectId = () => Joi.string().hex().length(24).message('Invalid ID format');
Joi.password = () => Joi.string()
  .min(CONSTANTS.PASSWORD_POLICY.minLength)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])'))
  .message('Password must contain at least one uppercase, one lowercase, one number, and one special character');

// Validation schemas
const schemas = {
  // Authentication
  login: Joi.object({
    username: Joi.string().min(3).max(30).required()
      .messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username cannot exceed 30 characters'
      }),
    password: Joi.password().required()
      .messages({
        'string.empty': 'Password is required'
      })
  }),

  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please enter a valid email address'
      }),
    password: Joi.password().required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Passwords must match'
      })
  }),

  resetRequest: Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Please enter a valid email address'
      })
  }),

  resetConfirm: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.password().required(),
    confirmPassword: Joi.any().valid(Joi.ref('newPassword')).required()
      .messages({
        'any.only': 'Passwords must match'
      })
  }),

  // User Management
  createUser: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.password().required(),
    role: Joi.string().valid(...Object.values(CONSTANTS.ROLES)).required()
  }),

  updateUser: Joi.object({
    username: Joi.string().min(3).max(30),
    email: Joi.string().email(),
    role: Joi.string().valid(...Object.values(CONSTANTS.ROLES))
  }).min(1),

  // Player Management
  playerCreate: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    balance: Joi.number().min(0).precision(2).default(0),
    status: Joi.string().valid('active', 'inactive', 'suspended').default('active')
  }),

  playerUpdate: Joi.object({
    balance: Joi.number().min(0).precision(2),
    status: Joi.string().valid('active', 'inactive', 'suspended')
  }).min(1),

  // Transactions
  transaction: Joi.object({
    playerId: Joi.objectId().required(),
    amount: Joi.number().positive().precision(2).required(),
    type: Joi.string().valid('deposit', 'withdrawal', 'bonus', 'adjustment').required(),
    description: Joi.string().max(255).required()
  }),

  // Query Params
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().pattern(/^[a-zA-Z0-9_]+:(asc|desc)$/),
    search: Joi.string().min(2)
  })
};

/**
 * Validate input data against a schema
 * @param {object} data - Input data to validate
 * @param {string} schemaName - Name of the schema to use
 * @param {object} options - Joi validation options
 * @returns {object} - Validation result
 */
function validate(data, schemaName, options = {}) {
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Validation schema '${schemaName}' not found`);
  }

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    ...options
  });

  if (error) {
    const errors = error.details.reduce((acc, detail) => {
      const key = detail.path.join('.');
      acc[key] = detail.message.replace(/['"]+/g, '');
      return acc;
    }, {});

    return {
      isValid: false,
      errors,
      value: null
    };
  }

  return {
    isValid: true,
    errors: null,
    value
  };
}

/**
 * Express middleware for request validation
 * @param {string} schemaName - Name of the schema to validate against
 * @param {string} [source='body'] - Request property to validate ('body', 'query', or 'params')
 * @returns {function} Express middleware function
 */
function validateRequest(schemaName, source = 'body') {
  return (req, res, next) => {
    const { isValid, errors, value } = validate(req[source], schemaName);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        errors
      });
    }

    req.validated = value;
    next();
  };
}

module.exports = {
  schemas,
  validate,
  validateRequest,
  // Shorthand validators for common use cases
  validateBody: (schemaName) => validateRequest(schemaName, 'body'),
  validateQuery: (schemaName) => validateRequest(schemaName, 'query'),
  validateParams: (schemaName) => validateRequest(schemaName, 'params')
};