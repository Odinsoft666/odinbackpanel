import { databaseService } from './config/db.js';
import { logger } from './utils/logger.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

class UserDatabaseService {
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

  static async authenticateUser(identifier, password, isAdminLogin = false) {
    const db = await databaseService.getDB();
    const collectionName = isAdminLogin ? 'admins' : 'users';
    const usernameField = isAdminLogin ? 'adminName' : 'username';

    try {
      const user = await db.collection(collectionName).findOne({
        $or: [
          { [usernameField]: identifier },
          { email: identifier }
        ]
      });

      if (!user) return { success: false, error: 'Invalid credentials' };
      if (isAdminLogin && !user.isActive) return { success: false, error: 'Account disabled' };

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return { success: false, error: 'Invalid credentials' };

      await db.collection(collectionName).updateOne(
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
          permissions: user.permissions || this.getDefaultPermissions(user.adminClass),
          isAdmin: isAdminLogin
        }
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  static getDefaultPermissions(adminClass) {
    return this.ADMIN_PERMISSIONS[adminClass] || {};
  }

  static async createUser(userData) {
    const db = await databaseService.getDB();
    
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    const result = await db.collection('users').insertOne({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });

    return result.insertedId;
  }

  static async updateUser(userId, updateData) {
    const db = await databaseService.getDB();
    
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    return result.modifiedCount;
  }

  static async logActivity(userId, activityType, metadata = {}) {
    const db = await databaseService.getDB();
    
    await db.collection('activitylogs').insertOne({
      userId: new ObjectId(userId),
      activityType,
      metadata,
      timestamp: new Date()
    });
  }
}

// Named exports
export const userDBService = {
  authenticate: UserDatabaseService.authenticateUser.bind(UserDatabaseService),
  createUser: UserDatabaseService.createUser.bind(UserDatabaseService),
  updateUser: UserDatabaseService.updateUser.bind(UserDatabaseService),
  logActivity: UserDatabaseService.logActivity.bind(UserDatabaseService),
  permissions: UserDatabaseService.ADMIN_PERMISSIONS
};

// Default export
export default UserDatabaseService;