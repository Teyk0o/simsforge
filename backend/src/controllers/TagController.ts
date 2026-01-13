import { Request, Response } from 'express';
import { TagRepository } from '@repositories/TagRepository';
import { logger } from '@utils/logger';

/**
 * Controller for tag-related endpoints.
 */
export class TagController {
  private tagRepository: TagRepository;

  constructor() {
    this.tagRepository = new TagRepository();
  }

  /**
   * Get all tags with optional type filter.
   * GET /api/v1/tags?type=general
   */
  public async getTags(req: Request, res: Response): Promise<void> {
    try {
      const type = req.query.type as string | undefined;
      const tags = await this.tagRepository.findAll(type);

      res.status(200).json({
        success: true,
        data: tags,
      });
    } catch (error) {
      logger.error('Error getting tags', {
        type: req.query.type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get tag by ID.
   * GET /api/v1/tags/:id
   */
  public async getTagById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tag = await this.tagRepository.findById(parseInt(id));

      if (!tag) {
        res.status(404).json({
          error: {
            message: 'Tag not found',
            statusCode: 404,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: tag,
      });
    } catch (error) {
      logger.error('Error getting tag', {
        tagId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
