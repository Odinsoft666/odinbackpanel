import express from 'express';
import { protect, authorize } from '../middleware/routeProtection.js';
import { getContent, updateContent } from '../controllers/contentController.js';

const router = express.Router();

router.route('/')
  .get(protect, getContent);

router.route('/:id')
  .put(protect, authorize(['admin', 'content_manager']), updateContent);

export default router;