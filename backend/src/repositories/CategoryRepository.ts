import { pool } from '@config/database';
import { logger } from '@utils/logger';
import { DatabaseError } from '@utils/errors';

/**
 * Category entity
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  displayOrder: number;
  createdAt: Date;
}

/**
 * Repository for category data access operations.
 */
export class CategoryRepository {
  /**
   * Find all categories.
   * @returns Array of categories
   */
  public async findAll(): Promise<Category[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM categories ORDER BY display_order ASC'
      );
      return result.rows.map((row) => this.mapRow(row as unknown));
    } catch (error) {
      logger.error('Failed to find all categories', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find categories');
    }
  }

  /**
   * Find category by ID.
   * @param id Category ID
   * @returns Category or null
   */
  public async findById(id: number): Promise<Category | null> {
    try {
      const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find category by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find category');
    }
  }

  /**
   * Find category by slug.
   * @param slug Category slug
   * @returns Category or null
   */
  public async findBySlug(slug: string): Promise<Category | null> {
    try {
      const result = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find category by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find category');
    }
  }

  /**
   * Map database row to Category object
   */
  private mapRow(row: unknown): Category {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      name: r.name as string,
      slug: r.slug as string,
      description: (r.description as string | null) || null,
      iconUrl: (r.icon_url as string | null) || null,
      displayOrder: r.display_order as number,
      createdAt: new Date(r.created_at as string),
    };
  }
}
