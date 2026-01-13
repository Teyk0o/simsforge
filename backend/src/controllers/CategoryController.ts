import { Request, Response } from 'express';
import { CategoryRepository } from '@repositories/CategoryRepository';
import { logger } from '@utils/logger';

/**
 * Controller for category-related endpoints.
 */
export class CategoryController {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Get all categories.
   * GET /api/v1/categories
   */
  public async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.categoryRepository.findAll();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Error getting categories', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get category by ID.
   * GET /api/v1/categories/:id
   */
  public async getCategoryById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const category = await this.categoryRepository.findById(parseInt(id));

      if (!category) {
        res.status(404).json({
          error: {
            message: 'Category not found',
            statusCode: 404,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      logger.error('Error getting category', {
        categoryId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
