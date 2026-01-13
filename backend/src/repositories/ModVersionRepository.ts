import { pool } from '@config/database';
import { logger } from '@utils/logger';
import { DatabaseError } from '@utils/errors';

/**
 * Mod version entity
 */
export interface ModVersion {
  id: number;
  modId: number;
  versionNumber: string;
  changelog: string | null;
  filePath: string;
  fileSize: number;
  fileHash: string;
  isRecommended: boolean;
  downloadCount: number;
  createdAt: Date;
}

/**
 * Repository for mod version data access operations.
 */
export class ModVersionRepository {
  /**
   * Create a new mod version.
   * @param data Version creation data
   * @returns Created version
   */
  public async create(data: {
    modId: number;
    versionNumber: string;
    changelog?: string;
    filePath: string;
    fileSize: number;
    fileHash: string;
  }): Promise<ModVersion> {
    try {
      const result = await pool.query(
        `INSERT INTO mod_versions (mod_id, version_number, changelog, file_path, file_size, file_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          data.modId,
          data.versionNumber,
          data.changelog || null,
          data.filePath,
          data.fileSize,
          data.fileHash,
        ]
      );

      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create mod version');
      }

      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to create mod version', {
        modId: data.modId,
        versionNumber: data.versionNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to create mod version');
    }
  }

  /**
   * Find version by ID.
   * @param id Version ID
   * @returns Version or null
   */
  public async findById(id: number): Promise<ModVersion | null> {
    try {
      const result = await pool.query('SELECT * FROM mod_versions WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find version by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find version');
    }
  }

  /**
   * Find all versions for a mod.
   * @param modId Mod ID
   * @returns Array of versions
   */
  public async findByModId(modId: number): Promise<ModVersion[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM mod_versions WHERE mod_id = $1 ORDER BY created_at DESC',
        [modId]
      );
      return result.rows.map((row) => this.mapRow(row as unknown));
    } catch (error) {
      logger.error('Failed to find versions by mod ID', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find versions');
    }
  }

  /**
   * Find recommended version for a mod.
   * @param modId Mod ID
   * @returns Recommended version or null
   */
  public async findRecommendedByModId(modId: number): Promise<ModVersion | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM mod_versions WHERE mod_id = $1 AND is_recommended = TRUE LIMIT 1',
        [modId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0] as unknown);
    } catch (error) {
      logger.error('Failed to find recommended version', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to find version');
    }
  }

  /**
   * Set a version as recommended.
   * Only one version can be recommended per mod.
   * @param modId Mod ID
   * @param versionId Version ID to mark recommended
   */
  public async setRecommended(modId: number, versionId: number): Promise<void> {
    try {
      // Clear current recommended version
      await pool.query('UPDATE mod_versions SET is_recommended = FALSE WHERE mod_id = $1', [
        modId,
      ]);

      // Set new recommended version
      await pool.query(
        'UPDATE mod_versions SET is_recommended = TRUE WHERE id = $1 AND mod_id = $2',
        [versionId, modId]
      );
    } catch (error) {
      logger.error('Failed to set recommended version', {
        modId,
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to set recommended version');
    }
  }

  /**
   * Increment download count for version.
   * @param versionId Version ID
   */
  public async incrementDownloadCount(versionId: number): Promise<void> {
    try {
      await pool.query(
        'UPDATE mod_versions SET download_count = download_count + 1 WHERE id = $1',
        [versionId]
      );
    } catch (error) {
      logger.error('Failed to increment version download count', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to update download count');
    }
  }

  /**
   * Map database row to ModVersion object
   */
  private mapRow(row: unknown): ModVersion {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as number,
      modId: r.mod_id as number,
      versionNumber: r.version_number as string,
      changelog: (r.changelog as string | null) || null,
      filePath: r.file_path as string,
      fileSize: r.file_size as number,
      fileHash: r.file_hash as string,
      isRecommended: r.is_recommended as boolean,
      downloadCount: r.download_count as number,
      createdAt: new Date(r.created_at as string),
    };
  }
}
