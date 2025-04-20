import express from 'express';
import { statusMonitor } from '../core/statusMonitor.js';
import { Incident } from '../models/Incident.js';

const router = express.Router();

// Status Dashboard Data
router.get('/status', (req, res) => {
  res.json({
    status: statusMonitor.overallStatus,
    services: statusMonitor.services,
    lastUpdated: new Date()
  });
});

// Incident History
router.get('/incidents', async (req, res) => {
  const incidents = await Incident.find()
    .sort({ startTime: -1 })
    .limit(10);
  res.json(incidents);
});

// Incident Details
router.get('/incidents/:id', async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  res.json(incident || { error: 'Incident not found' });
});

// Post Incident Update
router.post('/incidents/:id/updates', async (req, res) => {
  const { message, status } = req.body;
  const incident = await Incident.findById(req.params.id);
  
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  incident.updates.push({ message, status });
  incident.status = status;
  await incident.save();

  statusMonitor.emitUpdate(incident, 'incident_update');
  res.json(incident);
});

// Realtime Updates SSE
router.get('/updates', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  statusMonitor.on('update', sendUpdate);
  req.on('close', () => statusMonitor.off('update', sendUpdate));
});

export default router;