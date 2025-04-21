// src/models/Device.js
import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  macAddress: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  os: {
    type: String,
    required: true
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastUsed: Date,
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const Device = mongoose.model('Device', DeviceSchema);