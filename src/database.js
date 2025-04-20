import { getDb } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { PASSWORD_POLICY } from '../config/constants.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

class DatabaseService {
  static #connectionPool;
  static ADMIN_PERMISSIONS = {
    OWNER: {
      VIEW_DASHBOARD: true,
      MANAGE_ADMINS: true,
      MANAGE_PLAYERS: true,
      VIEW_FINANCIAL_DATA: true,
      SYSTEM_CONFIGURATION: true,
      ALL_PERMISSIONS: true
    },
    SUPERADMIN: {
      VIEW_DASHBOARD: true,
      MANAGE_ADMINS: true,
      MANAGE_PLAYERS: true,
      VIEW_FINANCIAL_DATA: true,
      SYSTEM_CONFIGURATION: true
    },
    FINANCE_ADMIN: {
      VIEW_DASHBOARD: true,
      VIEW_FINANCIAL_DATA: true,
      MANAGE_PLAYERS: false,
      SYSTEM_CONFIGURATION: false
    }
  };

  static async #getDatabase() {
    if (!this.#connectionPool) {
      try {
        this.#connectionPool = await getDb();
        logger.info('Database connection pool established');
      } catch (error) {
        logger.error('Database connection failed:', error);
        throw error;
      }
    }
    return this.#connectionPool;
  }

  static async closeConnection() {
    if (this.#connectionPool) {
      await this.#connectionPool.close();
      this.#connectionPool = null;
      logger.info('Database connection pool closed');
    }
  }

  static async authenticateUser(identifier, password, isAdminLogin = false) {
    const database = await this.#getDatabase();
    const collectionName = isAdminLogin ? 'admins' : 'users';
    const usernameField = isAdminLogin ? 'adminName' : 'username';

    try {
      const user = await database.collection(collectionName).findOne({
        $or: [
          { [usernameField]: identifier },
          { email: identifier }
        ]
      });

      if (!user) return { success: false, error: 'Invalid credentials' };
      if (isAdminLogin && !user.isActive) return { success: false, error: 'Account disabled' };

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return { success: false, error: 'Invalid credentials' };

      await database.collection(collectionName).updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );

      return {
        success: true,
        user: {
          id: user._id,
          username: user[usernameField],
          email: user.email,
          role: user.adminClass || 'player',
          permissions: user.permissions,
          isAdmin: isAdminLogin
        }
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  // ... (other methods remain the same with proper error handling)
}

export const databaseService = new DatabaseService();