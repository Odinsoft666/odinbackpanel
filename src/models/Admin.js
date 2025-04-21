// src/models/Admin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const AdminRoles = [
  'OWNER',
  'SUPERADMIN',
  'FINANCE_ADMIN',
  'RISK_ADMIN', 
  'LIVE_SUPPORT_ADMIN',
  'CALL_ADMIN',
  'MARKETING_ADMIN',
  'ACCOUNTING_ADMIN',
  'TECHNICAL_ADMIN',
  'BONUS_ADMIN',
  'AFFILIATE_ADMIN'
];

const AdminSchema = new mongoose.Schema({
  adminName: {
    type: String,
    required: true,
    unique: true,
    minlength: 4,
    maxlength: 20,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 12,
    select: false
  },
  role: {
    type: String,
    enum: AdminRoles,
    required: true,
    default: 'TECHNICAL_ADMIN'
  },
  permissions: {
    userManagement: { type: Boolean, default: false },
    balanceAdjustments: { type: Boolean, default: false },
    depositApproval: { type: Boolean, default: false },
    withdrawalApproval: { type: Boolean, default: false },
    bonusManagement: { type: Boolean, default: false },
    gameManagement: { type: Boolean, default: false },
    reportAccess: { type: Boolean, default: false },
    systemSettings: { type: Boolean, default: false }
  },
  isOwner: {
    type: Boolean,
    default: false
  },
  firstName: String,
  lastName: String,
  phone: String,
  department: String,
  twoFactorEnabled: { type: Boolean, default: true },
  lastLogin: Date,
  lastIp: String,
  loginHistory: [{
    ip: String,
    device: String,
    timestamp: Date
  }],
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  lastActivity: Date,
  activityLog: [{
    action: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true },
  notes: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static method to create owner account
AdminSchema.statics.createOwner = async function() {
  if (!process.env.OWNER_DEFAULT_PASSWORD) {
    throw new Error('OWNER_DEFAULT_PASSWORD environment variable not set');
  }

  const ownerExists = await this.findOne({ isOwner: true });
  if (!ownerExists) {
    await this.create({
      adminName: 'ODIN',
      email: 'owner@odinsite.com',
      password: process.env.OWNER_DEFAULT_PASSWORD,
      role: 'OWNER',
      isOwner: true,
      firstName: 'System',
      lastName: 'Owner',
      permissions: {
        userManagement: true,
        balanceAdjustments: true,
        depositApproval: true,
        withdrawalApproval: true,
        bonusManagement: true,
        gameManagement: true,
        reportAccess: true,
        systemSettings: true
      },
      twoFactorEnabled: false // Disabled for initial setup
    });
    logger.info('🔑 Owner account created successfully');
  }
};

// Password hashing middleware
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Password comparison method
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
AdminSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Indexes (only for non-unique fields and compound indexes)
AdminSchema.index({ role: 1 });
AdminSchema.index({ isActive: 1 });
AdminSchema.index({ lastActivity: -1 });
AdminSchema.index({ 
  isActive: 1, 
  role: 1 
});
AdminSchema.index({
  'activityLog.action': 1,
  'activityLog.timestamp': -1
});

const Admin = mongoose.model('Admin', AdminSchema);
export { Admin };