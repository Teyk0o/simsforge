import { Pool, PoolConfig } from 'pg';
import { env } from '@config/environment';
import { logger } from '@utils/logger';

/**
 * PostgreSQL connection pool configuration.
 * Creates a pool of database connections for efficient resource usage.
 */
const poolConfig: PoolConfig = {
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  database: env.DATABASE_NAME,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  max: 20, // Maximum connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Connection attempt timeout
};

/**
 * Singleton PostgreSQL connection pool instance.
 * Use this pool for all database queries.
 */
export const pool = new Pool(poolConfig);

/**
 * Handle pool errors
 */
pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', {
    message: err.message,
    stack: err.stack,
  });
});

/**
 * Query helper function with logging
 * @param text SQL query string with $1, $2 placeholders
 * @param values Parameter values to safely inject into query
 * @returns Promise resolving to query result
 */
export async function query(
  text: string,
  values?: unknown[]
): Promise<unknown> {
  const start = Date.now();
  try {
    const result = await pool.query(text, values);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn('Slow query detected', {
        text,
        duration,
        rowCount: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    logger.error('Database query error', {
      text,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Close database connection pool.
 * Call this on application shutdown.
 */
export async function closePool(): Promise<void> {
  await pool.end();
  logger.info('Database connection pool closed');
}

/**
 * Verify database connection is working
 */
export async function verifyConnection(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    logger.info('Database connection verified', {
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    logger.error('Failed to verify database connection', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
