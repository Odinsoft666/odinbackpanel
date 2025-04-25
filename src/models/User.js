import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { passwordPolicy } from '../config/constants.js';

// Frozen enums for better type safety
const UserStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED', 
  BANNED: 'BANNED',
  SELF_EXCLUDED: 'SELF_EXCLUDED'
});

const KYCStatus = Object.freeze({
  NOT_VERIFIED: 'NOT_VERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
});

const VerificationDocumentType = Object.freeze({
  ID: 'ID',
  PASSPORT: 'PASSPORT',
  DRIVER_LICENSE: 'DRIVER_LICENSE',
  UTILITY_BILL: 'UTILITY_BILL'
});

const UserSchema = new mongoose.Schema({
  // Authentication & Basic Info
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [4, 'Username must be at least 4 characters'],
    maxlength: [25, 'Username cannot exceed 25 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email'
    },
    index: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [passwordPolicy.minLength, `Password must be at least ${passwordPolicy.minLength} characters`],
    select: false
  },

  // Player Status
  status: {
    type: String,
    enum: {
      values: Object.values(UserStatus),
      message: 'Invalid user status'
    },
    default: UserStatus.ACTIVE
  },
  kycStatus: {
    type: String,
    enum: {
      values: Object.values(KYCStatus),
      message: 'Invalid KYC status'
    },
    default: KYCStatus.NOT_VERIFIED
  },

  // Balances with individual validations
  balances: {
    normal: { 
      type: Number, 
      default: 0, 
      min: [0, 'Balance cannot be negative'],
      set: v => parseFloat(v.toFixed(2)) // Ensure 2 decimal places
    },
    bonus: { 
      type: Number, 
      default: 0, 
      min: 0,
      set: v => parseFloat(v.toFixed(2))
    },
    affiliate: { 
      type: Number, 
      default: 0, 
      min: 0,
      set: v => parseFloat(v.toFixed(2))
    },
    wheel: { 
      type: Number, 
      default: 0, 
      min: 0,
      set: v => parseFloat(v.toFixed(2))
    },
    lossBonus: { 
      type: Number, 
      default: 0, 
      min: 0,
      set: v => parseFloat(v.toFixed(2))
    },
    box: { 
      type: Number, 
      default: 0, 
      min: 0,
      set: v => parseFloat(v.toFixed(2))
    },
    lottery: { 
      type: Number, 
      default: 0, 
      min: 0,
      set: v => parseFloat(v.toFixed(2))
    },
    link: { 
      type: Number, 
      default: 0, 
      min: 0,
      set: v => parseFloat(v.toFixed(2))
    }
  },

  // Financial Information
  currency: {
    type: String,
    default: 'USD',
    enum: {
      values: ['USD', 'EUR', 'GBP', 'BTC', 'ETH'],
      message: 'Invalid currency'
    }
  },
  totalDeposits: { 
    type: Number, 
    default: 0, 
    min: 0,
    set: v => parseFloat(v.toFixed(2))
  },
  totalWithdrawals: { 
    type: Number, 
    default: 0, 
    min: 0,
    set: v => parseFloat(v.toFixed(2))
  },
  wageringRequirements: { 
    type: Number, 
    default: 0, 
    min: 0,
    set: v => parseFloat(v.toFixed(2))
  },

  // Player Tracking
  lastLogin: { type: Date },
  lastIp: { type: String },
  loginCount: { type: Number, default: 0 },
  devices: [
    {
      deviceId: { type: String, required: true },
      macAddress: { type: String },
      ipAddress: { type: String, required: true },
      userAgent: { type: String },
      os: { type: String },
      firstSeen: { type: Date, default: Date.now },
      lastUsed: { type: Date, default: Date.now },
      isBlocked: { type: Boolean, default: false }
    }
  ],
  loginHistory: [
    {
      ip: { type: String, required: true },
      device: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Personal Information
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  birthDate: { type: Date },
  country: { type: String },
  city: { type: String },
  address: { type: String },
  postalCode: { type: String },
  phone: { 
    type: String, 
    validate: {
      validator: function(v) {
        return /^\+?[\d\s-]{10,}$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },

  // Verification
  verificationDocuments: [
    {
      type: { 
        type: String, 
        enum: {
          values: Object.values(VerificationDocumentType),
          message: 'Invalid document type'
        },
        required: true 
      },
      frontUrl: { type: String, required: true },
      backUrl: { type: String },
      selfieUrl: { type: String },
      status: { 
        type: String, 
        enum: {
          values: ['PENDING', 'APPROVED', 'REJECTED'],
          message: 'Invalid document status'
        },
        default: 'PENDING'
      },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      reviewedAt: { type: Date },
      rejectionReason: { type: String },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],

  // Referral System
  referralCode: { 
    type: String, 
    unique: true, 
    sparse: true,
    uppercase: true,
    match: [/^[A-Z0-9]{6,12}$/, 'Referral code must be 6-12 alphanumeric characters']
  },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },
  referralEarnings: { 
    type: Number, 
    default: 0,
    set: v => parseFloat(v.toFixed(2))
  },

  // VIP Program
  vipLevel: { type: Number, default: 0, min: 0, max: 10 },
  vipPoints: { type: Number, default: 0, min: 0 },

  // Security
  twoFactorEnabled: { type: Boolean, default: false },
  securityQuestions: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true, select: false }
    }
  ],
  failedLoginAttempts: { type: Number, default: 0 },
  accountLockedUntil: { type: Date },

  // Metadata
  registeredIp: { type: String },
  registrationSource: { type: String },
  lastActive: { type: Date },
  notes: [
    {
      content: { type: String, required: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      createdAt: { type: Date, default: Date.now }
    }
  ],

  // Admin tracking
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  modificationHistory: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.securityQuestions;
      delete ret.__v;
      delete ret.failedLoginAttempts;
      delete ret.accountLockedUntil;
      return ret;
    }
  },
  toObject: { virtuals: true },
  strict: 'throw',
  validateBeforeSave: true,
  optimisticConcurrency: true
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(passwordPolicy.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(new Error('Password hashing failed'));
  }
});

