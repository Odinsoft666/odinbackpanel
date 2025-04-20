import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email
 * @param {Object} mailOptions - Email options
 * @param {string} mailOptions.to - Recipient email
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.text - Plain text body
 * @param {string} mailOptions.html - HTML body
 */
export const sendEmail = async (mailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'System'}" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com'}>`,
      ...mailOptions
    });
    logger.info(`Email sent to ${mailOptions.to}`);
    return info;
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
};

// Verify email connection on startup
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    logger.info('✅ Email server connection verified');
  } catch (error) {
    logger.error('❌ Email server connection failed:', error);
    throw error;
  }
};