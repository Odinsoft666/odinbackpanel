import 'dotenv/config';
import express from 'express';
import { databaseService as db } from './config/db.js';
import { SESSION_CONFIG, SERVER_CONFIG, ERROR_TYPES, ERROR_CODES, ERROR_SEVERITY, MONITORING_CONFIG } from './config/constants.js';
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
import twilio from 'twilio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== ENHANCED DEBUGGING SYSTEM ====================
const debug = {
  components: [],
  performanceMetrics: [],
  
  track: (type, name, validationFn) => {
    const start = process.hrtime();
    const result = validationFn();
    const end = process.hrtime(start);
    const duration = (end[0] * 1000 + end[1] / 1e6).toFixed(2);
    
    debug.components.push({ 
      type, 
      name, 
      valid: result.valid,
      duration: `${duration}ms`
    });
    
    if (!result.valid) {
      logger.logError(type, result.error?.code || ERROR_CODES.UNHANDLED_ERROR, 
        result.error || new Error('Validation failed'), { component: name });
    } else {
      logger.info(`✅ ${type.padEnd(15)} ${name.padEnd(25)} OK (${duration}ms)`);
    }
    
    debug.performanceMetrics.push({
      component: name,
      type,
      duration
    });
    
    return result;
  },

  showDashboard: () => {
    // System Overview
    console.log('\n┌───────────────────────────────────────────────────────┐');
    console.log(`│  ${'SYSTEM INITIALIZATION REPORT'.padEnd(51)}│`);
    console.log('├───────────────────────────────────────────────────────┤');
    
    // Components Status
    debug.components.forEach(comp => {
      const status = comp.valid ? '✓' : '✗';
      const color = comp.valid ? '\x1b[32m' : '\x1b[31m';
      console.log(`│  ${color}${status}\x1b[0m ${comp.type.padEnd(12)} ${comp.name.padEnd(20)} ${comp.duration.padEnd(8)}│`);
    });
    
    console.log('└───────────────────────────────────────────────────────┘\n');
    
    // Performance Summary
    console.log('📊 PERFORMANCE METRICS:');
    debug.performanceMetrics.forEach(metric => {
      console.log(`   ${metric.type.padEnd(15)} ${metric.component.padEnd(25)} ${metric.duration}ms`);
    });
    console.log('');
    
    // Failed Components
    const failed = debug.components.filter(c => !c.valid);
    if (failed.length > 0) {
      console.log('🛑 FAILED COMPONENTS:');
      failed.forEach(f => {
        console.log(`   ${f.type} ${f.name}:`);
        console.log(`   → Problem: ${f.error?.message || 'Unknown error'}`);
        if (f.error?.code) console.log(`   → Error Code: ${f.error.code}`);
        if (f.error?.stack) console.log(`   → Stack: ${f.error.stack.split('\n')[0]}`);
      });
      
      logger.systemStatus('DEGRADED', 'System initialized with errors', failed);
      process.exit(1);
    } else {
      logger.systemStatus('OPERATIONAL', 'System initialized successfully');
    }
  }
};

