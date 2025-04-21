// src/routes/users.js
import express from 'express';
import {
  getPlayerProfile,
  updatePlayerBalances,
  getBalanceHistory,
  getPlayerDevices,
  getPlayerBets,
  getPlayerInvestments,
  getPlayerWithdrawals,
  getAllPlayers
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin access required for all routes
router.use(protect);
router.use(admin);

// Get all players (basic info)
router.get('/', getAllPlayers);

// Player profile routes
router.route('/:id')
  .get(getPlayerProfile);

// Balance operations
router.route('/:id/balances')
  .put(updatePlayerBalances);

// History and activity
router.get('/:id/balance-history', getBalanceHistory);
router.get('/:id/devices', getPlayerDevices);
router.get('/:id/bets', getPlayerBets);
router.get('/:id/investments', getPlayerInvestments);
router.get('/:id/withdrawals', getPlayerWithdrawals);

export default router;