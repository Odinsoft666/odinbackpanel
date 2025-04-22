import mongoose from 'mongoose';

const sentEmailSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  from: {
    type: String,
    required: true
  },
  to: [{
    type: String,
    required: true
  }],
  subject: {
    type: String,
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  },
  status: {
    type: String,
    required: true,
    enum: ['sent', 'failed', 'queued'],
    default: 'queued'
  },
  error: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const SentEmail = mongoose.model('SentEmail', sentEmailSchema);

export { SentEmail };