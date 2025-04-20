import { db } from '../config/db.js';
import { logger } from '../utils/logger.js';
import DatabaseService from '../services/database.js';

const database = db.getDB();

class AdminController {
  async getDashboardStats(req, res) {
    try {
      const stats = await DatabaseService.getDashboardStats();
      
      await database.collection('admin_logs').insertOne({
        adminId: req.user.id,
        action: 'DASHBOARD_ACCESS',
        timestamp: new Date()
      });
      
      res.json(stats);
    } catch (err) {
      logger.error('Dashboard error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }

  async getPlayers(req, res) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const skip = (page - 1) * limit;
      
      const query = status ? { status } : {};
      
      const [players, total] = await Promise.all([
        database.collection('players')
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        database.collection('players').countDocuments(query)
      ]);
      
      await database.collection('admin_logs').insertOne({
        adminId: req.user.id,
        action: 'PLAYERS_LIST_ACCESS',
        filters: req.query,
        timestamp: new Date()
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

  async getOperators(req, res) {
    try {
      const { page = 1, limit = 20, role } = req.query;
      const skip = (page - 1) * limit;
      
      const query = { 
        role: { $in: ['admin', 'operator'] } 
      };
      
      if (role) {
        query.role = role;
      }
      
      const [operators, total] = await Promise.all([
        database.collection('users')
          .find(query)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray(),
        database.collection('users').countDocuments(query)
      ]);
      
      await database.collection('admin_logs').insertOne({
        adminId: req.user.id,
        action: 'OPERATORS_LIST_ACCESS',
        filters: req.query,
        timestamp: new Date()
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

  async createOperator(req, res) {
    try {
      const { adminName, email, adminClass, country, password, name, surname, phone } = req.body;
      
      // Validate input
      if (!adminName || !email || !password || !adminClass || !country) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Check if admin name already exists
      const existingUser = await database.collection('users').findOne({ 
        $or: [{ adminName }, { email }] 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          error: existingUser.adminName === adminName 
            ? 'Admin name already exists' 
            : 'Email already exists'
        });
      }
      
      // Create the operator
      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await database.collection('users').insertOne({
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
        isActive: true
      });
      
      await database.collection('admin_logs').insertOne({
        adminId: req.user.id,
        action: 'OPERATOR_CREATED',
        operatorId: result.insertedId,
        timestamp: new Date()
      });
      
      res.status(201).json({
        id: result.insertedId,
        adminName,
        email,
        adminClass,
        country
      });
    } catch (err) {
      logger.error('Create operator error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
}

export default new AdminController();