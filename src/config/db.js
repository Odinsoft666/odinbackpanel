import { MongoClient } from 'mongodb';
import { DB_CONFIG } from './constants.js';
import { logger } from '../utils/logger.js';
import { statusMonitor } from '../core/statusMonitor.js';
import { UptimeRecord } from '../models/UptimeRecord.js';

class Database {
  static #client = null;
  static #db = null;
  static #connectionPromise = null;
  static #healthCheckInterval = null;
  static #isInitialized = false;

  static async connect() {
    if (this.#db) return this.#db;
    if (this.#connectionPromise) return this.#connectionPromise;

    this.#connectionPromise = new Promise(async (resolve, reject) => {
      try {
        this.#client = new MongoClient(DB_CONFIG.URI, DB_CONFIG.OPTIONS);
        await this.#client.connect();
        
        this.#db = this.#client.db(DB_CONFIG.NAME);
        await this.#db.command({ ping: 1 });
        
        logger.info(`✅ Connected to database: ${DB_CONFIG.NAME}`);
        this.startHealthMonitoring();
        
        if (!this.#isInitialized) {
          await this.initializeCollections();
          this.#isInitialized = true;
        }
        
        resolve(this.#db);
      } catch (error) {
        logger.error('Database connection failed:', error);
        statusMonitor.logIncident({
          code: 'DB_CONNECTION_FAILED',
          message: 'MongoDB connection failed',
          severity: 'CRITICAL',
          stack: error.stack
        });
        this.#connectionPromise = null;
        reject(error);
      }
    });

    return this.#connectionPromise;
  }

  static async initializeCollections() {
    try {
      const db = await this.getDB();
      
      // Uptime Records Collection
      await db.collection('uptimerecords').createIndexes([
        { key: { service: 1, timestamp: 1 }, unique: true },
        { key: { service: 1 } },
        { key: { timestamp: -1 } }
      ]);

      // Incidents Collection
      await db.collection('incidents').createIndexes([
        { key: { code: 1 } },
        { key: { severity: 1 } },
        { key: { timestamp: -1 } }
      ]);

      // Users Collection
      await db.collection('users').createIndexes([
        { key: { email: 1 }, unique: true },
        { key: { username: 1 }, unique: true },
        { key: { lastLogin: -1 } }
      ]);

      // Admins Collection
      await db.collection('admins').createIndexes([
        { key: { adminName: 1 }, unique: true },
        { key: { email: 1 }, unique: true },
        { key: { adminClass: 1 } }
      ]);

      logger.info('✅ Database collections initialized');
    } catch (error) {
      logger.error('Failed to initialize database collections:', error);
      throw error;
    }
  }

  static startHealthMonitoring() {
    if (this.#healthCheckInterval) clearInterval(this.#healthCheckInterval);
    
    this.#healthCheckInterval = setInterval(async () => {
      try {
        const db = await this.getDB();
        await db.command({ ping: 1 });
        
        await UptimeRecord.create({
          service: 'database',
          uptimePercentage: 100,
          responseTime: Date.now(),
          status: 'healthy',
          timestamp: new Date()
        });
      } catch (error) {
        logger.error('Database health check failed:', error);
        await UptimeRecord.create({
          service: 'database',
          uptimePercentage: 0,
          responseTime: null,
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date()
        });
        
        statusMonitor.logIncident({
          code: 'DB_HEALTH_CHECK_FAILED',
          message: 'Database health check failed',
          severity: 'HIGH',
          stack: error.stack
        });
      }
    }, 300000); // Every 5 minutes
  }

  static async getDB() {
    if (!this.#db) {
      await this.connect();
    }
    return this.#db;
  }

  static async getClient() {
    if (!this.#client) {
      await this.connect();
    }
    return this.#client;
  }

  static async close() {
    if (this.#healthCheckInterval) {
      clearInterval(this.#healthCheckInterval);
      this.#healthCheckInterval = null;
    }
    
    if (this.#client) {
      await this.#client.close();
      this.#client = null;
      this.#db = null;
      this.#connectionPromise = null;
      this.#isInitialized = false;
      logger.info('Database connection closed');
    }
  }

  static async backupDatabase() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}`;
      
      const { stdout } = await exec(`mongodump --uri="${DB_CONFIG.URI}" --out=./backups/${backupName}`);
      logger.info(`Database backup created: ${backupName}`);
      return { success: true, backupName };
    } catch (error) {
      logger.error('Database backup failed:', error);
      throw error;
    }
  }

  static async getCollectionStats(collectionName) {
    try {
      const db = await this.getDB();
      const collection = db.collection(collectionName);
      
      return {
        count: await collection.countDocuments(),
        storageSize: await collection.stats().then(s => s.storageSize),
        indexSize: await collection.stats().then(s => s.totalIndexSize)
      };
    } catch (error) {
      logger.error(`Failed to get stats for collection ${collectionName}:`, error);
      throw error;
    }
  }
}

// Named exports
export const db = {
  connect: Database.connect.bind(Database),
  getDB: Database.getDB.bind(Database),
  getClient: Database.getClient.bind(Database),
  close: Database.close.bind(Database),
  backup: Database.backupDatabase.bind(Database),
  getStats: Database.getCollectionStats.bind(Database),
  initialize: Database.initializeCollections.bind(Database)
};

export const databaseService = db;