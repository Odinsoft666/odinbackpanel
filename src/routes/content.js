import express from 'express';
import { protect, authorize } from '../middleware/routeProtection.js';
import {
  getContent,
  updateContent,
  createContent,
  getContentBySlug
} from '../controllers/contentController.js';

const router = express.Router();

// Public route to get content by slug
router.get('/:slug', getContentBySlug);

// Apply protect middleware to all other routes
router.use(protect);

// Content management routes
router.route('/')
  .get(getContent)
  .post(authorize(['admin', 'content_manager']), createContent);

router.route('/:id')
  .put(authorize(['admin', 'content_manager']), updateContent);

export default router;