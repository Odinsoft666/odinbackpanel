import { databaseService } from './config/db.js';
import { logger } from './utils/logger.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { User, UserStatus } from '../models/User.js';
import { passwordPolicy } from '../config/constants.js';

class UserDatabaseService {
  static ADMIN_PERMISSIONS = Object.freeze({
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
    },
    SUPPORT_ADMIN: {
      VIEW_DASHBOARD: true,
      MANAGE_PLAYERS: true,
      VIEW_FINANCIAL_DATA: false,
      SYSTEM_CONFIGURATION: false
    }
  });

  static async authenticateUser(identifier, password, isAdminLogin = false) {
    const db = await databaseService.getDB();
    const collectionName = isAdminLogin ? 'admins' : 'users';
    const usernameField = isAdminLogin ? 'adminName' : 'username';

    try {
      const user = await db.collection(collectionName).findOne({
        $or: [
          { [usernameField]: identifier },
          { email: identifier.toLowerCase() }
        ]
      });

      if (!user) {
        logger.warn(`Failed login attempt for ${identifier}`);
        return { 
          success: false, 
          error: 'Invalid credentials',
          code: 'AUTH_INVALID_CREDENTIALS'
        };
      }

      // Check account status
      if (user.status === UserStatus.SUSPENDED) {
        return {
          success: false,
          error: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED'
        };
      }

      if (user.status === UserStatus.BANNED) {
        return {
          success: false,
          error: 'Account banned',
          code: 'ACCOUNT_BANNED'
        };
      }

      if (isAdminLogin && !user.isActive) {
        return { 
          success: false, 
          error: 'Account disabled',
          code: 'ACCOUNT_DISABLED'
        };
      }

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        return {
          success: false,
          error: 'Account temporarily locked',
          code: 'ACCOUNT_LOCKED'
        };
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Increment failed attempts
        await db.collection(collectionName).updateOne(
          { _id: user._id },
          { $inc: { failedLoginAttempts: 1 } }
        );

        // Lock account if too many attempts
        const updatedUser = await db.collection(collectionName).findOne({ _id: user._id });
        if (updatedUser.failedLoginAttempts >= 5) {
          const lockTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          await db.collection(collectionName).updateOne(
            { _id: user._id },
            { $set: { accountLockedUntil: lockTime } }
          );
          return {
            success: false,
            error: 'Account locked due to too many failed attempts',
            code: 'ACCOUNT_LOCKED'
          };
        }

        logger.warn(`Failed password attempt for user ${user._id}`);
        return { 
          success: false, 
          error: 'Invalid credentials',
          code: 'AUTH_INVALID_CREDENTIALS'
        };
      }

      // Reset failed attempts on successful login
      await db.collection(collectionName).updateOne(
        { _id: user._id },
        { 
          $set: { 
            lastLogin: new Date(),
            accountLockedUntil: null,
            failedLoginAttempts: 0
          },
          $inc: { loginCount: 1 }
        }
      );

      return {
        success: true,
        user: {
          id: user._id,
          username: user[usernameField],
          email: user.email,
          status: user.status,
          role: user.adminClass || 'player',
          permissions: user.permissions || this.getDefaultPermissions(user.adminClass),
          isAdmin: isAdminLogin,
          twoFactorEnabled: user.twoFactorEnabled || false
        }
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      return { 
        success: false, 
        error: 'Authentication failed',
        code: 'AUTH_FAILURE'
      };
    }
  }

  static async createUser(userData) {
    const db = await databaseService.getDB();
    
    try {
      // Create Mongoose document for validation
      const user = new User(userData);
      await user.validate();

      if (userData.password) {
        user.password = await bcrypt.hash(userData.password, passwordPolicy.saltRounds);
      }

      // Generate referral code if not provided
      if (!userData.referralCode) {
        user.referralCode = this.generateReferralCode();
      }

      const result = await db.collection('users').insertOne(user);
      
      logger.info(`New user created: ${result.insertedId}`);
      return {
        success: true,
        userId: result.insertedId,
        referralCode: user.referralCode
      };
    } catch (error) {
      logger.error('User creation failed:', error);
      
      if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
          errors[key] = error.errors[key].message;
        });
        
        return {
          success: false,
          error: 'Validation failed',
          details: errors,
          code: 'VALIDATION_ERROR'
        };
      }
      
      if (error.code === 11000) {
        const field = error.message.includes('email') ? 'email' : 'username';
        return {
          success: false,
          error: `${field} already exists`,
          code: 'DUPLICATE_KEY'
        };
      }
      
      return {
        success: false,
        error: 'User creation failed',
        code: 'USER_CREATION_FAILED'
      };
    }
  }

  static async updateUser(userId, updateData) {
    const db = await databaseService.getDB();
    
    try {
      // Validate update data
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, passwordPolicy.saltRounds);
      }

      // Prevent certain fields from being updated
      const restrictedFields = ['_id', 'createdAt', 'loginCount'];
      restrictedFields.forEach(field => delete updateData[field]);

      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      logger.error('User update failed:', error);
      
      if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
          errors[key] = error.errors[key].message;
        });
        
        return {
          success: false,
          error: 'Validation failed',
          details: errors,
          code: 'VALIDATION_ERROR'
        };
      }
      
      if (error.code === 11000) {
        return {
          success: false,
          error: 'Duplicate key violation',
          code: 'DUPLICATE_KEY'
        };
      }
      
      return {
        success: false,
        error: 'User update failed',
        code: 'USER_UPDATE_FAILED'
      };
    }
  }

  static async getUserById(userId, includeSensitive = false) {
    const db = await databaseService.getDB();
    
    try {
      const projection = includeSensitive 
        ? {} 
        : { password: 0, securityQuestions: 0, failedLoginAttempts: 0 };
      
      const user = await db.collection('users')
        .findOne({ _id: new ObjectId(userId) }, { projection });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        };
      }

      return {
        success: true,
        user
      };
    } catch (error) {
      logger.error('Failed to get user:', error);
      return {
        success: false,
        error: 'Failed to retrieve user',
        code: 'USER_RETRIEVAL_FAILED'
      };
    }
  }

  static async logActivity(userId, activityType, metadata = {}) {
    const db = await databaseService.getDB();
    
    try {
      const result = await db.collection('activitylogs').insertOne({
        userId: new ObjectId(userId),
        activityType,
        metadata: {
          ...metadata,
          timestamp: new Date()
        },
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        createdAt: new Date()
      });

      return {
        success: true,
        logId: result.insertedId
      };
    } catch (error) {
      logger.error('Activity log failed:', error);
      return {
        success: false,
        error: 'Failed to log activity',
        code: 'ACTIVITY_LOG_FAILED'
      };
    }
  }

  static generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static getDefaultPermissions(adminClass) {
    return this.ADMIN_PERMISSIONS[adminClass] || {};
  }
}

export const userDBService = {
  authenticate: UserDatabaseService.authenticateUser.bind(UserDatabaseService),
  createUser: UserDatabaseService.createUser.bind(UserDatabaseService),
  updateUser: UserDatabaseService.updateUser.bind(UserDatabaseService),
  getUserById: UserDatabaseService.getUserById.bind(UserDatabaseService),
  logActivity: UserDatabaseService.logActivity.bind(UserDatabaseService),
  generateReferralCode: UserDatabaseService.generateReferralCode.bind(UserDatabaseService),
  permissions: UserDatabaseService.ADMIN_PERMISSIONS
};

export default UserDatabaseService;