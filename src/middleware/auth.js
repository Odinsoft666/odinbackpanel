import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.split(' ')[1] 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('+password');

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found or account disabled'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.adminClass)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.admin.adminClass} is not authorized to access this route`
      });
    }
    next();
  };
};