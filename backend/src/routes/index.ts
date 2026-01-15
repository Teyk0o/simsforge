import { Router } from 'express';
import { createAuthRoutes } from './auth.routes';
import { createUserRoutes } from './users.routes';
import { createCreatorRoutes } from './creators.routes';
import { createModRoutes } from './mods.routes';
import { createCategoryRoutes } from './categories.routes';
import { createTagRoutes } from './tags.routes';
import { createCurseForgeRoutes } from './curseforge.routes';

/**
 * Main route aggregator.
 * Combines all API routes under /api/v1 prefix.
 */
export function createApiRoutes(): Router {
  const router = Router();

  // Authentication routes
  router.use('/auth', createAuthRoutes());

  // User routes
  router.use('/users', createUserRoutes());

  // Creator routes
  router.use('/creators', createCreatorRoutes());

  // Mod routes
  router.use('/mods', createModRoutes());

  // Category routes
  router.use('/categories', createCategoryRoutes());

  // Tag routes
  router.use('/tags', createTagRoutes());

  // CurseForge proxy routes
  router.use('/curseforge', createCurseForgeRoutes());

  // Other routes will be added in subsequent phases:
  // router.use('/client', createClientRoutes());
  // router.use('/payments', createPaymentRoutes());
  // router.use('/admin', createAdminRoutes());

  return router;
}
