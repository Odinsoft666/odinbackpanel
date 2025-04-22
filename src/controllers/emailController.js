import { logger } from '../utils/logger.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from 'express-async-handler';
import nodemailer from 'nodemailer';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { SentEmail } from '../models/SentEmail.js';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
});

// @desc    Send email
// @route   POST /api/email/send
// @access  Private/Admin
export const sendEmail = asyncHandler(async (req, res, next) => {
  const { to, subject, text, html, templateId, variables } = req.body;

  // Validate required fields
  if (!to || !subject || (!text && !html && !templateId)) {
    return next(new ErrorResponse('Missing required fields', 400));
  }

  try {
    let mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to,
      subject,
      text,
      html
    };

    // Use template if specified
    if (templateId) {
      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        return next(new ErrorResponse('Email template not found', 404));
      }

      // Replace variables in template
      let compiledHtml = template.html;
      let compiledSubject = template.subject;
      
      if (variables) {
        Object.keys(variables).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          compiledHtml = compiledHtml.replace(regex, variables[key]);
          compiledSubject = compiledSubject.replace(regex, variables[key]);
        });
      }

      mailOptions.html = compiledHtml;
      mailOptions.subject = compiledSubject;
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log sent email
    const sentEmail = await SentEmail.create({
      messageId: info.messageId,
      from: mailOptions.from,
      to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
      subject: mailOptions.subject,
      templateId: templateId || null,
      status: 'sent',
      userId: req.user.id
    });

    logger.info(`Email sent to ${to} by ${req.user.username}`, { 
      messageId: info.messageId,
      subject 
    });

    res.status(200).json({
      success: true,
      data: {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      }
    });
  } catch (error) {
    logger.error('Email send failed:', error);
    
    // Log failed attempt
    await SentEmail.create({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      templateId: templateId || null,
      status: 'failed',
      error: error.message,
      userId: req.user.id
    });

    return next(new ErrorResponse('Failed to send email', 500));
  }
});

// @desc    Get email templates
// @route   GET /api/email/templates
// @access  Private/Admin
export const getEmailTemplates = asyncHandler(async (req, res, next) => {
  const { type } = req.query;
  
  const filter = {};
  if (type) filter.type = type;
  
  const templates = await EmailTemplate.find(filter).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: templates.length,
    data: templates
  });
});

// @desc    Create email template
// @route   POST /api/email/templates
// @access  Private/Admin
export const createEmailTemplate = asyncHandler(async (req, res, next) => {
  const { name, subject, html, type } = req.body;

  if (!name || !subject || !html || !type) {
    return next(new ErrorResponse('Missing required fields', 400));
  }

  const template = await EmailTemplate.create({
    name,
    subject,
    html,
    type,
    createdBy: req.user.id
  });

  logger.info(`Email template created by ${req.user.username}`, { 
    templateId: template._id 
  });

  res.status(201).json({
    success: true,
    data: template
  });
});

// @desc    Get sent emails
// @route   GET /api/email/sent
// @access  Private/Admin
export const getSentEmails = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (status) filter.status = status;
  
  const [emails, total] = await Promise.all([
    SentEmail.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'username')
      .populate('templateId', 'name'),
    SentEmail.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: emails,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    }
  });
});