// Track modifications for admin changes
UserSchema.pre('save', function(next) {
  if (this.isModified() && this.$locals.adminUser) {
    const modifiedPaths = this.modifiedPaths();
    
    modifiedPaths.forEach(path => {
      if (path === 'modificationHistory' || path === 'lastModifiedBy') return;
      
      this.modificationHistory.push({
        field: path,
        oldValue: this.get(path, null, { getters: false }),
        newValue: this[path],
        changedBy: this.$locals.adminUser
      });
    });

    this.lastModifiedBy = this.$locals.adminUser;
  }
  next();
});

// Password comparison with timing safety
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Balance adjustment methods
UserSchema.methods.adjustBalance = function(balanceType, amount, adminId = null) {
  if (!this.balances.hasOwnProperty(balanceType)) {
    throw new Error(`Invalid balance type: ${balanceType}`);
  }

  const newBalance = this.balances[balanceType] + amount;
  if (newBalance < 0) {
    throw new Error(`Insufficient ${balanceType} balance`);
  }

  if (adminId) {
    this.$locals = { adminUser: adminId };
  }

  this.balances[balanceType] = newBalance;
  return this.save();
};

// Virtuals
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

UserSchema.virtual('totalBalance').get(function() {
  return parseFloat(Object.values(this.balances).reduce((sum, balance) => sum + balance, 0).toFixed(2));
});

UserSchema.virtual('availableBalance').get(function() {
  return parseFloat((this.balances.normal + this.balances.bonus).toFixed(2));
});

// Static methods
UserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

UserSchema.statics.findByUsername = function(username) {
  return this.findOne({ username }).select('+password');
};

UserSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code.toUpperCase() });
};

// Admin-specific static methods
UserSchema.statics.adminFindById = function(id) {
  return this.findById(id).select('+securityQuestions +failedLoginAttempts +accountLockedUntil');
};

UserSchema.statics.adminUpdate = async function(userId, updateData, adminId) {
  const user = await this.findById(userId);
  if (!user) throw new Error('User not found');

  // Special handling for balance updates
  if (updateData.balances) {
    for (const [key, value] of Object.entries(updateData.balances)) {
      if (user.balances[key] !== undefined) {
        user.balances[key] = value;
      }
    }
    delete updateData.balances;
  }

  // Set admin tracking
  user.$locals = { adminUser: adminId };

  // Update other fields
  Object.assign(user, updateData);
  return user.save();
};

UserSchema.statics.adminSearch = function(query, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.aggregate([
    {
      $match: {
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { 'firstName': { $regex: query, $options: 'i' } },
          { 'lastName': { $regex: query, $options: 'i' } },
          { 'phone': { $regex: query, $options: 'i' } }
        ]
      }
    },
    {
      $facet: {
        users: [
          { $skip: skip },
          { $limit: limit },
          { $project: { 
            username: 1,
            email: 1,
            status: 1,
            kycStatus: 1,
            'balances.normal': 1,
            'balances.bonus': 1,
            totalBalance: { $sum: '$balances' },
            lastLogin: 1,
            createdAt: 1
          }}
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    }
  ]);
};

// Indexes
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ kycStatus: 1 });
UserSchema.index({ referredBy: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastActive: -1 });
UserSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'devices.deviceId': 1 });
UserSchema.index({ 'devices.ipAddress': 1 });

const User = mongoose.model('User', UserSchema);

export { User, UserStatus, KYCStatus, VerificationDocumentType };