import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from '@config/environment';
import { errorMiddleware } from '@middleware/errorMiddleware';
import { createApiRoutes } from '@routes/index';
import { apiLimiter } from '@middleware/rateLimitMiddleware';

/**
 * Create and configure Express application.
 * Sets up all middleware and global configurations.
 */
export function createApp(): Express {
  const app = express();

  // Trust proxy (for deployment behind reverse proxies)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());

  // CORS middleware
  const allowedOrigins = env.ALLOWED_ORIGINS;
  const allowAllOrigins = allowedOrigins.includes('*');

  app.use(
    cors({
      origin: (origin, callback) => {
        if (allowAllOrigins || !origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Compression middleware
  app.use(compression());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // API version info endpoint
  app.get('/api/v1/info', (_req, res) => {
    res.status(200).json({
      name: 'SimsForge Backend API',
      version: '1.0.0',
      status: 'running',
    });
  });

  // Apply global rate limiter to all routes
  app.use('/api', apiLimiter);

  // Register API routes
  app.use('/api/v1', createApiRoutes());

  // 404 handler - must be before error middleware
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: `Route ${req.method} ${req.path} not found`,
        statusCode: 404,
      },
    });
  });

  // Global error handler - must be last
  app.use(errorMiddleware);

  return app;
}

export default createApp;
