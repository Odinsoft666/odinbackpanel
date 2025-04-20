import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Admin from '../models/Admin.js';

const router = express.Router();

// Create Admin (Only SUPERADMIN can create new admins)
router.post('/', 
  protect,
  authorize('SUPERADMIN'),
  async (req, res) => {
    try {
      const newAdmin = await Admin.create(req.body);
      res.status(201).json({
        success: true,
        data: {
          id: newAdmin._id,
          adminName: newAdmin.adminName,
          adminClass: newAdmin.adminClass,
          name: newAdmin.name,
          email: newAdmin.email
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get All Admins
router.get('/', 
  protect,
  authorize('SUPERADMIN', 'FINANCE_ADMIN'),
  async (req, res) => {
    try {
      const admins = await Admin.find().select('-password -__v');
      res.json({
        success: true,
        count: admins.length,
        data: admins
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
);

// Update Admin Status
router.patch('/:id/status',
  protect,
  authorize('SUPERADMIN'),
  async (req, res) => {
    try {
      const admin = await Admin.findByIdAndUpdate(
        req.params.id,
        { isActive: req.body.isActive },
        { new: true, runValidators: true }
      ).select('-password -__v');

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Admin not found'
        });
      }

      res.json({
        success: true,
        data: admin
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;