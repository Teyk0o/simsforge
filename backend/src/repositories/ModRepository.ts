import { pool } from '@config/database';
import { logger } from '@utils/logger';
import { DatabaseError, NotFoundError } from '@utils/errors';

/**
 * Mod entity
 */
export interface Mod {
  id: number;
  creatorId: number;
  title: string;
  slug: string;
  description: string | null;
  status: 'draft' | 'published' | 'hidden' | 'removed';
  accessType: 'free' | 'early_access';
  earlyAccessPrice: number | null;
  downloadCount: number;
  viewCount: number;
  featured: boolean;
  featuredPriority: number | null;
  isFlagged: boolean;
  flaggedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

/**
 * Repository for mod data access operations.
 */
export class ModRepository {
  /**
   * Create a new mod.
   * @param data Mod creation data
   * @returns Created mod
   */
  public async create(data: {
    creatorId: number;
    title: string;
    slug: string;
    description?: string;
    accessType?: 'free' | 'early_access';
    earlyAccessPrice?: number;
  }): Promise<Mod> {
    try {
      const result = await pool.query(
        `INSERT INTO mods (creator_id, title, slug, description, access_type, early_access_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          data.creatorId,
          data.title,
          data.slug,
          data.description || null,
          data.accessType || 'free',
          data.earlyAccessPrice || null,
          'draft',
        ]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create mod');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to create mod', {
        creatorId: data.creatorId,
        slug: data.slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to create mod');
    }
  }

  /**
   * Find mod by ID.
   * @param id Mod ID
   * @returns Mod or null
   */
  public async findById(id: number): Promise<Mod | null> {
    try {
      const result = await pool.query('SELECT * FROM mods WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find mod by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find mod');
    }
  }

  /**
   * Find mod by slug.
   * @param slug Mod slug
   * @returns Mod or null
   */
  public async findBySlug(slug: string): Promise<Mod | null> {
    try {
      const result = await pool.query('SELECT * FROM mods WHERE slug = $1', [slug]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find mod by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find mod');
    }
  }

  /**
   * Find mods by creator ID.
   * @param creatorId Creator ID
   * @param status Optional status filter
   * @returns Array of mods
   */
  public async findByCreatorId(
    creatorId: number,
    status?: 'draft' | 'published' | 'hidden' | 'removed'
  ): Promise<Mod[]> {
    try {
      let query = 'SELECT * FROM mods WHERE creator_id = $1';
      const params: unknown[] = [creatorId];

      if (status) {
        query += ' AND status = $2';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, params);
      return result.rows.map((row) => this.mapRow(row as unknown));
    } catch (error) {
      logger.error('Failed to find mods by creator ID', {
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find mods');
    }
  }

  /**
   * Find published mods with pagination and filters.
   * @param limit Items per page
   * @param offset Pagination offset
   * @param filters Optional filters
   * @returns Mods and total count
   */
  public async findPublished(
    limit: number = 20,
    offset: number = 0,
    filters?: {
      categoryIds?: number[];
      tagIds?: number[];
      search?: string;
      sortBy?: 'downloads' | 'date' | 'trending';
    }
  ): Promise<{ mods: Mod[]; total: number }> {
    try {
      let query = 'SELECT DISTINCT m.* FROM mods m';
      const params: unknown[] = [];
      let paramIndex = 1;

      // Add joins for categories and tags if filtering
      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        query += ' LEFT JOIN mod_categories mc ON m.id = mc.mod_id';
      }
      if (filters?.tagIds && filters.tagIds.length > 0) {
        query += ' LEFT JOIN mod_tags mt ON m.id = mt.mod_id';
      }

      query += ' WHERE m.status = $' + paramIndex++;
      params.push('published');

      // Category filter
      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        query += ' AND mc.category_id = ANY($' + paramIndex++ + ')';
        params.push(filters.categoryIds);
      }

      // Tag filter
      if (filters?.tagIds && filters.tagIds.length > 0) {
        query += ' AND mt.tag_id = ANY($' + paramIndex++ + ')';
        params.push(filters.tagIds);
      }

      // Search filter
      if (filters?.search) {
        query +=
          ' AND (m.title ILIKE $' + paramIndex + ' OR m.description ILIKE $' + paramIndex + ')';
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Sorting
      switch (filters?.sortBy) {
        case 'downloads':
          query += ' ORDER BY m.download_count DESC';
          break;
        case 'trending':
          query +=
            ' ORDER BY (m.download_count * 0.7 + m.view_count * 0.3 / GREATEST(EXTRACT(EPOCH FROM (NOW() - m.published_at))/86400, 1)) DESC';
          break;
        case 'date':
        default:
          query += ' ORDER BY m.published_at DESC';
      }

      // Pagination
      query += ' LIMIT $' + paramIndex++ + ' OFFSET $' + paramIndex;
      params.push(limit);
      params.push(offset);

      const result = await pool.query(query, params);
      const mods = result.rows.map((row) => this.mapRow(row as unknown));

      // Get total count
      let countQuery = 'SELECT COUNT(DISTINCT m.id) as count FROM mods m';
      const countParams: unknown[] = [];
      let countParamIndex = 1;

      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        countQuery += ' LEFT JOIN mod_categories mc ON m.id = mc.mod_id';
      }
      if (filters?.tagIds && filters.tagIds.length > 0) {
        countQuery += ' LEFT JOIN mod_tags mt ON m.id = mt.mod_id';
      }

      countQuery += ' WHERE m.status = $' + countParamIndex++;
      countParams.push('published');

      if (filters?.categoryIds && filters.categoryIds.length > 0) {
        countQuery += ' AND mc.category_id = ANY($' + countParamIndex++ + ')';
        countParams.push(filters.categoryIds);
      }

      if (filters?.tagIds && filters.tagIds.length > 0) {
        countQuery += ' AND mt.tag_id = ANY($' + countParamIndex++ + ')';
        countParams.push(filters.tagIds);
      }

      if (filters?.search) {
        countQuery +=
          ' AND (m.title ILIKE $' +
          countParamIndex +
          ' OR m.description ILIKE $' +
          countParamIndex +
          ')';
        countParams.push(`%${filters.search}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count) || 0;

      return { mods, total };
    } catch (error) {
      logger.error('Failed to find published mods', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find mods');
    }
  }

  /**
   * Update mod by ID.
   * @param id Mod ID
   * @param data Partial update data
   * @returns Updated mod
   */
  public async updateById(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      accessType: 'free' | 'early_access';
      earlyAccessPrice: number | null;
      status: 'draft' | 'published' | 'hidden' | 'removed';
    }>
  ): Promise<Mod> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        fields.push(`title = $${paramIndex++}`);
        values.push(data.title);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.accessType !== undefined) {
        fields.push(`access_type = $${paramIndex++}`);
        values.push(data.accessType);
      }
      if (data.earlyAccessPrice !== undefined) {
        fields.push(`early_access_price = $${paramIndex++}`);
        values.push(data.earlyAccessPrice);
      }
      if (data.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(data.status);

        // Set published_at if status is published
        if (data.status === 'published') {
          fields.push(`published_at = NOW()`);
        }
      }

