import { db } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { ObjectId } from 'mongodb';
import { AdminLog } from '../models/AdminLog.js';
import bcrypt from 'bcryptjs';

class AdminController {
  // Dashboard Statistics
  async getDashboardStats(req, res) {
    try {
      const stats = {
        totalPlayers: await db.collection('players').countDocuments(),
        activePlayers: await db.collection('players').countDocuments({ status: 'active' }),
        totalOperators: await db.collection('users').countDocuments({ role: { $in: ['admin', 'operator'] } }),
        pendingDeposits: await db.collection('transactions').countDocuments({ type: 'deposit', status: 'pending' })
      };

      await AdminLog.create({
        adminId: req.user.id,
        action: 'DASHBOARD_ACCESS',
        details: {},
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json(stats);
    } catch (err) {
      logger.error('Dashboard error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Player Management
  async getPlayers(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const skip = (page - 1) * limit;
      
      const query = status ? { status } : {};
      
      const [players, total] = await Promise.all([
        db.collection('players')
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        db.collection('players').countDocuments(query)
      ]);
      
      await AdminLog.create({
        adminId: req.user.id,
        action: 'PLAYERS_LIST_ACCESS',
        details: { filters: req.query },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({
        data: players,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });
    } catch (err) {
      logger.error('Players list error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async getPlayerProfile(req, res) {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid player ID' });
      }
      
      const player = await db.collection('players').findOne({ 
        _id: new ObjectId(id)
      });
      
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      await AdminLog.create({
        adminId: req.user.id,
        action: 'PLAYER_PROFILE_ACCESS',
        details: { playerId: id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(player);
    } catch (err) {
      logger.error('Get player profile error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Operator Management
  async getOperators(req, res) {
    try {
      const { page = 1, limit = 20, role, status } = req.query;
      const skip = (page - 1) * limit;
      
      const query = { 
        role: { $in: ['admin', 'operator'] } 
      };
      
      if (role) query.role = role;
      if (status) query.isActive = status === 'active';
      
      const [operators, total] = await Promise.all([
        db.collection('users')
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        db.collection('users').countDocuments(query)
      ]);
      
      await AdminLog.create({
        adminId: req.user.id,
        action: 'OPERATORS_LIST_ACCESS',
        details: { filters: req.query },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({
        data: operators,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total
        }
      });
    } catch (err) {
      logger.error('Operators list error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async getOperator(req, res) {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid operator ID' });
      }
      
      const operator = await db.collection('users').findOne({ 
        _id: new ObjectId(id),
        role: { $in: ['admin', 'operator'] }
      });
      
      if (!operator) {
        return res.status(404).json({ error: 'Operator not found' });
      }
      
      res.json(operator);
    } catch (err) {
      logger.error('Get operator error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async createOperator(req, res) {
    try {
      const { adminName, email, adminClass, country, password, name, surname, phone } = req.body;
      
      // Validation
      const errors = [];
      if (!adminName) errors.push('Admin name is required');
      if (!email) errors.push('Email is required');
      if (!password) errors.push('Password is required');
      if (!adminClass) errors.push('Admin class is required');
      if (!country) errors.push('Country is required');
      if (password.length < 10) errors.push('Password must be at least 10 characters');
      if (!/^\+[0-9]{1,3}[0-9]{4,14}$/.test(phone)) errors.push('Invalid phone format');
      
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }
      
      // Check for existing user
      const existingUser = await db.collection('users').findOne({ 
        $or: [{ adminName }, { email }] 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          error: existingUser.adminName === adminName 
            ? 'Admin name already exists' 
            : 'Email already exists'
        });
      }
      
      // Create operator
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await db.collection('users').insertOne({
        adminName,
        email,
        password: hashedPassword,
        role: adminClass.toLowerCase().includes('admin') ? 'admin' : 'operator',
        adminClass,
        country,
        phone,
        name,
        surname,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        permissions: this.getDefaultPermissions(adminClass),
        lastLogin: null,
        loginHistory: [],
        twoFactorEnabled: false
      });
      
      await AdminLog.create({
        adminId: req.user.id,
        action: 'OPERATOR_CREATED',
        details: {
          adminName,
          email,
          adminClass
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(201).json({
        id: result.insertedId,
        adminName,
        email,
        adminClass,
        country,
        createdAt: new Date()
      });
    } catch (err) {
      logger.error('Create operator error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async updateOperator(req, res) {
    try {
      const { id } = req.params;
      const { adminName, email, adminClass, country, password, name, surname, phone, isActive } = req.body;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid operator ID' });
      }
      
      const updateData = {
        adminName,
        email,
        adminClass,
        country,
        name,
        surname,
        phone,
        isActive,
        updatedAt: new Date()
      };
      
      if (password) {
        if (password.length < 10) {
          return res.status(400).json({ error: 'Password must be at least 10 characters' });
        }
        updateData.password = await bcrypt.hash(password, 12);
      }
      
      const result = await db.collection('users').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (!result.value) {
        return res.status(404).json({ error: 'Operator not found' });
      }
      
      await AdminLog.create({
        adminId: req.user.id,
        action: 'OPERATOR_UPDATED',
        details: updateData,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json(result.value);
    } catch (err) {
      logger.error('Update operator error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async deleteOperator(req, res) {
    try {
      const { id } = req.params;
      
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid operator ID' });
      }
      
      if (id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      const result = await db.collection('users').deleteOne({ 
        _id: new ObjectId(id),
        role: { $in: ['admin', 'operator'] }
      });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Operator not found' });
      }
      
      await AdminLog.create({
        adminId: req.user.id,
        action: 'OPERATOR_DELETED',
        details: { operatorId: id },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({ success: true });
    } catch (err) {
      logger.error('Delete operator error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async getOperatorClasses(req, res) {
    try {
      const classes = [
        'SUPERADMIN',
        'FINANCE_ADMIN',
        'RISK_ADMIN',
        'LIVE_SUPPORT_ADMIN',
        'CALL_ADMIN',
        'MARKETING_ADMIN',
        'ACCOUNTING_ADMIN',
        'TECHNICAL_ADMIN',
        'BONUS_ADMIN',
        'AFFILIATE_ADMIN'
      ];
      res.json(classes);
    } catch (err) {
      logger.error('Get operator classes error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  getDefaultPermissions(adminClass) {
    const basePermissions = {
      userManagement: false,
      balanceAdjustments: false,
      depositApproval: false,
      withdrawalApproval: false,
      bonusManagement: false,
      gameManagement: false,
      reportAccess: false,
      systemSettings: false
    };
    
    switch(adminClass) {
      case 'SUPERADMIN':
        return Object.keys(basePermissions).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {});
      case 'FINANCE_ADMIN':
        return {
          ...basePermissions,
          balanceAdjustments: true,
          depositApproval: true,
          withdrawalApproval: true,
          reportAccess: true
        };
      case 'RISK_ADMIN':
        return {
          ...basePermissions,
          userManagement: true,
          reportAccess: true
        };
      case 'LIVE_SUPPORT_ADMIN':
        return {
          ...basePermissions,
          userManagement: true
        };
      default:
        return basePermissions;
    }
  }
}

// Single export at the end
export default new AdminController();