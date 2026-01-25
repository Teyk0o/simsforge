import { Router } from 'express';
import { toolsController } from '@controllers/ToolsController';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Create Tools routes
 * Endpoints for downloading helper tools like Sims Log Enabler
 */
export function createToolsRoutes(): Router {
  const router = Router();

  /**
   * GET /api/v1/tools/:toolId/metadata
   * Get metadata for a specific tool (version, description, files list with hashes)
   */
  router.get(
    '/:toolId/metadata',
    asyncHandler((req, res) => toolsController.getMetadata(req, res))
  );

  /**
   * GET /api/v1/tools/:toolId/files
   * List all files available for download in a tool
   */
  router.get(
    '/:toolId/files',
    asyncHandler((req, res) => toolsController.listFiles(req, res))
  );

  /**
   * GET /api/v1/tools/:toolId/download/:filename
   * Download a specific file from a tool
   */
  router.get(
    '/:toolId/download/:filename',
    asyncHandler((req, res) => toolsController.downloadFile(req, res))
  );

  return router;
}

export default createToolsRoutes;
