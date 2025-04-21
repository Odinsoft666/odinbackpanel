import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, align } = winston.format;

// Define custom levels including fatal
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

// Define colors for each level
winston.addColors({
  fatal: 'red',
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
});

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
});

const transports = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      logFormat
    )
  }),
  new DailyRotateFile({
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: combine(logFormat)
  })
];

const exceptionHandlers = [
  new DailyRotateFile({
    filename: 'logs/exceptions-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true
  })
];

const rejectionHandlers = [
  new DailyRotateFile({
    filename: 'logs/rejections-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true
  })
];

// Create logger instance
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    logFormat
  ),
  transports,
  exceptionHandlers,
  rejectionHandlers
});

// Add stream for morgan logging
logger.stream = {
  write: (message) => logger.info(message.trim())
};

// Add fatal method with error stack support
logger.fatal = (message, error = {}) => {
  logger.log({
    level: 'fatal',
    message: typeof message === 'object' ? JSON.stringify(message) : message,
    stack: error.stack
  });
};

// Single export at the end
export { logger };