// ==================== VALIDATION UTILITIES ====================
const validate = {
  route: async (routeName) => {
    try {
      const module = await import(`./routes/${routeName}.js`);
      if (!module.default) {
        throw new Error('Missing default export', { 
          code: ERROR_CODES.ROUTER_INVALID_EXPORT 
        });
      }
      if (module.default.constructor?.name !== 'Router') {
        throw new Error(`Exported ${module.default.constructor?.name || 'unknown'} instead of Router`, {
          code: ERROR_CODES.ROUTER_TYPE_MISMATCH,
          expected: 'Router',
          received: module.default.constructor?.name
        });
      }
      return { valid: true };
    } catch (err) {
      return { 
        valid: false, 
        error: { 
          ...err, 
          code: err.code || ERROR_CODES.ROUTER_INVALID_EXPORT,
          file: `./routes/${routeName}.js`
        }
      };
    }
  },

  middleware: (mw) => {
    try {
      if (typeof mw !== 'function') {
        throw new Error('Not a function', {
          code: ERROR_CODES.MIDDLEWARE_INVALID,
          type: typeof mw
        });
      }
      if (mw.length < 3) {
        throw new Error('Invalid middleware signature', {
          code: ERROR_CODES.MIDDLEWARE_INVALID,
          receivedLength: mw.length
        });
      }
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err
      };
    }
  },

  cron: (job) => {
    try {
      if (!(job instanceof CronJob)) {
        throw new Error('Invalid CronJob instance', {
          code: ERROR_CODES.CRON_INVALID,
          received: job?.constructor?.name
        });
      }
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: err
      };
    }
  },

  env: (vars) => {
    const missing = vars.filter(v => !process.env[v]);
    if (missing.length) {
      return {
        valid: false,
        error: new Error(`Missing environment variables: ${missing.join(', ')}`, {
          code: ERROR_CODES.CONFIG_MISSING,
          missingVars: missing
        })
      };
    }
    return { valid: true };
  }
};

// ==================== TWILIO INITIALIZATION ====================
const initTwilio = () => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Missing Twilio credentials', {
        code: ERROR_CODES.CONFIG_MISSING
      });
    }
    return { 
      valid: true, 
      client: twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN),
      sid: process.env.TWILIO_ACCOUNT_SID 
    };
  } catch (err) {
    return {
      valid: false,
      error: err
    };
  }
};

