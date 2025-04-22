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
import { protect, authorize } from '../middleware/routeProtection.js';

const router = express.Router();

// Admin access required for all routes
router.use(protect);
router.use(authorize(['admin']));

// Get all players (basic info)
router.get('/', getAllPlayers);

// Player profile routes
router.route('/:id')
  .get(getPlayerProfile);

// Balance operations
router.put('/balances/:id', updatePlayerBalances);

// History and activity
router.get('/balance-history/:id', getBalanceHistory);
router.get('/devices/:id', getPlayerDevices);
router.get('/bets/:id', getPlayerBets);
router.get('/investments/:id', getPlayerInvestments);
router.get('/withdrawals/:id', getPlayerWithdrawals);

export default router;