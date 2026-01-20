import { Router } from 'express';
import { CacheController } from '@controllers/CacheController';
import { asyncHandler } from '@middleware/errorMiddleware';

/**
 * Cache routes.
 * Handles search result caching for client-side navigation restoration.
 */
export function createCacheRoutes(): Router {
  const router = Router();

  /**
   * POST /api/v1/cache/search
   * Save search results to cache
   *
   * @body {
   *   query?: string,
   *   sortBy?: string,
   *   filter?: string,
   *   category?: string,
   *   mods: any[],
   *   totalCount: number,
   *   pageCount: number
   * }
   * @returns { cacheKey, expiresIn, timestamp }
   */
  router.post('/search', asyncHandler((req, res) => CacheController.saveSearchCache(req, res)));

  /**
   * GET /api/v1/cache/search/:cacheKey
   * Retrieve cached search results
   *
   * @param cacheKey - The cache key
   * @returns { mods, totalCount, pageCount, timestamp, expiresAt, isExpired }
   */
  router.get('/search/:cacheKey', asyncHandler((req, res) => CacheController.getSearchCache(req, res)));

  /**
   * DELETE /api/v1/cache/search/pattern/:pattern
   * Invalidate cache entries matching a pattern
   *
   * @param pattern - Pattern to match
   */
  router.delete('/search/pattern/:pattern', asyncHandler((req, res) => CacheController.invalidatePattern(req, res)));

  /**
   * DELETE /api/v1/cache/search
   * Clear all search cache
   */
  router.delete('/search', asyncHandler((req, res) => CacheController.clearAll(req, res)));

  /**
   * GET /api/v1/cache/stats
   * Get cache statistics
   *
   * @returns { totalKeys, isHealthy }
   */
  router.get('/stats', asyncHandler((req, res) => CacheController.getStats(req, res)));

  return router;
}