// ==================== CLUSTER MODE ====================
if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  const numCPUs = os.cpus().length;
  logger.info(`🔄 Starting ${numCPUs} worker processes`);
  
  // Enhanced cluster management
  cluster.on('fork', (worker) => {
    logger.info(`Worker ${worker.process.pid} forked`);
  });

  cluster.on('listening', (worker, address) => {
    logger.info(`Worker ${worker.process.pid} listening on ${address.address}:${address.port}`);
  });

  cluster.on('disconnect', (worker) => {
    logger.warn(`Worker ${worker.process.pid} disconnected`);
  });

  cluster.on('exit', (worker, code, signal) => {
    const exitCode = worker.process.exitCode;
    logger.error(`Worker ${worker.process.pid} died (Code: ${exitCode}, Signal: ${signal})`);
    
    // Log worker exit reason
    if (exitCode === 0) {
      logger.info(`Worker ${worker.process.pid} exited normally`);
    } else {
      logger.error(`Worker ${worker.process.pid} crashed with code ${exitCode}`);
    }
    
    // Restart worker with backoff
    setTimeout(() => {
      logger.info(`Restarting worker ${worker.process.pid}`);
      cluster.fork();
    }, 1000);
  });

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Monitor system resources
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    logger.debug('Cluster resource usage:', {
      memory: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      cpu: `${(cpuUsage.user / 1000).toFixed(2)} ms`
    });
  }, MONITORING_CONFIG.HEALTH_CHECK_INTERVAL);

} else {
  const app = express();

  // ==================== ENVIRONMENT VALIDATION ====================
  const requiredVars = [
    'SESSION_SECRET', 
    'MONGODB_URI', 
    'JWT_ACCESS_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'EMAIL_SERVICE_API_KEY'
  ];
  
  const envResult = debug.track('config', 'environment', () => validate.env(requiredVars));
  if (!envResult.valid) process.exit(1);

  // ==================== DATABASE CONNECTION ====================
  const dbResult = debug.track('database', 'mongodb', () => db.connect());
  if (!dbResult.valid) process.exit(1);

  // ==================== TWILIO SERVICE ====================
  const twilioResult = debug.track('service', 'twilio', initTwilio);
  const twilioClient = twilioResult.valid ? twilioResult.client : null;
  if (twilioResult.valid) {
    app.locals.twilio = {
      client: twilioClient,
      sid: twilioResult.sid
    };
  }

  // ==================== MIDDLEWARE SETUP ====================
  const middlewares = [
    { 
      name: 'helmet', 
      fn: helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"]
          }
        },
        hsts: {
          maxAge: 63072000,
          includeSubDomains: true,
          preload: true
        }
      }) 
    },
    { 
      name: 'cors', 
      fn: cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      })
    },
    { 
      name: 'rate-limiter', 
      fn: rateLimit({ 
        windowMs: RATE_LIMIT_CONFIG.WINDOW_MS, 
        max: RATE_LIMIT_CONFIG.MAX_REQUESTS,
        handler: (req, res) => {
          res.status(429).json({
            error: 'Too many requests',
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED
          });
        }
      }) 
    },
    { 
      name: 'speed-limiter', 
      fn: slowDown({
        windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
        delayAfter: RATE_LIMIT_CONFIG.DELAY_AFTER,
        delayMs: RATE_LIMIT_CONFIG.DELAY_MS
      }) 
    },
    { name: 'compression', fn: compression() },
    { 
      name: 'response-time', 
      fn: responseTime((req, res, time) => {
        res.setHeader('Server-Timing', `total;dur=${time.toFixed(2)}`);
        logger.performance(`${req.method} ${req.path}`, time, {
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }) 
    },
    {
      name: 'request-validation',
      fn: (req, res, next) => {
        // Validate JSON content-type for POST/PUT
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          const contentType = req.headers['content-type'];
          if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({
              error: 'Unsupported Media Type',
              code: ERROR_CODES.INVALID_CONTENT_TYPE,
              required: 'application/json'
            });
          }
        }
        next();
      }
    }
  ];

  middlewares.forEach(mw => {
    const result = debug.track('middleware', mw.name, () => validate.middleware(mw.fn));
    if (result.valid) app.use(mw.fn);
  });

  // ==================== SESSION CONFIGURATION ====================
  const sessionResult = debug.track('session', 'mongo-store', async () => {
    try {
      const client = await db.getClient();
      const sessionMiddleware = session({
        secret: process.env.SESSION_SECRET,
        store: MongoStore.create({ 
          client, 
          dbName: process.env.MONGODB_NAME,
          ttl: SESSION_CONFIG.TTL,
          touchAfter: SESSION_CONFIG.TOUCH_INTERVAL
        }),
        cookie: { 
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict',
          maxAge: SESSION_CONFIG.TTL * 1000
        },
        resave: false,
        saveUninitialized: false,
        name: 'odinsoft.sid'
      });
      app.use(sessionMiddleware);
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: {
          ...err,
          code: ERROR_CODES.SESSION_INVALID
        }
      };
    }
  });

  // ==================== STATIC FILES ====================
  app.use('/public', express.static(path.join(__dirname, 'public')), (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=31536000');
    next();
  });

  // ==================== HEALTH CHECK ====================
  app.get('/health', (req, res) => {
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: db.isConnected() ? 'connected' : 'disconnected',
      memoryUsage: process.memoryUsage(),
      load: os.loadavg()
    };
    
    res.status(200).json(health);
  });

  // ==================== ROUTE INITIALIZATION ====================
  const routeDefinitions = [
    'apiStatusRoutes',
    'maintenanceRoutes',
    'notificationRoutes',
    'authRoutes',
    'adminRoutes',
    'usersRoutes',
    'gamesRoutes',
    'affiliatesRoutes',
    'bonusesRoutes',
    'contentRoutes',
    'smsRoutes',
    'docsRoutes'
  ];

  routeDefinitions.forEach(route => {
    debug.track('route', route, async () => {
      const result = await validate.route(route);
      if (result.valid) {
        const module = await import(`./routes/${route}.js`);
        const basePath = `/api/${route.replace('Routes', '')}`;
        app.use(basePath, module.default);
        
        // Log route registration
        logger.info(`Route registered: ${basePath}`);
      }
      return result;
    });
  });

  // ==================== CRON JOBS ====================
  const cronJobs = [
    { 
      name: 'maintenance-check', 
      schedule: '* * * * *', 
      job: () => {
        try {
          statusMonitor.checkScheduledMaintenance();
        } catch (err) {
          logger.logError('CRON', ERROR_CODES.CRON_FAILURE, err, {
            job: 'maintenance-check'
          });
        }
      }
    },
    { 
      name: 'db-backup', 
      schedule: '0 2 * * *', 
      job: () => {
        try {
          db.backupDatabase();
        } catch (err) {
          logger.logError('CRON', ERROR_CODES.CRON_FAILURE, err, {
            job: 'db-backup'
          });
        }
      }
    },
    {
      name: 'system-health',
      schedule: '*/5 * * * *',
      job: () => {
        try {
          const memoryUsage = process.memoryUsage();
          const cpuUsage = process.cpuUsage();
          
          logger.debug('System health check:', {
            memory: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            cpu: `${(cpuUsage.user / 1000).toFixed(2)} ms`,
            uptime: process.uptime()
          });
        } catch (err) {
          logger.logError('CRON', ERROR_CODES.CRON_FAILURE, err, {
            job: 'system-health'
          });
        }
      }
    }
  ];

  cronJobs.forEach(job => {
    debug.track('cron', job.name, () => {
      const cron = new CronJob(job.schedule, job.job);
      const result = validate.cron(cron);
      if (result.valid) {
        cron.start();
        logger.info(`Cron job started: ${job.name} (${job.schedule})`);
      }
      return result;
    });
  });

  // ==================== WEBSOCKET SERVER ====================
  debug.track('websocket', 'ws-server', () => {
    try {
      const wss = new WebSocketServer({ noServer: true });
      
      wss.on('connection', (ws) => {
        ws.id = uuidv4();
        logger.info(`WebSocket client connected: ${ws.id}`);
        
        ws.on('close', () => {
          logger.info(`WebSocket client disconnected: ${ws.id}`);
        });
        
        ws.on('error', (err) => {
          logger.logError('WEBSOCKET', ERROR_CODES.WEBSOCKET_ERROR, err, {
            clientId: ws.id
          });
        });
      });
      
      app.locals.wss = wss;
      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        error: {
          ...err,
          code: ERROR_CODES.WEBSOCKET_ERROR
        }
      };
    }
  });

  // ==================== ERROR HANDLERS ====================
  app.use((err, req, res, next) => {
    const errorId = uuidv4();
    
    logger.logError('UNHANDLED', ERROR_CODES.UNHANDLED_ERROR, err, {
      errorId,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: ERROR_CODES.UNHANDLED_ERROR,
      errorId
    });
  });

  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      code: ERROR_CODES.NOT_FOUND,
      path: req.path
    });
  });

  // ==================== FINAL STARTUP CHECK ====================
  debug.showDashboard();

  // ==================== SERVER STARTUP ====================
  const server = app.listen(SERVER_CONFIG.PORT, () => {
    logger.info(`🚀 Server running on port ${SERVER_CONFIG.PORT}`);
    logger.info(`🌐 Environment: ${SERVER_CONFIG.ENV}`);
    logger.info(`📅 Started at: ${new Date().toISOString()}`);
  });

  // WebSocket upgrade handling
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    
    if (pathname === '/ws') {
      app.locals.wss.handleUpgrade(request, socket, head, (ws) => {
        app.locals.wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Enhanced graceful shutdown
  const shutdown = async (signal) => {
    logger.warn(`🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      // Close all WebSocket connections
      if (app.locals.wss) {
        logger.info('Closing WebSocket server...');
        app.locals.wss.clients.forEach(client => {
          client.close(1001, 'Server shutting down');
        });
      }
      
      // Close database connection
      logger.info('Closing database connections...');
      await db.close();
      
      // Stop server
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
      
    } catch (err) {
      logger.fatal('Shutdown error', err);
      process.exit(1);
    }
  };

  // Process event handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  process.on('uncaughtException', (err) => {
    logger.fatal('Uncaught Exception', err);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  process.on('warning', (warning) => {
    logger.warn('Node.js warning:', warning);
  });
}