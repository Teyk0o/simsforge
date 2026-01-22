import { Router } from 'express';
import { curseForgeController } from '@controllers/CurseForgeController';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Create CurseForge proxy routes
 * All endpoints require CurseForge API key in X-CurseForge-API-Key header
 */
export function createCurseForgeRoutes(): Router {
  const router = Router();

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

  /**
   * POST /api/v1/curseforge/batch-versions
   * Get latest versions for multiple mods (batch operation)
   * Body:
   *   - modIds: Array of CurseForge mod IDs (required, max 100)
   * Returns: Map of modId to latest version info
   */
  router.post('/batch-versions', asyncHandler((req, res) => curseForgeController.getLatestVersions(req, res)));

  return router;
}

export default createCurseForgeRoutes;
