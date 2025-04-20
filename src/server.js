import 'dotenv/config';
import express from 'express';
import { databaseService as db } from './config/db.js';
import { SESSION_CONFIG, SERVER_CONFIG } from './config/constants.js';
import { logger } from './utils/logger.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { CronJob } from 'cron';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { statusMonitor } from './core/statusMonitor.js';
import { verifyEmailConnection } from './utils/email.js';
import cluster from 'cluster';
import os from 'os';
import compression from 'compression';
import responseTime from 'response-time';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import twilio from 'twilio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Twilio client if credentials exist
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Cluster mode for production
if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  logger.info(`🔄 Starting ${numCPUs} worker processes`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  const app = express();

  // ==================== SECURITY MIDDLEWARE ====================
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://*.example.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'https://*.example.com'],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: { policy: 'same-origin' }
  }));

  // CORS Configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  }));

  // Rate Limiting
  const globalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
    max: parseInt(process.env.GLOBAL_RATE_LIMIT) || 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later'
  });

  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 100,
    delayMs: 500
  });

  app.use(globalLimiter);
  app.use(speedLimiter);

  // Performance Middleware
  app.use(compression());
  app.use(responseTime());

  // Body Parsers
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ==================== SESSION CONFIGURATION ====================
  async function initializeSession() {
    try {
      const client = await db.getClient();
      app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
          client: client,
          dbName: process.env.MONGODB_NAME,
          collectionName: SESSION_CONFIG.COLLECTION,
          ttl: SESSION_CONFIG.TTL,
          autoRemove: 'interval',
          autoRemoveInterval: 10 // Minutes
        }),
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: parseInt(process.env.SESSION_TIMEOUT) * 1000 || 24 * 60 * 60 * 1000,
          domain: process.env.COOKIE_DOMAIN || 'localhost'
        },
        name: 'odinsoft.sid',
        rolling: true,
        proxy: process.env.NODE_ENV === 'production'
      }));
      logger.info('✅ Session configuration loaded');
    } catch (error) {
      logger.error('Failed to initialize session:', error);
      throw error;
    }
  }

  // ==================== WEBSOCKET SERVER ====================
  function initializeWebSocket(server) {
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws) => {
      ws.id = uuidv4();
      logger.info(`New WebSocket connection: ${ws.id}`);
      
      ws.on('message', (message) => {
        logger.info(`Received message: ${message}`);
        // Handle WebSocket messages here
      });
      
      ws.on('close', () => {
        logger.info(`WebSocket disconnected: ${ws.id}`);
      });
    });
    
    app.locals.wss = wss;
    logger.info('✅ WebSocket server initialized');
  }

  // ==================== ROUTES ====================
  async function initializeRoutes() {
    try {
      // Dynamic imports for better startup performance
      const { default: statusRoutes } = await import('./routes/statusRoutes.js');
      const { default: maintenanceRoutes } = await import('./routes/maintenanceRoutes.js');
      const { default: notificationRoutes } = await import('./routes/notificationRoutes.js');
      const { default: authRoutes } = await import('./routes/auth.js');
      const { default: adminRoutes } = await import('./routes/admin.js');
      const { default: userRoutes } = await import('./routes/users.js');
      const { default: gameRoutes } = await import('./routes/games.js');
      const { default: affiliateRoutes } = await import('./routes/affiliates.js');
      const { default: bonusRoutes } = await import('./routes/bonuses.js');
      const { default: contentRoutes } = await import('./routes/content.js');
      const { default: smsRoutes } = await import('./routes/sms.js');
      const { default: emailRoutes } = await import('./routes/email.js');
      const { default: reportRoutes } = await import('./routes/reports.js');
      const { default: paymentRoutes } = await import('./routes/payments.js');
      
      const { verifyToken } = await import('./middleware/authMiddleware.js');
      const { errorHandler } = await import('./middleware/errorHandler.js');
      const { isAdmin } = await import('./middleware/roleMiddleware.js');

      // API Routes
      app.use('/api/status', statusRoutes);
      app.use('/api/maintenance', maintenanceRoutes);
      app.use('/api/notifications', notificationRoutes);
      app.use('/api/auth', authRoutes);
      app.use('/api/admin', verifyToken, isAdmin, adminRoutes);
      app.use('/api/users', verifyToken, userRoutes);
      app.use('/api/games', verifyToken, gameRoutes);
      app.use('/api/affiliates', verifyToken, affiliateRoutes);
      app.use('/api/bonuses', verifyToken, bonusRoutes);
      app.use('/api/content', verifyToken, contentRoutes);
      app.use('/api/sms', verifyToken, smsRoutes);
      app.use('/api/email', verifyToken, emailRoutes);
      app.use('/api/reports', verifyToken, isAdmin, reportRoutes);
      app.use('/api/payments', verifyToken, paymentRoutes);

      // Static Files
      app.use(express.static(path.join(__dirname, 'public'), {
        setHeaders: (res, path) => {
          if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
          } else {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
          }
        }
      }));

      // Views
      app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
      });

      app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
      });

      app.get('/dashboard', verifyToken, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
      });

      app.get('/admin', verifyToken, isAdmin, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
      });

      // Health Check
      app.get('/health', (req, res) => {
        res.json({
          status: 'OK',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          version: process.env.npm_package_version,
          database: 'connected',
          sessionStore: 'active',
          memoryUsage: process.memoryUsage(),
          loadAvg: os.loadavg(),
          connectedClients: app.locals.wss?.clients.size || 0
        });
      });

      // 404 Handler
      app.use((req, res) => {
        res.status(404).json({
          error: 'Not Found',
          message: 'The requested resource was not found',
          path: req.path
        });
      });

      // Error Handler
      app.use(errorHandler);

      logger.info('✅ Routes initialized');
    } catch (error) {
      logger.error('Failed to initialize routes:', error);
      throw error;
    }
  }

  // ==================== CRON JOBS ====================
  function initializeCronJobs() {
    try {
      // Maintenance check every minute
      new CronJob(
        '* * * * *',
        async () => {
          try {
            await statusMonitor.checkScheduledMaintenance();
          } catch (error) {
            logger.error('Maintenance check failed:', error);
          }
        },
        null,
        true,
        'UTC'
      );

      // Database backup every day at 2 AM
      new CronJob(
        '0 2 * * *',
        async () => {
          try {
            await db.backupDatabase();
            logger.info('Database backup completed successfully');
          } catch (error) {
            logger.error('Database backup failed:', error);
          }
        },
        null,
        true,
        'UTC'
      );

      // Log memory usage every hour
      new CronJob(
        '0 * * * *',
        () => {
          const memoryUsage = process.memoryUsage();
          logger.info(`Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
        },
        null,
        true,
        'UTC'
      );

      // Process bonus awards every day at midnight
      new CronJob(
        '0 0 * * *',
        async () => {
          try {
            logger.info('Starting daily bonus processing...');
            // Implement your bonus awarding logic here
            logger.info('Daily bonus processing completed');
          } catch (error) {
            logger.error('Bonus processing failed:', error);
          }
        },
        null,
        true,
        'UTC'
      );

      // Process affiliate commissions every Sunday at 3 AM
      new CronJob(
        '0 3 * * 0',
        async () => {
          try {
            logger.info('Starting affiliate commission processing...');
            // Implement your affiliate commission logic here
            logger.info('Affiliate commission processing completed');
          } catch (error) {
            logger.error('Affiliate commission processing failed:', error);
          }
        },
        null,
        true,
        'UTC'
      );

      logger.info('✅ Cron jobs initialized');
    } catch (error) {
      logger.error('Failed to initialize cron jobs:', error);
    }
  }

  // ==================== SERVER STARTUP ====================
  async function startServer() {
    try {
      validateEnvironment();
      logger.info('✅ Environment variables validated');

      logger.info('⏳ Connecting to database...');
      await db.connect();
      logger.info('✅ Database connection established');

      await initializeSession();
      await initializeRoutes();
      
      const server = app.listen(SERVER_CONFIG.PORT, () => {
        logger.info(`🚀 Server running on port ${SERVER_CONFIG.PORT} in ${SERVER_CONFIG.ENV} mode`);
        logger.info(`🌐 Allowed origins: ${process.env.ALLOWED_ORIGINS}`);
        logger.info(`🛡️  Security headers enabled`);
        logger.info(`⏱️  Rate limiting: ${process.env.GLOBAL_RATE_LIMIT} req/${process.env.RATE_LIMIT_WINDOW}min`);
        logger.info(`💾 Database: ${process.env.MONGODB_URI.split('@')[1]?.split('/')[0] || 'local'}`);
      });

      initializeWebSocket(server);
      initializeCronJobs();

      await verifyEmailConnection();
      if (twilioClient) {
        logger.info('✅ SMS service (Twilio) initialized');
      }

      // Graceful shutdown
      const shutdown = async () => {
        logger.warn('🛑 Received shutdown signal. Closing server gracefully...');
        
        // Close WebSocket connections
        if (app.locals.wss) {
          app.locals.wss.clients.forEach(client => client.close());
          app.locals.wss.close();
        }
        
        server.close(async () => {
          await db.close();
          logger.info('💤 Server closed');
          process.exit(0);
        });

        setTimeout(() => {
          logger.error('🛑 Forcing shutdown after timeout');
          process.exit(1);
        }, 10000);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);

      // Error handlers
      process.on('uncaughtException', (error) => {
        logger.fatal('UNCAUGHT EXCEPTION! 💥', error);
        shutdown();
      });

      process.on('unhandledRejection', (reason) => {
        logger.fatal('UNHANDLED REJECTION! 💥', reason instanceof Error ? reason : new Error(reason));
        shutdown();
      });

    } catch (error) {
      logger.error('Failed to start server:', {
        message: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  function validateEnvironment() {
    const requiredVars = [
      'SESSION_SECRET',
      'MONGODB_URI',
      'ALLOWED_ORIGINS',
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'EMAIL_HOST',
      'EMAIL_PASS',
      'ADMIN_EMAIL',
      'ADMIN_PASSWORD_HASH'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
      process.exit(1);
    }

    if (process.env.NODE_ENV === 'production') {
      if (process.env.COOKIE_SECURE !== 'true') {
        logger.warn('⚠️  COOKIE_SECURE should be true in production');
      }
      if (!process.env.DOMAIN) {
        logger.warn('⚠️  DOMAIN should be set in production for proper cookie handling');
      }
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        logger.warn('⚠️  Twilio credentials not set - SMS functionality will be disabled');
      }
    }
  }

  startServer();
}