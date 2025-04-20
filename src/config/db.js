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
        
        // Initialize status monitoring collection
        await this.initializeStatusCollections();
        
        resolve(this.#db);
      } catch (error) {
        logger.error('Database connection failed:', error);
        statusMonitor.logIncident({
          code: 'DB_201',
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

  static async initializeStatusCollections() {
    try {
      const db = await this.getDB();
      await db.collection('uptimerecords').createIndex(
        { service: 1, date: 1 }, 
        { unique: true }
      );
      await db.collection('incidents').createIndex(
        { components: 1, startTime: -1 }
      );
    } catch (error) {
      logger.error('Failed to initialize status collections:', error);
    }
  }

  static startHealthMonitoring() {
    if (this.#healthCheckInterval) clearInterval(this.#healthCheckInterval);
    
    this.#healthCheckInterval = setInterval(async () => {
      try {
        const db = await this.getDB();
        await db.command({ ping: 1 });
        
        // Log successful health check
        await UptimeRecord.create({
          service: 'database',
          date: new Date(),
          uptimePercentage: 100,
          downtimeMinutes: 0
        });
      } catch (error) {
        logger.error('Database health check failed:', error);
        statusMonitor.logIncident({
          code: 'DB_201',
          message: 'MongoDB health check failed',
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
      logger.info('Database connection closed');
    }
  }

  static async logUptime(service, uptimeData) {
    try {
      const db = await this.getDB();
      return db.collection('uptimerecords').insertOne({
        service,
        ...uptimeData,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to log uptime:', error);
      throw error;
    }
  }

  static async getUptimeStats(service, period = '30d') {
    const db = await this.getDB();
    const dateFilter = this.getDateFilter(period);
    
    return db.collection('uptimerecords').aggregate([
      { $match: { service, timestamp: dateFilter } },
      { $group: {
        _id: null,
        avgUptime: { $avg: '$uptimePercentage' },
        totalDowntime: { $sum: '$downtimeMinutes' },
        incidents: { $sum: { $size: '$incidents' } }
      }}
    ]).toArray();
  }

  static getDateFilter(period) {
    const now = new Date();
    switch(period) {
      case '24h': return { $gte: new Date(now - 86400000) };
      case '7d': return { $gte: new Date(now - 604800000) };
      case '30d': return { $gte: new Date(now - 2592000000) };
      default: return { $gte: new Date(0) };
    }
  }
}

export const db = {
  connect: Database.connect.bind(Database),
  getDB: Database.getDB.bind(Database),
  getClient: Database.getClient.bind(Database),
  close: Database.close.bind(Database),
  logUptime: Database.logUptime.bind(Database),
  getUptimeStats: Database.getUptimeStats.bind(Database)
};