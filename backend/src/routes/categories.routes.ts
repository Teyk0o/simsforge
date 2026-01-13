import { Router } from 'express';
import { CategoryController } from '@controllers/CategoryController';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Category routes.
 * Handles category listing and retrieval.
 */
export function createCategoryRoutes(): Router {
  const router = Router();
  const controller = new CategoryController();

  /**
   * GET /api/v1/categories
   * Get all categories
   */
  router.get('/', asyncHandler((req, res) => controller.getCategories(req, res)));

  /**
   * GET /api/v1/categories/:id
   * Get category by ID
   */
  router.get('/:id', asyncHandler((req, res) => controller.getCategoryById(req, res)));

  return router;
}
