import Joi from 'joi';
import { passwordPolicy } from '../config/constants.js';
import { UserStatus, KYCStatus } from '../models/User.js';

// Custom Joi extensions
Joi.objectId = () => Joi.string().hex().length(24).message('Invalid ID format');

Joi.password = () => Joi.string()
  .min(passwordPolicy.minLength)
  .pattern(passwordPolicy.pattern)
  .message(passwordPolicy.message);

// Enhanced validation messages
const defaultMessages = {
  'string.empty': '{#label} is required',
  'any.required': '{#label} is required',
  'string.min': '{#label} must be at least {#limit} characters',
  'string.max': '{#label} cannot exceed {#limit} characters',
  'string.email': 'Please provide a valid email',
  'any.only': 'Passwords do not match'
};

// Schema definitions
export const schemas = {
  login: Joi.object({
    username: Joi.string().required().label('Username'),
    password: Joi.string().required().label('Password')
  }).options({ messages: defaultMessages }),

  register: Joi.object({
    username: Joi.string()
      .min(4)
      .max(25)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .required()
      .label('Username'),
    email: Joi.string()
      .email()
      .required()
      .label('Email'),
    password: Joi.password().required().label('Password'),
    confirmPassword: Joi.any()
      .valid(Joi.ref('password'))
      .required()
      .label('Confirm Password'),
    status: Joi.string()
      .valid(...UserStatus)
      .default('ACTIVE'),
    kycStatus: Joi.string()
      .valid(...KYCStatus)
      .default('NOT_VERIFIED')
  }).options({ messages: defaultMessages, abortEarly: false }),

  updateUser: Joi.object({
    username: Joi.string()
      .min(4)
      .max(25)
      .pattern(/^[a-zA-Z0-9_]+$/),
    email: Joi.string().email(),
    status: Joi.string().valid(...UserStatus),
    kycStatus: Joi.string().valid(...KYCStatus)
  }).options({ messages: defaultMessages, abortEarly: false })
};

// Enhanced validation function
export function validate(data, schemaName, options = {}) {
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Schema ${schemaName} not found`);

  const { error, value } = schema.validate(data, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    ...options
  });

  if (error) {
    const errors = error.details.reduce((acc, detail) => {
      const key = detail.path.join('.');
      acc[key] = detail.message.replace(/['"]+/g, '');
      return acc;
    }, {});
    return { isValid: false, errors };
  }

  return { isValid: true, value };
}

// Enhanced middleware with error types
export function validateRequest(schemaName, source = 'body') {
  return (req, res, next) => {
    const { isValid, errors, value } = validate(req[source], schemaName);
    
    if (!isValid) {
      return res.status(422).json({
        error: 'Validation Failed',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }
    
    req.validated = value;
    next();
  };
}

export const validateBody = (schemaName) => validateRequest(schemaName, 'body');
export const validateQuery = (schemaName) => validateRequest(schemaName, 'query');
export const validateParams = (schemaName) => validateRequest(schemaName, 'params');