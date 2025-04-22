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
    sparse: true  // Removed unique:true from here
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Single index definition for code (removed from schema field)
bonusSchema.index({ code: 1 }, { unique: true, sparse: true });

// Index for active bonuses
bonusSchema.index({ isActive: 1, validUntil: 1 });

// Pre-save hook to generate code if not provided
bonusSchema.pre('save', function(next) {
  if (!this.code && this.bonusType === 'promotional') {
    this.code = `PROMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

const Bonus = mongoose.model('Bonus', bonusSchema);

export { Bonus };