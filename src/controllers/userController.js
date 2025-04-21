// src/controllers/userController.js
import User from '../models/User.js';
import BalanceHistory from '../models/BalanceHistory.js';
import AdminLog from '../models/AdminLog.js'; // Import statement for AdminLog
import Device from '../models/Device.js';
import Bet from '../models/Bet.js';
import Investment from '../models/Investment.js';
import Withdrawal from '../models/Withdrawal.js';

// @desc    Get complete player profile with all balances
// @route   GET /api/users/:id
// @access  Private/Admin
export const getPlayerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('devices')
      .populate('balanceHistory')
      .populate('bets')
      .populate('investments')
      .populate('withdrawals');

    if (!user) {
      return res.status(404).json({ message: 'Player not found' });
    }

    res.json({
      ...user.toObject(),
      balances: {
        normal: user.normalBalance,
        bonus: user.bonusBalance,
        affiliate: user.affiliateBalance,
        wheel: user.wheelBalance,
        lossBonus: user.lossBonusBalance,
        box: user.boxBalance,
        lottery: user.lotteryBalance,
        link: user.linkBalance
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update player balances
// @route   PUT /api/users/balances/:id
// @access  Private/Admin
export const updatePlayerBalances = async (req, res) => {
  const { balanceType, amount, operation, adminNote } = req.body;
  
  const validBalanceTypes = [
    'normal', 'bonus', 'affiliate', 'wheel', 
    'lossBonus', 'box', 'lottery', 'link'
  ];
  
  if (!validBalanceTypes.includes(balanceType)) {
    return res.status(400).json({ message: 'Invalid balance type' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Player not found' });
    }

    const balanceField = `${balanceType}Balance`;
    const oldAmount = user[balanceField];

    // Perform the operation
    if (operation === 'add') {
      user[balanceField] += amount;
    } else if (operation === 'subtract') {
      user[balanceField] -= amount;
    } else if (operation === 'set') {
      user[balanceField] = amount;
    } else {
      return res.status(400).json({ message: 'Invalid operation' });
    }

    // Create balance history record
    const balanceHistory = new BalanceHistory({
      userId: user._id,
      balanceType,
      oldAmount,
      newAmount: user[balanceField],
      operation,
      adminId: req.admin.id,
      adminNote,
      timestamp: new Date()
    });

    // Create admin log
    const adminLog = new AdminLog({
      adminId: req.admin.id,
      action: `Updated ${balanceType} balance for user ${user._id}`,
      details: {
        operation,
        amount,
        oldBalance: oldAmount,
        newBalance: user[balanceField]
      },
      timestamp: new Date()
    });

    await Promise.all([
      user.save(),
      balanceHistory.save(),
      adminLog.save()
    ]);

    res.json({
      message: 'Balance updated successfully',
      newBalance: user[balanceField]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get player balance movements
// @route   GET /api/users/balance-history/:id
// @access  Private/Admin
export const getBalanceHistory = async (req, res) => {
  try {
    const history = await BalanceHistory.find({ userId: req.params.id })
      .sort({ timestamp: -1 })
      .populate('adminId', 'username');

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get player devices
// @route   GET /api/users/devices/:id
// @access  Private/Admin
export const getPlayerDevices = async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.params.id });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get player bets
// @route   GET /api/users/bets/:id
// @access  Private/Admin
export const getPlayerBets = async (req, res) => {
  try {
    const bets = await Bet.find({ userId: req.params.id })
      .sort({ createdAt: -1 });
    res.json(bets);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get player investments
// @route   GET /api/users/investments/:id
// @access  Private/Admin
export const getPlayerInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.params.id })
      .sort({ date: -1 });
    res.json(investments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get player withdrawals
// @route   GET /api/users/withdrawals/:id
// @access  Private/Admin
export const getPlayerWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.params.id })
      .sort({ date: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all players with basic info
// @route   GET /api/users
// @access  Private/Admin
export const getAllPlayers = async (req, res) => {
  try {
    const users = await User.find({ role: 'player' })
      .select('username email createdAt lastLogin normalBalance bonusBalance');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};