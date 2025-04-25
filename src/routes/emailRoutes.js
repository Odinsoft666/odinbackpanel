import express from 'express';
import { protect, authorize } from '../middleware/routeProtection.js';
import {
  sendEmail,
  getEmailTemplates,
  createEmailTemplate,
  getSentEmails
} from '../controllers/emailController.js';

const router = express.Router();

// Protect all routes
router.use(protect);

// Email sending routes
router.post('/send', authorize(['admin']), sendEmail);
router.get('/sent', authorize(['admin']), getSentEmails);

// Template management routes
router.route('/templates')
  .get(authorize(['admin']), getEmailTemplates)
  .post(authorize(['admin']), createEmailTemplate);

export default router;