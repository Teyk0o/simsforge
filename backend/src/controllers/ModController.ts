import { Request, Response } from 'express';
import { ModService } from '@services/mod/ModService';
import { ModVersionService } from '@services/mod/ModVersionService';
import { FileStorageService } from '@services/file/FileStorageService';
import { logger } from '@utils/logger';
import {
  createModSchema,
  updateModSchema,
  createModVersionSchema,
  getPublishedModsSchema,
} from '@validators/mod.validator';
import { ValidationError } from '@utils/errors';

/**
 * Controller for mod-related endpoints.
 */
export class ModController {
  private modService: ModService;
  private versionService: ModVersionService;
  private fileService: FileStorageService;

  constructor() {
    this.modService = new ModService();
    this.versionService = new ModVersionService();
    this.fileService = new FileStorageService();
  }

  /**
   * Create a new mod.
   * POST /api/v1/creators/me/mods
   */
  public async createMod(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = createModSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.flatten().fieldErrors;
        throw new ValidationError('Invalid mod data', { errors });
      }

      const mod = await this.modService.createMod(req.user!.id, validationResult.data);

      res.status(201).json({
        success: true,
        data: mod,
      });
    } catch (error) {
      logger.error('Error creating mod', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get creator's mods.
   * GET /api/v1/creators/me/mods
   */
  public async getCreatorMods(req: Request, res: Response): Promise<void> {
    try {
      const status = (req.query.status as string | undefined) as
        | 'draft'
        | 'published'
        | 'hidden'
        | 'removed'
        | undefined;

      const mods = await this.modService.getModsByCreator(req.user!.id, status);

      res.status(200).json({
        success: true,
        data: mods,
      });
    } catch (error) {
      logger.error('Error getting creator mods', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get mod by ID or slug.
   * GET /api/v1/mods/:identifier
   */
  public async getModByIdentifier(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params;
      const isNumeric = /^\d+$/.test(identifier as string);

      let mod;
      if (isNumeric) {
        mod = await this.modService.getModById(parseInt(identifier as string));
      } else {
        mod = await this.modService.getModBySlug(identifier as string);
      }

      if (!mod) {
        res.status(404).json({
          error: {
            message: 'Mod not found',
            statusCode: 404,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: mod,
      });
    } catch (error) {
      logger.error('Error getting mod', {
        identifier: req.params.identifier,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update a mod.
   * PATCH /api/v1/creators/me/mods/:modId
   */
  public async updateMod(req: Request, res: Response): Promise<void> {
    try {
      const { modId } = req.params;

      // Validate request body
      const validationResult = updateModSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.flatten().fieldErrors;
        throw new ValidationError('Invalid mod data', { errors });
      }

      const mod = await this.modService.updateMod(parseInt(modId as string), req.user!.id, validationResult.data);

      res.status(200).json({
        success: true,
        data: mod,
      });
    } catch (error) {
      logger.error('Error updating mod', {
        modId: req.params.modId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Publish a mod.
   * POST /api/v1/creators/me/mods/:modId/publish
   */
  public async publishMod(req: Request, res: Response): Promise<void> {
    try {
      const { modId } = req.params;

      const mod = await this.modService.publishMod(parseInt(modId as string), req.user!.id);

      res.status(200).json({
        success: true,
        data: mod,
      });
    } catch (error) {
      logger.error('Error publishing mod', {
        modId: req.params.modId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Hide a mod.
   * POST /api/v1/creators/me/mods/:modId/hide
   */
  public async hideMod(req: Request, res: Response): Promise<void> {
    try {
      const { modId } = req.params;

      const mod = await this.modService.hideMod(parseInt(modId as string), req.user!.id);

      res.status(200).json({
        success: true,
        data: mod,
      });
    } catch (error) {
      logger.error('Error hiding mod', {
        modId: req.params.modId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create a mod version.
   * POST /api/v1/creators/me/mods/:modId/versions
   */
  public async createVersion(req: Request, res: Response): Promise<void> {
    try {
      const { modId } = req.params;

      // Validate request body
      const validationResult = createModVersionSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errors = validationResult.error.flatten().fieldErrors;
        throw new ValidationError('Invalid version data', { errors });
      }

      // Validate file upload
      if (!req.file) {
        throw new ValidationError('Mod file is required');
      }

      // Upload file
      const fileMetadata = await this.fileService.uploadModFile(
        req.file,
        parseInt(modId as string),
        validationResult.data.versionNumber
      );

      // Create version
      const version = await this.versionService.createVersion(
        parseInt(modId as string),
        req.user!.id,
        {
          ...validationResult.data,
          filePath: fileMetadata.filePath,
          fileSize: fileMetadata.fileSize,
          fileHash: fileMetadata.fileHash,
        }
      );

      res.status(201).json({
        success: true,
        data: version,
      });
    } catch (error) {
      logger.error('Error creating mod version', {
        modId: req.params.modId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get mod versions.
   * GET /api/v1/mods/:modId/versions
   */
  public async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const { modId } = req.params;

      const versions = await this.versionService.getVersionsByModId(parseInt(modId as string));

      res.status(200).json({
        success: true,
        data: versions,
      });
    } catch (error) {
      logger.error('Error getting mod versions', {
        modId: req.params.modId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set recommended version.
   * PATCH /api/v1/creators/me/mods/:modId/versions/:versionId/recommend
   */
  public async setRecommendedVersion(req: Request, res: Response): Promise<void> {
    try {
      const { modId, versionId } = req.params;

      await this.versionService.setRecommendedVersion(
        parseInt(modId as string),
        parseInt(versionId as string),
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: { message: 'Version set as recommended' },
      });
    } catch (error) {
      logger.error('Error setting recommended version', {
        modId: req.params.modId,
        versionId: req.params.versionId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get published mods with pagination and filters.
   * GET /api/v1/mods
   */
  public async getPublishedMods(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = getPublishedModsSchema.safeParse(req.query);
      if (!validationResult.success) {
        const errors = validationResult.error.flatten().fieldErrors;
        throw new ValidationError('Invalid query parameters', { errors });
      }

      const { page, limit, search, categoryIds, tagIds, sortBy } = validationResult.data;
      const offset = (page - 1) * limit;

      const result = await this.modService.getPublishedMods(limit, offset, {
        search,
        categoryIds,
        tagIds,
        sortBy,
      });

      const totalPages = Math.ceil(result.total / limit);

      res.status(200).json({
        success: true,
        data: result.mods,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      logger.error('Error getting published mods', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
