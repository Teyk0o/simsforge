import { Router } from 'express';
import { createCurseForgeRoutes } from './curseforge.routes';
import { createReportRoutes } from './report.routes';

/**
 * Main route aggregator.
 * Combines all API routes under /api/v1 prefix.
 */
export function createApiRoutes(): Router {
  const router = Router();

  // CurseForge proxy routes
  router.use('/curseforge', createCurseForgeRoutes());

  // Fake mod detection and reporting routes
  router.use('/', createReportRoutes());

  return router;
}
