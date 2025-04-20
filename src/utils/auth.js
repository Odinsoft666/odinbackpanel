import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { TOKEN_EXPIRY, JWT_CONFIG } from '../constants.js';
import logger from './logger.js';

export const generateJWT = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY.session,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
};

export const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });
  } catch (err) {
    logger.error('JWT verification failed:', err);
    throw err;
  }
};

export const generateTOTPSecret = () => {
  return speakeasy.generateSecret({ length: 20 });
};

export const verifyTOTP = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });
};