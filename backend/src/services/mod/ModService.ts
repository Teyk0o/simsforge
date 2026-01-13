import { ModRepository, Mod } from '@repositories/ModRepository';
import { ModVersionRepository } from '@repositories/ModVersionRepository';
import { CategoryRepository } from '@repositories/CategoryRepository';
import { TagRepository } from '@repositories/TagRepository';
import { logger } from '@utils/logger';
import { slugify } from '@utils/slugify';
import { NotFoundError, ForbiddenError, ConflictError, DatabaseError } from '@utils/errors';
import { pool } from '@config/database';

/**
 * Service for mod business logic and CRUD operations.
 */
export class ModService {
  private modRepository: ModRepository;
  private modVersionRepository: ModVersionRepository;
  private categoryRepository: CategoryRepository;
  private tagRepository: TagRepository;

  constructor() {
    this.modRepository = new ModRepository();
    this.modVersionRepository = new ModVersionRepository();
    this.categoryRepository = new CategoryRepository();
    this.tagRepository = new TagRepository();
  }

  /**
   * Create a new mod.
   * @param creatorId Creator user ID
   * @param data Mod data
   * @returns Created mod
   */
  public async createMod(
    creatorId: number,
    data: {
      title: string;
      description?: string;
      accessType?: 'free' | 'early_access';
      earlyAccessPrice?: number;
      categoryIds?: number[];
      tagIds?: number[];
    }
  ): Promise<Mod> {
    try {
      // Generate slug
      const slug = slugify(data.title);

      // Check for slug uniqueness
      const existingMod = await this.modRepository.findBySlug(slug);
      if (existingMod && existingMod.creatorId === creatorId) {
        throw new ConflictError('A mod with this title already exists for your account');
      }

      // Validate categories exist
      if (data.categoryIds && data.categoryIds.length > 0) {
        for (const categoryId of data.categoryIds) {
          const category = await this.categoryRepository.findById(categoryId);
          if (!category) {
            throw new NotFoundError(`Category with ID ${categoryId}`);
          }
        }
      }

      // Validate tags exist
      if (data.tagIds && data.tagIds.length > 0) {
        const tags = await this.tagRepository.findByIds(data.tagIds);
        if (tags.length !== data.tagIds.length) {
          throw new NotFoundError('One or more tags do not exist');
        }
      }

      // Create mod
      const mod = await this.modRepository.create({
        creatorId,
        title: data.title,
        slug,
        description: data.description,
        accessType: data.accessType || 'free',
        earlyAccessPrice: data.earlyAccessPrice,
      });

      // Associate categories
      if (data.categoryIds && data.categoryIds.length > 0) {
        await this.associateCategories(mod.id, data.categoryIds);
      }

      // Associate tags
      if (data.tagIds && data.tagIds.length > 0) {
        await this.associateTags(mod.id, data.tagIds);
      }

      logger.info('Mod created successfully', {
        modId: mod.id,
        creatorId,
        slug,
      });

      return mod;
    } catch (error) {
      logger.error('Failed to create mod', {
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (NotFoundError || ConflictError || DatabaseError)
        ? error
        : new DatabaseError('Failed to create mod');
    }
  }

  /**
   * Get mod by ID with full details.
   * @param modId Mod ID
   * @returns Mod with details or null
   */
  public async getModById(modId: number): Promise<Mod | null> {
    try {
      const mod = await this.modRepository.findById(modId);
      if (!mod) return null;

      return mod;
    } catch (error) {
      logger.error('Failed to get mod by ID', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get mod by slug.
   * @param slug Mod slug
   * @returns Mod or null
   */
  public async getModBySlug(slug: string): Promise<Mod | null> {
    try {
      return await this.modRepository.findBySlug(slug);
    } catch (error) {
      logger.error('Failed to get mod by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get mods by creator ID.
   * @param creatorId Creator user ID
   * @param status Optional status filter
   * @returns Array of mods
   */
  public async getModsByCreator(
    creatorId: number,
    status?: 'draft' | 'published' | 'hidden' | 'removed'
  ): Promise<Mod[]> {
    try {
      return await this.modRepository.findByCreatorId(creatorId, status);
    } catch (error) {
      logger.error('Failed to get mods by creator', {
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get published mods with filters and pagination.
   * @param limit Items per page
   * @param offset Pagination offset
   * @param filters Search/filter options
   * @returns Mods and total count
   */
  public async getPublishedMods(
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
      return await this.modRepository.findPublished(limit, offset, filters);
    } catch (error) {
      logger.error('Failed to get published mods', {
        limit,
        offset,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update mod.
   * @param modId Mod ID
   * @param creatorId Creator user ID (for ownership verification)
   * @param data Partial update data
   * @returns Updated mod
   */
  public async updateMod(
    modId: number,
    creatorId: number,
    data: {
      title?: string;
      description?: string | null;
      accessType?: 'free' | 'early_access';
      earlyAccessPrice?: number | null;
      status?: 'draft' | 'published' | 'hidden' | 'removed';
      categoryIds?: number[];
      tagIds?: number[];
    }
  ): Promise<Mod> {
    try {
      // Verify ownership
      const mod = await this.modRepository.findById(modId);
      if (!mod) {
        throw new NotFoundError('Mod');
      }
      if (mod.creatorId !== creatorId) {
        throw new ForbiddenError('You do not have permission to update this mod');
      }

      // Validate categories
      if (data.categoryIds) {
        for (const categoryId of data.categoryIds) {
          const category = await this.categoryRepository.findById(categoryId);
          if (!category) {
            throw new NotFoundError(`Category with ID ${categoryId}`);
          }
        }
      }

      // Validate tags
      if (data.tagIds) {
        const tags = await this.tagRepository.findByIds(data.tagIds);
        if (tags.length !== data.tagIds.length) {
          throw new NotFoundError('One or more tags do not exist');
        }
      }

      // Update mod
      const updatedMod = await this.modRepository.updateById(modId, {
        title: data.title,
        description: data.description,
        accessType: data.accessType,
        earlyAccessPrice: data.earlyAccessPrice,
        status: data.status,
      });

      // Update associations
      if (data.categoryIds) {
        await this.updateCategories(modId, data.categoryIds);
      }
      if (data.tagIds) {
        await this.updateTags(modId, data.tagIds);
      }

      logger.info('Mod updated successfully', {
        modId,
        creatorId,
        status: data.status,
      });

      return updatedMod;
    } catch (error) {
      logger.error('Failed to update mod', {
        modId,
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (NotFoundError || ForbiddenError || DatabaseError)
        ? error
        : new DatabaseError('Failed to update mod');
    }
  }

  /**
   * Publish a mod (set status to published).
   * @param modId Mod ID
   * @param creatorId Creator user ID
   * @returns Updated mod
   */
  public async publishMod(modId: number, creatorId: number): Promise<Mod> {
    try {
      // Verify ownership
      const mod = await this.modRepository.findById(modId);
      if (!mod) {
        throw new NotFoundError('Mod');
      }
      if (mod.creatorId !== creatorId) {
        throw new ForbiddenError('You do not have permission to publish this mod');
      }

      // Ensure there's at least one version
      const versions = await this.modVersionRepository.findByModId(modId);
      if (versions.length === 0) {
        throw new ConflictError('Mod must have at least one version before publishing');
      }

      // Update status
      return await this.modRepository.updateById(modId, {
        status: 'published',
      });
    } catch (error) {
      logger.error('Failed to publish mod', {
        modId,
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (NotFoundError || ForbiddenError || ConflictError || DatabaseError)
        ? error
        : new DatabaseError('Failed to publish mod');
    }
  }

  /**
   * Hide a mod (set status to hidden).
   * @param modId Mod ID
   * @param creatorId Creator user ID
   * @returns Updated mod
   */
  public async hideMod(modId: number, creatorId: number): Promise<Mod> {
    try {
      const mod = await this.modRepository.findById(modId);
      if (!mod) {
        throw new NotFoundError('Mod');
      }
      if (mod.creatorId !== creatorId) {
        throw new ForbiddenError('You do not have permission to hide this mod');
      }

      return await this.modRepository.updateById(modId, {
        status: 'hidden',
      });
    } catch (error) {
      logger.error('Failed to hide mod', {
        modId,
        creatorId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error instanceof (NotFoundError || ForbiddenError || DatabaseError)
        ? error
        : new DatabaseError('Failed to hide mod');
    }
  }

  /**
   * Associate categories with a mod.
   * @param modId Mod ID
   * @param categoryIds Category IDs
   */
  private async associateCategories(modId: number, categoryIds: number[]): Promise<void> {
    try {
      // Clear existing associations
      await pool.query('DELETE FROM mod_categories WHERE mod_id = $1', [modId]);

      // Insert new associations
      if (categoryIds.length > 0) {
        const values = categoryIds.map((_catId, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(',');
        const params: unknown[] = [];
        categoryIds.forEach((catId) => {
          params.push(modId);
          params.push(catId);
        });

        await pool.query(`INSERT INTO mod_categories (mod_id, category_id) VALUES ${values}`, params);
      }
    } catch (error) {
      logger.error('Failed to associate categories', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to associate categories');
    }
  }

  /**
   * Associate tags with a mod.
   * @param modId Mod ID
   * @param tagIds Tag IDs
   */
  private async associateTags(modId: number, tagIds: number[]): Promise<void> {
    try {
      // Clear existing associations
      await pool.query('DELETE FROM mod_tags WHERE mod_id = $1', [modId]);

      // Insert new associations
      if (tagIds.length > 0) {
        const values = tagIds.map((_tagId, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(',');
        const params: unknown[] = [];
        tagIds.forEach((tagId) => {
          params.push(modId);
          params.push(tagId);
        });

        await pool.query(`INSERT INTO mod_tags (mod_id, tag_id) VALUES ${values}`, params);
      }
    } catch (error) {
      logger.error('Failed to associate tags', {
        modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DatabaseError('Failed to associate tags');
    }
  }

  /**
   * Update mod categories.
   * @param modId Mod ID
   * @param categoryIds Category IDs
   */
  private async updateCategories(modId: number, categoryIds: number[]): Promise<void> {
    await this.associateCategories(modId, categoryIds);
  }

  /**
   * Update mod tags.
   * @param modId Mod ID
   * @param tagIds Tag IDs
   */
  private async updateTags(modId: number, tagIds: number[]): Promise<void> {
    await this.associateTags(modId, tagIds);
  }
}
