import { pool } from '@config/database';
import { logger } from '@utils/logger';
import { DatabaseError } from '@utils/errors';

/**
 * Tag entity
 */
export interface Tag {
  id: number;
  name: string;
  slug: string;
  type: 'general' | 'expansion_pack' | 'game_pack' | 'stuff_pack';
}

/**
 * Repository for tag data access operations.
 */
export class TagRepository {
  /**
   * Find all tags.
   * @param type Optional tag type filter
   * @returns Array of tags
   */
  public async findAll(type?: string): Promise<Tag[]> {
    try {
      let query = 'SELECT * FROM tags';
      const params: unknown[] = [];

      if (type) {
        query += ' WHERE type = $1';
        params.push(type);
      }

      query += ' ORDER BY name ASC';

      const result = await pool.query(query, params);
      return result.rows.map((row) => this.mapRow(row as unknown));
    } catch (error) {
      logger.error('Failed to find all tags', {
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find tags');
    }
  }

  /**
   * Find tag by ID.
   * @param id Tag ID
   * @returns Tag or null
   */
  public async findById(id: number): Promise<Tag | null> {
    try {
      const result = await pool.query('SELECT * FROM tags WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find tag by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find tag');
    }
  }

  /**
   * Find tag by slug.
   * @param slug Tag slug
   * @returns Tag or null
   */
  public async findBySlug(slug: string): Promise<Tag | null> {
    try {
      const result = await pool.query('SELECT * FROM tags WHERE slug = $1', [slug]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find tag by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find tag');
    }
  }

  /**
   * Find multiple tags by IDs.
   * @param ids Array of tag IDs
   * @returns Array of tags
   */
  public async findByIds(ids: number[]): Promise<Tag[]> {
    try {
      if (ids.length === 0) return [];
      const result = await pool.query('SELECT * FROM tags WHERE id = ANY($1) ORDER BY name ASC', [ids]);
      return result.rows.map((row) => this.mapRow(row as unknown));
    } catch (error) {
      logger.error('Failed to find tags by IDs', {
        count: ids.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find tags');
    }
  }

  /**
   * Map database row to Tag object
   */
  private mapRow(row: unknown): Tag {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      name: r.name as string,
      slug: r.slug as string,
      type: r.type as 'general' | 'expansion_pack' | 'game_pack' | 'stuff_pack',
    };
  }
}
