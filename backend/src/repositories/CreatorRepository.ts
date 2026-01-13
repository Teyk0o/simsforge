import { pool } from '@config/database';
import { logger } from '@utils/logger';
import { DatabaseError, NotFoundError, ConflictError } from '@utils/errors';

/**
 * Creator profile entity
 */
export interface CreatorProfile {
  id: number;
  userId: number;
  displayName: string;
  bio: string | null;
  patreonUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  websiteUrl: string | null;
  totalDownloads: number;
  totalRevenue: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for creator profile data access operations.
 */
export class CreatorRepository {
  /**
   * Create a new creator profile for a user.
   * @param data Creator profile data
   * @returns Created creator profile
   */
  public async create(data: {
    userId: number;
    displayName: string;
    bio?: string;
  }): Promise<CreatorProfile> {
    try {
      const result = await pool.query(
        `INSERT INTO creator_profiles (user_id, display_name, bio)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.userId, data.displayName, data.bio || null]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create creator profile');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('duplicate key value violates unique constraint')
      ) {
        throw new ConflictError('User already has a creator profile');
      }
      logger.error('Failed to create creator profile', {
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to create creator profile');
    }
  }

  /**
   * Find creator profile by user ID.
   * @param userId User ID
   * @returns Creator profile or null
   */
  public async findByUserId(userId: number): Promise<CreatorProfile | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM creator_profiles WHERE user_id = $1',
        [userId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find creator profile by user ID', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find creator profile');
    }
  }

  /**
   * Find creator profile by ID.
   * @param id Creator profile ID
   * @returns Creator profile or null
   */
  public async findById(id: number): Promise<CreatorProfile | null> {
    try {
      const result = await pool.query('SELECT * FROM creator_profiles WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find creator profile by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find creator profile');
    }
  }

  /**
   * Update creator profile.
   * @param userId User ID
   * @param data Partial update data
   * @returns Updated creator profile
   */
  public async updateByUserId(
    userId: number,
    data: Partial<{
      displayName: string;
      bio: string | null;
      patreonUrl: string | null;
      twitterUrl: string | null;
      discordUrl: string | null;
      websiteUrl: string | null;
    }>
  ): Promise<CreatorProfile> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.displayName !== undefined) {
        fields.push(`display_name = $${paramIndex++}`);
        values.push(data.displayName);
      }
      if (data.bio !== undefined) {
        fields.push(`bio = $${paramIndex++}`);
        values.push(data.bio);
      }
      if (data.patreonUrl !== undefined) {
        fields.push(`patreon_url = $${paramIndex++}`);
        values.push(data.patreonUrl);
      }
      if (data.twitterUrl !== undefined) {
        fields.push(`twitter_url = $${paramIndex++}`);
        values.push(data.twitterUrl);
      }
      if (data.discordUrl !== undefined) {
        fields.push(`discord_url = $${paramIndex++}`);
        values.push(data.discordUrl);
      }
      if (data.websiteUrl !== undefined) {
        fields.push(`website_url = $${paramIndex++}`);
        values.push(data.websiteUrl);
      }

      if (fields.length === 0) {
        return this.findByUserId(userId).then((profile) => {
          if (!profile) throw new NotFoundError('Creator profile');
          return profile;
        });
      }

      values.push(userId);
      const query = `UPDATE creator_profiles SET ${fields.join(', ')}
                     WHERE user_id = $${paramIndex} RETURNING *`;

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        throw new NotFoundError('Creator profile');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to update creator profile', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (DatabaseError || NotFoundError || ConflictError)
        ? error
        : new DatabaseError('Failed to update creator profile');
    }
  }

  /**
   * Check if user has creator profile.
   * @param userId User ID
   * @returns True if creator profile exists
   */
  public async hasCreatorProfile(userId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT EXISTS(SELECT 1 FROM creator_profiles WHERE user_id = $1)',
        [userId]
      );
      return (result.rows[0].exists as boolean) || false;
    } catch (error) {
      logger.error('Failed to check creator profile existence', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to check creator profile');
    }
  }

  /**
   * Map database row to CreatorProfile object
   */
  private mapRow(row: unknown): CreatorProfile {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      userId: r.user_id as number,
      displayName: r.display_name as string,
      bio: (r.bio as string | null) || null,
      patreonUrl: (r.patreon_url as string | null) || null,
      twitterUrl: (r.twitter_url as string | null) || null,
      discordUrl: (r.discord_url as string | null) || null,
      websiteUrl: (r.website_url as string | null) || null,
      totalDownloads: r.total_downloads as number,
      totalRevenue: parseFloat(r.total_revenue as string),
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
    };
  }
}
