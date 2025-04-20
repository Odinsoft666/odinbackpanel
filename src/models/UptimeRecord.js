import mongoose from 'mongoose';

const UptimeRecordSchema = new mongoose.Schema({
  service: { 
    type: String, 
    required: true,
    enum: ['api', 'database', 'payment', 'auth']
  },
  date: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  uptimePercentage: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100
  },
  downtimeMinutes: { 
    type: Number, 
    default: 0
  },
  incidents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  }],
  maintenanceEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance'
  }]
}, { 
  timestamps: true,
  index: { service: 1, date: 1 } 
});

UptimeRecordSchema.index({ service: 1, date: 1 }, { unique: true });

export const UptimeRecord = mongoose.model('UptimeRecord', UptimeRecordSchema);