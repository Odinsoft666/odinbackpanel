import express from 'express';
import { protect, authorize } from '../middleware/routeProtection.js';
import { getAffiliates, createAffiliate } from '../controllers/affiliateController.js';

const router = express.Router();

router.route('/')
  .get(protect, authorize(['admin', 'affiliate_manager']), getAffiliates)
  .post(protect, authorize(['admin']), createAffiliate);

export default router;