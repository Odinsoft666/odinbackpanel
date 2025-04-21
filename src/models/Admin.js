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
  // Authentication
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
  
  // Role and Permissions
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
  
  // Personal Information
  firstName: String,
  lastName: String,
  phone: String,
  department: String,
  
  // Security
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
  
  // Activity Tracking
  lastActivity: Date,
  activityLog: [{
    action: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Status
  isActive: { type: Boolean, default: true },
  notes: String
}, { timestamps: true });

// Static method for owner creation
AdminSchema.statics.createOwner = async function() {
  const ownerExists = await this.findOne({ isOwner: true });
  if (!ownerExists) {
    await this.create({
      adminName: 'ODIN',
      email: 'owner@odinsite.com',
      password: process.env.OWNER_DEFAULT_PASSWORD || 'ChangeMe123!',
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
      }
    });
    console.log('Owner account created');
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

// Indexes
AdminSchema.index({ adminName: 1 });
AdminSchema.index({ email: 1 });
AdminSchema.index({ role: 1 });
AdminSchema.index({ isActive: 1 });
AdminSchema.index({ lastActivity: -1 });

export default mongoose.model('Admin', AdminSchema);