import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserStatus = ['ACTIVE', 'SUSPENDED', 'BANNED', 'SELF_EXCLUDED'];
const KYCStatus = ['NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'];

const UserSchema = new mongoose.Schema({
  // Authentication & Basic Info
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 4,
    maxlength: 25,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  
  // Player Status
  status: {
    type: String,
    enum: UserStatus,
    default: 'ACTIVE'
  },
  kycStatus: {
    type: String,
    enum: KYCStatus,
    default: 'NOT_VERIFIED'
  },
  
  // All Balance Types
  balances: {
    normal: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    affiliate: { type: Number, default: 0, min: 0 },
    wheel: { type: Number, default: 0, min: 0 },
    lossBonus: { type: Number, default: 0, min: 0 },
    box: { type: Number, default: 0, min: 0 },
    lottery: { type: Number, default: 0, min: 0 },
    link: { type: Number, default: 0, min: 0 }
  },
  
  // Financial Information
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'BTC', 'ETH']
  },
  totalDeposits: { type: Number, default: 0 },
  totalWithdrawals: { type: Number, default: 0 },
  wageringRequirements: { type: Number, default: 0 },
  
  // Player Tracking
  lastLogin: Date,
  lastIp: String,
  devices: [{
    deviceId: String,
    macAddress: String,
    ipAddress: String,
    userAgent: String,
    os: String,
    firstSeen: Date,
    lastUsed: Date,
    isBlocked: { type: Boolean, default: false }
  }],
  loginHistory: [{
    ip: String,
    device: String,
    timestamp: Date
  }],
  
  // Personal Information
  firstName: String,
  lastName: String,
  birthDate: Date,
  country: String,
  city: String,
  address: String,
  postalCode: String,
  phone: String,
  
  // Verification
  verificationDocuments: [{
    type: { type: String, enum: ['ID', 'PASSPORT', 'DRIVER_LICENSE', 'UTILITY_BILL'] },
    frontUrl: String,
    backUrl: String,
    selfieUrl: String,
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reviewedAt: Date,
    rejectionReason: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Referral System
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  
  // VIP Program
  vipLevel: { type: Number, default: 0 },
  vipPoints: { type: Number, default: 0 },
  
  // Security
  twoFactorEnabled: { type: Boolean, default: false },
  securityQuestions: [{
    question: String,
    answer: String
  }],
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: Date,
  
  // Metadata
  registeredIp: String,
  registrationSource: String,
  lastActive: Date,
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Virtual for total balance
UserSchema.virtual('totalBalance').get(function() {
  return Object.values(this.balances).reduce((sum, balance) => sum + balance, 0);
});

// Indexes
UserSchema.index({ 'devices.deviceId': 1 });
UserSchema.index({ 'devices.macAddress': 1 });
UserSchema.index({ 'devices.ipAddress': 1 });
UserSchema.index({ referredBy: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastActive: -1 });

export default mongoose.model('User', UserSchema);