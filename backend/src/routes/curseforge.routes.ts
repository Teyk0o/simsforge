import { Router } from 'express';
import { curseForgeController } from '@controllers/CurseForgeController';
import { authMiddleware } from '@middleware/authMiddleware';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Create CurseForge proxy routes
 * All CurseForge routes require authentication
 */
export function createCurseForgeRoutes(): Router {
  const router = Router();

  router.use(authMiddleware);

  /**
   * GET /api/v1/curseforge/categories
   * Get all available categories for Sims 4 mods
   */
  router.get('/categories', asyncHandler((req, res) => curseForgeController.getCategories(req, res)));

  /**
   * GET /api/v1/curseforge/search
   * Search for mods on CurseForge
   * Query parameters:
   *   - query: search term (optional)
   *   - pageSize: results per page 1-50 (default 50)
   *   - pageIndex: page index (default 0)
   *   - sortBy: downloads, date, or popularity (default downloads)
   *   - categoryName: filter by category name (optional, case-insensitive)
   */
  router.get('/search', asyncHandler((req, res) => curseForgeController.searchMods(req, res)));

  /**
   * GET /api/v1/curseforge/:modId
   * Get details of a specific mod
   */
  router.get('/:modId', asyncHandler((req, res) => curseForgeController.getMod(req, res)));

  /**
   * POST /api/v1/curseforge/download-url
   * Get download URL for a mod file
   * Body:
   *   - modId: CurseForge mod ID (required)
   *   - fileId: specific file version to download (optional)
   */
  router.post('/download-url', asyncHandler((req, res) => curseForgeController.getDownloadUrl(req, res)));

  return router;
}

export default createCurseForgeRoutes;
