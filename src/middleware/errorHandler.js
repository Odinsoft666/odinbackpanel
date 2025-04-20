import { logger } from '../utils/logger.js';
import { ErrorCatalog } from '../core/errorCodes.js';
import { AlertManager } from '../utils/alertManager.js';
import { monitor } from '../core/errorMonitor.js';
import { statusMonitor } from '../core/statusMonitor.js';

export const errorHandler = (err, req, res, next) => {
  const errorType = Object.values(ErrorCatalog).find(e => 
    err.message.includes(e.code) || err.code === e.code
  ) || ErrorCatalog.SER_101;

  // Log incident to status monitor
  statusMonitor.logIncident({
    code: errorType.code,
    message: err.message,
    severity: errorType.severity || 'HIGH',
    stack: err.stack
  }, { service: 'api' });

  // Track error with context
  const errorId = monitor.track(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?._id
  });

  // Structured logging
  logger.error({
    errorId,
    code: errorType.code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?._id,
    stack: err.stack,
    origin: parseStackOrigin(err.stack),
    metadata: err.metadata || {}
  });

  // Alert critical issues
  if (errorType.severity === 'CRITICAL') {
    AlertManager.trigger(errorType.code, {
      errorId,
      route: req.path,
      userId: req.user?._id,
      origin: parseStackOrigin(err.stack)
    });
  }

  // Client response
  res.status(getHttpStatus(errorType)).json({
    error: errorType.message,
    code: errorType.code,
    reference: errorId,
    origin: process.env.NODE_ENV === 'development' ? parseStackOrigin(err.stack) : undefined,
    solution: process.env.NODE_ENV === 'development' ? errorType.solution : undefined
  });
};

function getHttpStatus(errorType) {
  const codePrefix = errorType.code.split('_')[0];
  const statusMap = {
    SER: 500,
    DB: 503,
    AUTH: 401,
    GAME: 400,
    PAY: 402,
    CONFIG: 500,
    USER: 400,
    TX: 402
  };
  return statusMap[codePrefix] || 500;
}

function parseStackOrigin(stack) {
  if (!stack) return 'Unknown origin';
  const stackLines = stack.split('\n');
  // Find first non-node_modules line
  const relevantLine = stackLines.find(line => 
    !line.includes('node_modules') && 
    !line.includes('internal/')
  );
  return relevantLine ? relevantLine.trim() : stackLines[1].trim();
}