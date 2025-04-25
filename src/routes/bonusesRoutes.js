import express from 'express';
import { protect, authorize } from '../middleware/routeProtection.js';
import {
  getBonuses,
  createBonus,
  updateBonus,
  toggleBonusStatus,
  deleteBonus
} from '../controllers/bonusController.js';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// Get all bonuses or create new bonus
router.route('/')
  .get(authorize(['admin', 'bonus_manager']), getBonuses)
  .post(authorize(['admin']), createBonus);

// Bonus operations by ID
router.route('/:id')
  .put(authorize(['admin']), updateBonus)
  .delete(authorize(['admin']), deleteBonus);

// Toggle bonus status
router.put('/:id/status', authorize(['admin']), toggleBonusStatus);

export default router;