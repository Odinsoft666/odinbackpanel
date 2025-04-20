import mongoose from 'mongoose';
import { monitor } from '../core/errorMonitor.js';

const IncidentSchema = new mongoose.Schema({
  code: { type: String, required: true },
  title: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['investigating', 'identified', 'monitoring', 'resolved', 'scheduled'],
    default: 'investigating'
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    required: true
  },
  components: [{ type: String }],
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  updates: [{
    timestamp: { type: Date, default: Date.now },
    status: String,
    message: String
  }],
  impact: {
    type: String,
    enum: ['none', 'minor', 'major', 'critical'],
    default: 'none'
  }
}, { timestamps: true });

// Add incident to monitor when created
IncidentSchema.post('save', function(incident) {
  monitor.track({
    code: incident.code,
    message: incident.title,
    severity: incident.severity
  }, { service: incident.components[0] });
});

export const Incident = mongoose.model('Incident', IncidentSchema);