import { Router } from 'express';
import { TagController } from '@controllers/TagController';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Tag routes.
 * Handles tag listing and retrieval.
 */
export function createTagRoutes(): Router {
  const router = Router();
  const controller = new TagController();

  /**
   * GET /api/v1/tags
   * Get all tags (with optional type filter)
   */
  router.get('/', asyncHandler((req, res) => controller.getTags(req, res)));

  /**
   * GET /api/v1/tags/:id
   * Get tag by ID
   */
  router.get('/:id', asyncHandler((req, res) => controller.getTagById(req, res)));

  return router;
}
