import Joi from 'joi';
import { PASSWORD_POLICY } from '../config/constants.js';

// Custom Joi extensions
Joi.objectId = () => Joi.string().hex().length(24).message('Invalid ID format');
Joi.password = () => Joi.string()
  .min(PASSWORD_POLICY.minLength)  // Fixed reference
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
  .message('Password must contain uppercase, lowercase, number, and special character');

// Define all schemas
export const schemas = {
  login: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.password().required()
  }),
  register: Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.password().required(),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required()
  })
};

// Validation function
export function validate(data, schemaName) {
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Schema ${schemaName} not found`);
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errors = error.details.reduce((acc, detail) => {
      acc[detail.path[0]] = detail.message.replace(/['"]+/g, '');
      return acc;
    }, {});
    return { isValid: false, errors };
  }

  return { isValid: true, value };
}

// Middleware generator
export function validateRequest(schemaName, source = 'body') {
  return (req, res, next) => {
    const { isValid, errors, value } = validate(req[source], schemaName);
    if (!isValid) return res.status(400).json({ errors });
    req.validated = value;
    next();
  };
}

// Named exports
export const validateBody = (schemaName) => validateRequest(schemaName, 'body');
export const validateQuery = (schemaName) => validateRequest(schemaName, 'query');
export const validateParams = (schemaName) => validateRequest(schemaName, 'params');