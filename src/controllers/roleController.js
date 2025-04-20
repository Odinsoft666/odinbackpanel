// src/controllers/roleController.js
import { ADMIN_ROLES, addNewRole, ROLE_PERMISSIONS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { db } from '../config/db.js';

class RoleController {
  async getAllRoles(req, res) {
    try {
      const rolesList = Object.keys(ADMIN_ROLES).map(key => ({
        name: ADMIN_ROLES[key],
        permissions: ROLE_PERMISSIONS[ADMIN_ROLES[key]] || {}
      }));
      
      res.json({ 
        success: true,
        roles: rolesList
      });
    } catch (error) {
      logger.error('Get roles error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch roles' 
      });
    }
  }

  async createRole(req, res) {
    try {
      const { roleName, baseType, department } = req.body;
      
      if (!roleName || !baseType) {
        return res.status(400).json({ 
          success: false,
          error: 'Role name and base type are required' 
        });
      }

      const success = addNewRole(roleName, baseType, department);
      
      if (!success) {
        return res.status(400).json({ 
          success: false,
          error: 'Role already exists' 
        });
      }

      // Log the role creation
      await db.getDB().collection('admin_logs').insertOne({
        adminId: req.user.id,
        action: 'ROLE_CREATED',
        roleName,
        timestamp: new Date()
      });

      logger.info(`New role created: ${roleName} by ${req.user.id}`);
      res.status(201).json({ 
        success: true,
        role: roleName,
        permissions: ROLE_PERMISSIONS[roleName]
      });
    } catch (error) {
      logger.error('Create role error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to create role' 
      });
    }
  }

  async getRoleUsers(req, res) {
    try {
      const { role } = req.params;
      
      if (!ADMIN_ROLES[role]) {
        return res.status(404).json({ 
          success: false,
          error: 'Role not found' 
        });
      }

      const users = await db.getDB().collection('users')
        .find({ role })
        .project({ password: 0 })
        .toArray();

      res.json({
        success: true,
        users
      });
    } catch (error) {
      logger.error('Get role users error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch users for role' 
      });
    }
  }
}

export default new RoleController();