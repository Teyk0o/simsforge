import { Router } from 'express';
import { UserController } from '@controllers/UserController';
import { authMiddleware } from '@middleware/authMiddleware';

/**
 * User routes.
 * All user endpoints: profile management.
 */
export function createUserRoutes(): Router {
  const router = Router();
  const controller = new UserController();

  /**
   * GET /api/v1/users/me
   * Get authenticated user profile.
   * Requires authentication.
   */
  router.get('/me', authMiddleware, controller.getProfile);

  /**
   * PATCH /api/v1/users/me
   * Update authenticated user profile.
   * Requires authentication.
   */
  router.patch('/me', authMiddleware, controller.updateProfile);

  return router;
}
