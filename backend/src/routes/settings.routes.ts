import { Router } from 'express';
import { settingsController } from '@controllers/SettingsController';
import { authMiddleware } from '@middleware/authMiddleware';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Create settings routes
 * All settings routes require authentication
 */
export function createSettingsRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);

  /**
   * POST /api/v1/settings/api-keys
   * Add or update an API key for a service
   */
  router.post('/api-keys', asyncHandler((req, res) => settingsController.addApiKey(req, res)));

  /**
   * GET /api/v1/settings/api-keys
   * Get list of configured services
   */
  router.get('/api-keys', asyncHandler((req, res) => settingsController.getConfiguredServices(req, res)));

  /**
   * DELETE /api/v1/settings/api-keys/:serviceName
   * Delete an API key
   */
  router.delete('/api-keys/:serviceName', asyncHandler((req, res) => settingsController.deleteApiKey(req, res)));

  return router;
}

export default createSettingsRoutes;
