import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { rateLimit } from 'express-rate-limit';
import { CONSTANTS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  skip: (req) => process.env.NODE_ENV === 'test'
});

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const generateJWT = (payload) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }
  
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: CONSTANTS.TOKEN_EXPIRY.session,
    issuer: CONSTANTS.JWT_CONFIG.issuer,
    audience: CONSTANTS.JWT_CONFIG.audience
  });
};

export const verifyJWT = (token) => {
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

export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BASE_URL}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: 'Email Verification',
    html: `<p>Verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    logger.error('Email sending failed:', err);
    throw new Error('Failed to send verification email');
  }
};