// src/routes/roleRoutes.js
import express from 'express';
import RoleController from '../controllers/roleController.js';
import { isSuperAdmin, hasRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Get all available roles
router.get('/', hasRole(['SUPERADMIN', 'FINANCE_SUPERADMIN', 'CALL_SUPERADMIN', 'LIVE_SUPPORT_SUPERADMIN', 'MARKETING_SUPERADMIN']), RoleController.getAllRoles);

// Create new role (Superadmin only)
router.post('/', isSuperAdmin, RoleController.createRole);

// Get users by role
router.get('/:role/users', hasRole(['SUPERADMIN', 'FINANCE_SUPERADMIN', 'CALL_SUPERADMIN', 'LIVE_SUPPORT_SUPERADMIN', 'MARKETING_SUPERADMIN']), RoleController.getRoleUsers);

export default router;