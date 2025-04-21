import mongoose from 'mongoose';

const GameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['slot', 'table', 'live', 'virtual', 'other']
  },
  provider: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  thumbnail: String,
  minBet: {
    type: Number,
    default: 0.10
  },
  maxBet: {
    type: Number,
    default: 1000
  },
  rtp: {
    type: Number,
    min: 85,
    max: 99.99
  },
  volatility: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  features: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

// Update the updatedAt field on save
GameSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get games by category
GameSchema.statics.getByCategory = async function(category) {
  return await this.find({ category });
};

export default mongoose.model('Game', GameSchema);