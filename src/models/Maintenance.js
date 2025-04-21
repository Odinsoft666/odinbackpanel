import mongoose from 'mongoose';

const MaintenanceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  components: [{ type: String, required: true }],
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed'],
    default: 'scheduled'
  },
  impact: {
    type: String,
    enum: ['none', 'minor', 'major', 'critical'],
    default: 'major'
  },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Update service status when maintenance starts/ends
MaintenanceSchema.post('save', async function(doc) {
  if (doc.status === 'in_progress') {
    doc.components.forEach(service => {
      statusMonitor.setMaintenanceStatus(service, true);
    });
  }
});

const Maintenance = mongoose.model('Maintenance', MaintenanceSchema);
export { Maintenance };