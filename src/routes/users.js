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

const router = express.Router();


router.use(protect);

router.get('/', authorize(['admin']), getAllPlayers);
router.get('/:id', authorize(['admin']), getPlayerProfile);
router.put('/balances/:id', authorize(['admin']), updatePlayerBalances);
router.get('/balance-history/:id', authorize(['admin']), getBalanceHistory);
router.get('/devices/:id', authorize(['admin']), getPlayerDevices);
router.get('/bets/:id', authorize(['admin']), getPlayerBets);
router.get('/investments/:id', authorize(['admin']), getPlayerInvestments);
router.get('/withdrawals/:id', authorize(['admin']), getPlayerWithdrawals);

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