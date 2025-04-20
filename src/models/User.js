import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserStatus = ['ACTIVE', 'SUSPENDED', 'BANNED', 'SELF_EXCLUDED'];
const KYCStatus = ['NOT_VERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'];

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Unique index defined here (removed duplicate)
    minlength: 4,
    maxlength: 25,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  email: {
    type: String,
    required: true,
    unique: true, // Unique index defined here (removed duplicate)
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'BTC']
  },
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
  lastLogin: Date,
  lastIp: String,
  devices: [{
    deviceId: String,
    lastUsed: Date
  }],
  birthDate: Date,
  country: String,
  phone: String,
  verificationDocuments: [{
    type: { type: String },
    url: String,
    status: String,
    uploadedAt: Date
  }],
  bonusPoints: {
    type: Number,
    default: 0
  },
  referralCode: String,
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  firstName: String, // Added missing fields used in virtual
  lastName: String  // Added missing fields used in virtual
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

// Indexes (only non-duplicate indexes remain)
UserSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
UserSchema.index({ status: 1 });
UserSchema.index({ kycStatus: 1 });
UserSchema.index({ createdAt: 1 }); // Useful for queries sorting by creation date
UserSchema.index({ updatedAt: 1 }); // Useful for queries sorting by update date

const User = mongoose.model('User', UserSchema);
export default User;