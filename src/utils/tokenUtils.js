import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { CONSTANTS } from '../config/constants.js';
import { logger } from './logger.js';

export const generateAccessToken = (payload) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }
  
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: CONSTANTS.TOKEN_EXPIRY.access,
    issuer: CONSTANTS.JWT_CONFIG.issuer,
    audience: CONSTANTS.JWT_CONFIG.audience
  });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer: CONSTANTS.JWT_CONFIG.issuer,
      audience: CONSTANTS.JWT_CONFIG.audience
    });
  } catch (err) {
    logger.error('JWT verification failed:', err);
    throw new Error('Invalid or expired token');
  }
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: CONSTANTS.TOKEN_EXPIRY.refresh
  });
};

export const generateTOTPSecret = () => {
  return speakeasy.generateSecret({
    length: 32,
    name: process.env.APP_NAME,
    issuer: CONSTANTS.JWT_CONFIG.issuer
  });
};

export const verifyTOTP = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
};