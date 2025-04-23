import mongoose from 'mongoose';

const bonusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bonus name is required'],
    trim: true,
    maxlength: [100, 'Bonus name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true
  },
  bonusType: {
    type: String,
    required: [true, 'Bonus type is required'],
    enum: {
      values: ['deposit', 'signup', 'loyalty', 'promotional', 'reload'],
      message: 'Invalid bonus type'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Bonus amount is required'],
    min: [0, 'Bonus amount cannot be negative']
  },
  isPercentage: {
    type: Boolean,
    default: false
  },
  minDeposit: {
    type: Number,
    default: 0
  },
  wageringRequirements: {
    type: Number,
    default: 1
  },
  validUntil: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicableGames: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  }],
  maxBonusAmount: {
    type: Number
  },
  code: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true,
    unique: true  // Moved unique index here from schema.index()
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Removed duplicate index definition for code
bonusSchema.index({ isActive: 1, validUntil: 1 });

bonusSchema.pre('save', function(next) {
  if (!this.code && this.bonusType === 'promotional') {
    this.code = `PROMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Add text index for search functionality if needed
bonusSchema.index({ name: 'text', description: 'text' });

// Add virtual for remaining validity days
bonusSchema.virtual('daysRemaining').get(function() {
  return Math.ceil((this.validUntil - Date.now()) / (1000 * 60 * 60 * 24));
});

// Add query helper for active bonuses
bonusSchema.query.active = function() {
  return this.where({ 
    isActive: true,
    validUntil: { $gt: new Date() }
  });
};

export const Bonus = mongoose.model('Bonus', bonusSchema);