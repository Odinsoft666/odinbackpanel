// src/models/AdminLog.js
import mongoose from 'mongoose';

const AdminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: Object,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Change from default export to named export
const AdminLog = mongoose.model('AdminLog', AdminLogSchema);
export { AdminLog };  // Changed this line