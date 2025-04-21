import mongoose from 'mongoose';

const BonusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['registration', 'deposit', 'cashback', 'free_spins'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  wageringRequirement: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: Date,
  validTo: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Bonus', BonusSchema);