      if (fields.length === 0) {
        return this.findById(id).then((mod) => {
          if (!mod) throw new NotFoundError('Mod');
          return mod;
        });
      }

      values.push(id);
      const query = `UPDATE mods SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new NotFoundError('Mod');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to update mod', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (DatabaseError || NotFoundError)
        ? error
        : new DatabaseError('Failed to update mod');
    }
  }

  /**
   * Increment download count.
   * @param id Mod ID
   */
  public async incrementDownloadCount(id: number): Promise<void> {
    try {
      await pool.query('UPDATE mods SET download_count = download_count + 1 WHERE id = $1', [id]);
    } catch (error) {
      logger.error('Failed to increment download count', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to update download count');
    }
  }

  /**
   * Map database row to Mod object
   */
  private mapRow(row: unknown): Mod {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      creatorId: r.creator_id as number,
      title: r.title as string,
      slug: r.slug as string,
      description: (r.description as string | null) || null,
      status: r.status as 'draft' | 'published' | 'hidden' | 'removed',
      accessType: r.access_type as 'free' | 'early_access',
      earlyAccessPrice: r.early_access_price ? parseFloat(r.early_access_price as string) : null,
      downloadCount: r.download_count as number,
      viewCount: r.view_count as number,
      featured: r.featured as boolean,
      featuredPriority: (r.featured_priority as number | null) || null,
      isFlagged: r.is_flagged as boolean,
      flaggedReason: (r.flagged_reason as string | null) || null,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
      publishedAt: r.published_at ? new Date(r.published_at as string) : null,
    };
  }
}
