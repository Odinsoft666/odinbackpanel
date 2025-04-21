import express from 'express';
import { protect, authorize } from '../middleware/routeProtection.js';
import { getBonuses, createBonus } from '../controllers/bonusController.js';

const router = express.Router();

router.route('/')
  .get(protect, authorize(['admin', 'bonus_manager']), getBonuses)
  .post(protect, authorize(['admin']), createBonus);

export default router;