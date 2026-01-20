import { Request, Response } from 'express';
import { searchCacheService } from '@services/cache/SearchCacheService';
import { asyncHandler } from '@middleware/errorMiddleware';
import { logger } from '@utils/logger';

/**
 * Controller for cache management endpoints
 * Handles saving and retrieving cached search results
 */
export class CacheController {
  /**
   * Saves search results to cache
   * POST /api/v1/cache/search
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
   */
  static saveSearchCache = asyncHandler(async (req: Request, res: Response) => {
    const { query, sortBy, filter, category, mods, totalCount, pageCount } = req.body;

    if (!mods || !Array.isArray(mods)) {
      return res.status(400).json({
        error: 'Invalid request body: mods array is required'
      });
    }

    if (totalCount === undefined || pageCount === undefined) {
      return res.status(400).json({
        error: 'Invalid request body: totalCount and pageCount are required'
      });
    }

    try {
      // Generate cache key based on search parameters
      const cacheKey = searchCacheService.generateCacheKey(query, sortBy, filter, category);

      // Save to cache
      const result = await searchCacheService.saveCacheEntry(cacheKey, mods, totalCount, pageCount);

      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Error saving search cache', error);
      return res.status(500).json({
        error: 'Failed to save cache'
      });
    }
  });

  /**
   * Retrieves cached search results
   * GET /api/v1/cache/search/:cacheKey
   *
   * @param cacheKey - The cache key to retrieve
   */
  static getSearchCache = asyncHandler(async (req: Request, res: Response) => {
    const { cacheKey } = req.params;

    if (!cacheKey) {
      return res.status(400).json({
        error: 'Cache key is required'
      });
    }

    try {
      const cached = await searchCacheService.getCacheEntry(cacheKey);

      if (!cached) {
        return res.status(404).json({
          error: 'Cache not found or expired'
        });
      }

      return res.status(200).json({
        success: true,
        ...cached,
        isExpired: Date.now() > cached.expiresAt
      });
    } catch (error) {
      logger.error(`Error retrieving search cache ${cacheKey}`, error);
      return res.status(500).json({
        error: 'Failed to retrieve cache'
      });
    }
  });

  /**
   * Invalidates cache by pattern
   * DELETE /api/v1/cache/search/pattern/:pattern
   *
   * @param pattern - Pattern to match cache keys
   */
  static invalidatePattern = asyncHandler(async (req: Request, res: Response) => {
    const { pattern } = req.params;

    if (!pattern) {
      return res.status(400).json({
        error: 'Pattern is required'
      });
    }

    try {
      await searchCacheService.invalidatePattern(pattern);

      return res.status(200).json({
        success: true,
        message: `Cache entries matching pattern '${pattern}' have been invalidated`
      });
    } catch (error) {
      logger.error(`Error invalidating cache pattern ${pattern}`, error);
      return res.status(500).json({
        error: 'Failed to invalidate cache'
      });
    }
  });

  /**
   * Clears all search cache
   * DELETE /api/v1/cache/search
   */
  static clearAll = asyncHandler(async (req: Request, res: Response) => {
    try {
      await searchCacheService.clearAll();

      return res.status(200).json({
        success: true,
        message: 'All search cache has been cleared'
      });
    } catch (error) {
      logger.error('Error clearing search cache', error);
      return res.status(500).json({
        error: 'Failed to clear cache'
      });
    }
  });

  /**
   * Gets cache statistics
   * GET /api/v1/cache/stats
   */
  static getStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await searchCacheService.getStats();

      return res.status(200).json({
        success: true,
        ...stats
      });
    } catch (error) {
      logger.error('Error getting cache stats', error);
      return res.status(500).json({
        error: 'Failed to get cache stats'
      });
    }
  });
}
