import express from 'express';
import { Maintenance } from '../models/Maintenance.js';
import { statusMonitor } from '../core/statusMonitor.js';

const router = express.Router();

// Schedule maintenance
router.post('/', async (req, res) => {
  try {
    const maintenance = new Maintenance({
      ...req.body,
      status: 'scheduled',
      createdBy: req.user.id
    });
    
    await maintenance.save();
    
    statusMonitor.emitUpdate({
      type: 'maintenance_scheduled',
      maintenance
    });
    
    res.status(201).json(maintenance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update maintenance status
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  const maintenance = await Maintenance.findById(req.params.id);
  
  if (!maintenance) {
    return res.status(404).json({ error: 'Maintenance not found' });
  }
  
  maintenance.status = status;
  await maintenance.save();
  
  statusMonitor.emitUpdate({
    type: 'maintenance_update',
    maintenance
  });
  
  res.json(maintenance);
});

// List upcoming maintenance
router.get('/', async (req, res) => {
  const maintenance = await Maintenance.find({
    endTime: { $gt: new Date() }
  }).sort({ startTime: 1 });
  
  res.json(maintenance);
});

export default router;