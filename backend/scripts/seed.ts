import { pool } from '../src/config/database';
import { logger } from '../src/utils/logger';

/**
 * Database seed script.
 * Seeds initial data into the database (categories already seeded in migration).
 * Usage: npm run seed
 */
async function seed(): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    // Verify migrations have been run
    const usersCheck = await pool.query('SELECT 1 FROM users LIMIT 1');
    logger.info('Database schema verified');

    // Seed default tags
    const defaultTags = [
      { name: 'Expansion Pack: High School Years', slug: 'ep-high-school', type: 'expansion_pack' },
      { name: 'Expansion Pack: Growing Together', slug: 'ep-growing', type: 'expansion_pack' },
      { name: 'Game Pack: Werewolves', slug: 'gp-werewolves', type: 'game_pack' },
      { name: 'Game Pack: Horse Ranch', slug: 'gp-horses', type: 'game_pack' },
      { name: 'Stuff Pack: Eco Lifestyle', slug: 'sp-eco', type: 'stuff_pack' },
      { name: 'Requires: MC Command Center', slug: 'requires-mccc', type: 'general' },
      { name: 'Requires: UI Cheats', slug: 'requires-ui-cheats', type: 'general' },
      { name: 'Standalone', slug: 'standalone', type: 'general' },
      { name: 'Slice of Life', slug: 'slice-of-life', type: 'general' },
      { name: 'Realistic', slug: 'realistic', type: 'general' },
    ];

    for (const tag of defaultTags) {
      const result = await pool.query(
        'INSERT INTO tags (name, slug, type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [tag.name, tag.slug, tag.type]
      );
      if ((result as any).rowCount > 0) {
        logger.info(`Seeded tag: ${tag.name}`);
      }
    }

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding
seed();
