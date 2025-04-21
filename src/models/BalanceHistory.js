// src/models/BalanceHistory.js
import mongoose from 'mongoose';

const BalanceHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  balanceType: {
    type: String,
    required: true
  },
  oldAmount: {
    type: Number,
    required: true
  },
  newAmount: {
    type: Number,
    required: true
  },
  operation: {
    type: String,
    required: true,
    enum: ['add', 'subtract', 'set']
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminNote: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const BalanceHistory = mongoose.model('BalanceHistory', BalanceHistorySchema);