import { createApp } from './app';
import { env } from '@config/environment';
import { logger } from '@utils/logger';
import { verifyConnection, closePool } from '@config/database';

/**
 * Server entry point.
 * Initializes the Express app and starts listening on the configured port.
 */
async function startServer(): Promise<void> {
  try {
    // Verify database connection
    logger.info('Verifying database connection...');
    await verifyConnection();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(env.PORT, () => {
      logger.info(`Server is running`, {
        port: env.PORT,
        environment: env.NODE_ENV,
        apiBaseUrl: env.API_BASE_URL,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      server.close(() => {
        logger.info('HTTP server closed');
      });

      await closePool();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

startServer();
