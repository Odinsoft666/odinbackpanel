// src/models/AdminLog.js
import mongoose from 'mongoose';

const AdminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'DASHBOARD_ACCESS',
      'PLAYERS_LIST_ACCESS',
      'OPERATORS_LIST_ACCESS',
      'OPERATOR_CREATED',
      'OPERATOR_UPDATED',
      'OPERATOR_DELETED',
      'OPERATOR_STATUS_CHANGED',
      'PASSWORD_RESET',
      'PERMISSIONS_UPDATED'
    ]
  },
  details: {
    type: Object,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add indexes for better performance
AdminLogSchema.index({ adminId: 1 });
AdminLogSchema.index({ action: 1 });
AdminLogSchema.index({ timestamp: -1 });

// Virtual for admin details
AdminLogSchema.virtual('admin', {
  ref: 'User',
  localField: 'adminId',
  foreignField: '_id',
  justOne: true
});

const AdminLog = mongoose.model('AdminLog', AdminLogSchema);
export { AdminLog };