import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  type: { 
    type: String,
    enum: ['incident', 'maintenance', 'status_change', 'announcement'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedEntity: { type: mongoose.Schema.Types.ObjectId },
  read: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed
}, { 
  timestamps: true,
  index: { userId: 1, read: 1 } 
});

const Notification = mongoose.model('Notification', NotificationSchema);
export { Notification }; 