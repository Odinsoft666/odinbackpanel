import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

export const createRotatingLogger = (filename, level = 'info') => {
  return winston.createLogger({
    level,
    format: logFormat,
    transports: [
      new DailyRotateFile({
        filename: path.join('logs', `${filename}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d'
      })
    ]
  });
};