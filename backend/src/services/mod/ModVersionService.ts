import { ModVersionRepository, ModVersion } from '@repositories/ModVersionRepository';
import { ModRepository } from '@repositories/ModRepository';
import { logger } from '@utils/logger';
import { NotFoundError, ForbiddenError, DatabaseError } from '@utils/errors';

/**
 * Service for mod version management.
 */
export class ModVersionService {
  private versionRepository: ModVersionRepository;
  private modRepository: ModRepository;

  constructor() {
    this.versionRepository = new ModVersionRepository();
    this.modRepository = new ModRepository();
  }

  /**
   * Create a new mod version.
   * @param modId Mod ID
   * @param creatorId Creator user ID (for ownership verification)
   * @param data Version data
   * @returns Created version
   */
  public async createVersion(
    modId: number,
    creatorId: number,
    data: {
      versionNumber: string;
      changelog?: string;
      filePath: string;
      fileSize: number;
      fileHash: string;
    }
  ): Promise<ModVersion> {
    try {
      // Verify mod exists and user owns it
      const mod = await this.modRepository.findById(modId);
      if (!mod) {
        throw new NotFoundError('Mod');
      }
      if (mod.creatorId !== creatorId) {
        throw new ForbiddenError('You do not have permission to add versions to this mod');
      }

      // Create version
      const version = await this.versionRepository.create({
        modId,
        versionNumber: data.versionNumber,
        changelog: data.changelog,
        filePath: data.filePath,
        fileSize: data.fileSize,
        fileHash: data.fileHash,
      });

      // If this is the first version, mark it as recommended
      const versions = await this.versionRepository.findByModId(modId);
      if (versions.length === 1) {
        await this.versionRepository.setRecommended(modId, version.id);
      }

      logger.info('Mod version created successfully', {
        modId,
        versionId: version.id,
        versionNumber: data.versionNumber,
        creatorId,
      });

      return version;
    } catch (error) {
      logger.error('Failed to create mod version', {
        modId,
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (NotFoundError || ForbiddenError || DatabaseError)
        ? error
        : new DatabaseError('Failed to create mod version');
    }
  }

  /**
   * Get version by ID.
   * @param versionId Version ID
   * @returns Version or null
   */
  public async getVersionById(versionId: number): Promise<ModVersion | null> {
    try {
      return await this.versionRepository.findById(versionId);
    } catch (error) {
      logger.error('Failed to get version by ID', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all versions for a mod.
   * @param modId Mod ID
   * @returns Array of versions
   */
  public async getVersionsByModId(modId: number): Promise<ModVersion[]> {
    try {
      return await this.versionRepository.findByModId(modId);
    } catch (error) {
      logger.error('Failed to get versions by mod ID', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get recommended version for a mod.
   * @param modId Mod ID
   * @returns Recommended version or null
   */
  public async getRecommendedVersion(modId: number): Promise<ModVersion | null> {
    try {
      return await this.versionRepository.findRecommendedByModId(modId);
    } catch (error) {
      logger.error('Failed to get recommended version', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set a version as recommended.
   * @param modId Mod ID
   * @param versionId Version ID
   * @param creatorId Creator user ID (for ownership verification)
   */
  public async setRecommendedVersion(
    modId: number,
    versionId: number,
    creatorId: number
  ): Promise<void> {
    try {
      // Verify mod ownership
      const mod = await this.modRepository.findById(modId);
      if (!mod) {
        throw new NotFoundError('Mod');
      }
      if (mod.creatorId !== creatorId) {
        throw new ForbiddenError('You do not have permission to manage this mod');
      }

      // Verify version belongs to mod
      const version = await this.versionRepository.findById(versionId);
      if (!version || version.modId !== modId) {
        throw new NotFoundError('Version');
      }

      // Set as recommended
      await this.versionRepository.setRecommended(modId, versionId);

      logger.info('Version set as recommended', {
        modId,
        versionId,
        creatorId,
      });
    } catch (error) {
      logger.error('Failed to set recommended version', {
        modId,
        versionId,
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (NotFoundError || ForbiddenError || DatabaseError)
        ? error
        : new DatabaseError('Failed to set recommended version');
    }
  }

  /**
   * Increment download count for a version.
   * @param versionId Version ID
   */
  public async incrementDownloadCount(versionId: number): Promise<void> {
    try {
      await this.versionRepository.incrementDownloadCount(versionId);
    } catch (error) {
      logger.error('Failed to increment download count', {
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
