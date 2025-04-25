import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ERROR_TYPES, ERROR_CODES, ERROR_SEVERITY, ERROR_CATEGORIES } from '../config/constants.js';

const { combine, timestamp, printf, colorize, align, errors } = winston.format;

// Enhanced logging levels
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
  audit: 6,
  security: 7
};

// Extended color scheme
winston.addColors({
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
  trace: 'magenta',
  audit: 'cyan',
  security: 'white'
});

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
  
  if (stack) {
    log += `\n${stack}`;
  }
  
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

const transports = [
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      align(),
      errors({ stack: true }),
      logFormat
    ),
    handleExceptions: true,
    handleRejections: true
  }),
  new DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '50m',
    maxFiles: '14d',
    format: combine(
      timestamp(),
      errors({ stack: true }),
      logFormat
    )
  }),
  new DailyRotateFile({
    level: 'error',
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d'
  }),
  new DailyRotateFile({
    level: 'audit',
    filename: 'logs/audit-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxFiles: '90d'
  })
];

const exceptionHandlers = [
  new DailyRotateFile({
    filename: 'logs/exceptions-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m'
  })
];

const rejectionHandlers = [
  new DailyRotateFile({
    filename: 'logs/rejections-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m'
  })
];

// Create logger instance
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    align(),
    logFormat
  ),
  transports,
  exceptionHandlers,
  rejectionHandlers,
  exitOnError: false
});

// Enhanced stream for morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Extended logging methods
logger.fatal = (message, error = {}, metadata = {}) => {
  const { code = ERROR_CODES.UNHANDLED_ERROR, severity = ERROR_SEVERITY.CRITICAL } = error;
  
  logger.log({
    level: 'fatal',
    message: typeof message === 'object' ? JSON.stringify(message) : message,
    stack: error.stack,
    code,
    severity,
    category: ERROR_CATEGORIES.INFRASTRUCTURE,
    ...metadata
  });
  
  // Critical errors should trigger alerts
  if (severity === ERROR_SEVERITY.CRITICAL) {
    // TODO: Integrate with alerting system
  }
};

logger.audit = (action, user, resource, status, metadata = {}) => {
  logger.log({
    level: 'audit',
    message: `AUDIT: ${action}`,
    user,
    resource,
    status,
    ...metadata
  });
};

logger.security = (event, threatLevel, details) => {
  logger.log({
    level: 'security',
    message: `SECURITY: ${event}`,
    threatLevel,
    ...details
  });
};

// Enhanced route debugging
logger.debugRoute = (routeName, result) => {
  const emoji = result.valid ? '✅' : '❌';
  const details = result.valid ? 'Valid Router' : `Error: ${result.error?.message || 'Unknown'}`;
  
  logger.debug(`${emoji} ${routeName.padEnd(25)} ${details}`, {
    type: 'ROUTE_DEBUG',
    route: routeName,
    ...(result.error ? { error: result.error } : {})
  });
};

// Comprehensive error logging
logger.logError = (errorType, errorCode, error, context = {}) => {
  const errorData = {
    level: 'error',
    type: errorType,
    code: errorCode,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  if (error.code) {
    errorData.originalErrorCode = error.code;
  }
  
  if (error.response) {
    errorData.response = {
      status: error.response.status,
      data: error.response.data
    };
  }
  
  logger.log(errorData);
  
  // Special formatting for different error types
  switch(errorType) {
    case 'DATABASE':
      logger.databaseError(error, context);
      break;
    case 'ROUTER':
      logger.routerError(error, context);
      break;
    case 'AUTH':
      logger.security(`Authentication Error: ${error.message}`, 'high', context);
      break;
  }
};

// Specialized error formatters
logger.databaseError = (error, context) => {
  console.error('\n┌───────────────────────────────────────────────────────┐');
  console.error(`│  ${'DATABASE FAILURE'.padEnd(51)}│`);
  console.error('├───────────────────────────────────────────────────────┤');
  console.error(`│  Operation: ${(context.operation || 'unknown').padEnd(40)}│`);
  console.error(`│  Collection: ${(context.collection || 'N/A').padEnd(39)}│`);
  console.error(`│  Error: ${error.message.padEnd(44)}│`);
  if (error.code) {
    console.error(`│  Code: ${error.code.padEnd(45)}│`);
  }
  console.error('└───────────────────────────────────────────────────────┘\n');
};

logger.routerError = (error, context) => {
  console.error('\n┌───────────────────────────────────────────────────────┐');
  console.error(`│  ${'ROUTER CONFIGURATION FAILURE'.padEnd(51)}│`);
  console.error('├───────────────────────────────────────────────────────┤');
  console.error(`│  File: ${(context.file || 'unknown').padEnd(44)}│`);
  console.error(`│  Problem: ${(error.message || 'unknown').padEnd(42)}│`);
  if (context.expected) {
    console.error(`│  Expected: ${context.expected.padEnd(41)}│`);
  }
  if (context.received) {
    console.error(`│  Received: ${context.received.padEnd(41)}│`);
  }
  console.error('└───────────────────────────────────────────────────────┘\n');
};

// Performance logging
logger.performance = (operation, duration, metadata = {}) => {
  logger.debug(`PERF: ${operation} took ${duration}ms`, {
    type: 'PERFORMANCE',
    operation,
    duration,
    ...metadata
  });
};

// System status logging
logger.systemStatus = (status, message, components = []) => {
  logger.info(`SYSTEM STATUS: ${status} - ${message}`, {
    type: 'SYSTEM_STATUS',
    status,
    components
  });
};

export { logger };