import { Router } from 'express';
import { ModController } from '@controllers/ModController';
import { authMiddleware } from '@middleware/authMiddleware';
import { requireCreator } from '@middleware/roleMiddleware';
import { uploadLimiter } from '@middleware/rateLimitMiddleware';
import { uploadMiddleware } from '@middleware/uploadMiddleware';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Mod routes.
 * Handles mod creation, updates, publishing, versioning, and discovery.
 */
export function createModRoutes(): Router {
  const router = Router();
  const controller = new ModController();

  /**
   * Public routes (no authentication required)
   */

  /**
   * GET /api/v1/mods
   * Get published mods with pagination, filtering, and search
   */
  router.get('/', asyncHandler((req, res) => controller.getPublishedMods(req, res)));

  /**
   * GET /api/v1/mods/:identifier
   * Get mod by ID or slug
   */
  router.get('/:identifier', asyncHandler((req, res) => controller.getModByIdentifier(req, res)));

  /**
   * GET /api/v1/mods/:modId/versions
   * Get all versions for a mod
   */
  router.get('/:modId/versions', asyncHandler((req, res) => controller.getVersions(req, res)));

  /**
   * Creator-only routes
   */

  /**
   * POST /api/v1/creators/me/mods
   * Create a new mod
   */
  router.post(
    '/',
    authMiddleware,
    requireCreator,
    uploadLimiter,
    asyncHandler((req, res) => controller.createMod(req, res))
  );

  /**
   * GET /api/v1/creators/me/mods
   * Get authenticated creator's mods
   */
  router.get(
    '/creators/me',
    authMiddleware,
    requireCreator,
    asyncHandler((req, res) => controller.getCreatorMods(req, res))
  );

  /**
   * PATCH /api/v1/creators/me/mods/:modId
   * Update a mod
   */
  router.patch(
    '/:modId',
    authMiddleware,
    requireCreator,
    asyncHandler((req, res) => controller.updateMod(req, res))
  );

  /**
   * POST /api/v1/creators/me/mods/:modId/publish
   * Publish a mod
   */
  router.post(
    '/:modId/publish',
    authMiddleware,
    requireCreator,
    asyncHandler((req, res) => controller.publishMod(req, res))
  );

  /**
   * POST /api/v1/creators/me/mods/:modId/hide
   * Hide a mod
   */
  router.post(
    '/:modId/hide',
    authMiddleware,
    requireCreator,
    asyncHandler((req, res) => controller.hideMod(req, res))
  );

  /**
   * POST /api/v1/creators/me/mods/:modId/versions
   * Create a new mod version (with file upload)
   */
  router.post(
    '/:modId/versions',
    authMiddleware,
    requireCreator,
    uploadLimiter,
    uploadMiddleware.single('file'),
    asyncHandler((req, res) => controller.createVersion(req, res))
  );

  /**
   * PATCH /api/v1/creators/me/mods/:modId/versions/:versionId/recommend
   * Set a version as recommended
   */
  router.patch(
    '/:modId/versions/:versionId/recommend',
    authMiddleware,
    requireCreator,
    asyncHandler((req, res) => controller.setRecommendedVersion(req, res))
  );

  return router;
}
