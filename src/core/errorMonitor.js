import winston from 'winston';
import { AlertManager } from '../utils/alertManager.js';
import { getErrorByCode } from './errorCodes.js';

class ErrorMonitor {
  constructor() {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.File({ 
          filename: `logs/errors/${new Date().toISOString().split('T')[0]}.log`,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ]
    });
  }

  track(error, context = {}) {
    const errorId = `ERR-${Date.now()}`;
    const origin = this.parseOrigin(error.stack);
    
    const errorData = {
      id: errorId,
      timestamp: new Date(),
      message: error.message,
      code: error.code || 'UNKNOWN',
      origin,
      context
    };

    // Log to file
    this.logger.error(errorData);

    // Send critical alerts
    if (this.isCritical(error)) {
      AlertManager.trigger(error.code || 'UNKNOWN', {
        errorId,
        origin,
        ...context
      });
    }

    return errorId;
  }

  isCritical(error) {
    const errorInfo = getErrorByCode(error.code);
    if (errorInfo && errorInfo.severity === 'CRITICAL') {
      return true;
    }
    // Fallback to stack trace check for non-catalog errors
    return error.stack && error.stack.includes('node_modules') === false;
  }

  parseOrigin(stack) {
    return stack?.split('\n')[1]?.trim() || 'unknown-origin';
  }
}

export const monitor = new ErrorMonitor();