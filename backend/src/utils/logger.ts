import winston from 'winston';
import { env } from '@config/environment';

/**
 * Winston logger configuration for structured logging.
 * Logs to files in production, console in development.
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Create transport for error logs
 */
const errorTransport = new winston.transports.File({
  filename: 'logs/error.log',
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  format: logFormat,
});

/**
 * Create transport for combined logs
 */
const combinedTransport = new winston.transports.File({
  filename: 'logs/combined.log',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  format: logFormat,
});

/**
 * Create transports array based on environment
 */
const transports: winston.transport[] = [
  errorTransport,
  combinedTransport,
];

// Add console transport in development
if (env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? `\n${JSON.stringify(meta, null, 2)}`
              : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          }
        )
      ),
    })
  );
}

/**
 * Singleton Winston logger instance
 */
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
    }),
  ],
});

/**
 * Handle uncaught rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

export default logger;
