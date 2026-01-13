import fs from 'fs';
import path from 'path';
import { pool } from '../src/config/database';
import { logger } from '../src/utils/logger';

/**
 * Database migration script with tracking.
 * Reads all SQL migration files and executes only those not yet run.
 * Tracks executed migrations in the migrations table.
 * Usage: npm run migrate
 */
async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, '../src/database/migrations');

  try {
    // Ensure migrations table exists (run 000 migration first if needed)
    const migrationTableSQL = fs.readFileSync(
      path.join(migrationsDir, '000_create_migrations_table.sql'),
      'utf-8'
    );

    try {
      await pool.query(migrationTableSQL);
      logger.info('✓ Migrations table ready');
    } catch (error) {
      // Table might already exist, which is fine
      if (
        error instanceof Error &&
        !error.message.includes('already exists')
      ) {
        logger.warn('Migration table check:', error.message);
      }
    }

    // Read all migration files (except 000)
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql') && !file.startsWith('000_'))
      .sort();

    if (files.length === 0) {
      logger.warn('No migration files found');
      return;
    }

    logger.info(`Found ${files.length} migration files`);

    // Get list of already executed migrations
    const executedResult = await pool.query(
      'SELECT name FROM migrations ORDER BY executed_at'
    );
    const executedMigrations = new Set(executedResult.rows.map((r) => r.name));

    let executedCount = 0;
    let skippedCount = 0;

    // Execute only new migrations
    for (const file of files) {
      if (executedMigrations.has(file)) {
        logger.info(`⊘ ${file} (already executed)`);
        skippedCount++;
        continue;
      }

      logger.info(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      try {
        await pool.query(sql);

        // Record migration as executed
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);

        logger.info(`✓ ${file} completed successfully`);
        executedCount++;
      } catch (error) {
        logger.error(`✗ ${file} failed`, {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    logger.info(
      `All migrations completed: ${executedCount} new, ${skippedCount} already executed`
    );
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
migrate();
