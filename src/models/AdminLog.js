// src/models/AdminLog.js
import mongoose from 'mongoose';

// Define the schema for the AdminLog model
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
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create the model
const AdminLog = mongoose.model('AdminLog', AdminLogSchema);

// Export the model
export default AdminLog;