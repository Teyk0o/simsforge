import { Router } from 'express';
import { CreatorController } from '@controllers/CreatorController';
import { authMiddleware, optionalAuthMiddleware } from '@middleware/authMiddleware';

/**
 * Creator routes.
 * All creator endpoints: registration, profile management.
 */
export function createCreatorRoutes(): Router {
  const router = Router();
  const controller = new CreatorController();

  /**
   * POST /api/v1/creators/register
   * Transform authenticated user into creator.
   * Requires authentication.
   */
  router.post('/register', authMiddleware, controller.register);

  /**
   * GET /api/v1/creators/me
   * Get authenticated user's creator profile.
   * Requires authentication.
   */
  router.get('/me', authMiddleware, controller.getOwnProfile);

  /**
   * PATCH /api/v1/creators/me
   * Update authenticated user's creator profile.
   * Requires authentication.
   */
  router.patch('/me', authMiddleware, controller.updateProfile);

  /**
   * GET /api/v1/creators/:username
   * Get public creator profile by username.
   * No authentication required.
   */
  router.get('/:username', optionalAuthMiddleware, controller.getPublicProfile);

  return router;
}
