import crypto from 'crypto';
import { RedisService, getRedisService } from './RedisService';
import { logger } from '@utils/logger';

/**
 * Represents cached search results
 */
export interface CachedSearchResult {
  mods: any[];
  totalCount: number;
  pageCount: number;
  timestamp: number;
  expiresAt: number;
}

/**
 * Service for managing search result cache
 * Generates unique cache keys and manages expiration
 */
export class SearchCacheService {
  private readonly CACHE_TTL = 5 * 60; // 5 minutes in seconds
  private redis: RedisService | null = null;

  constructor() {}

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    this.redis = await getRedisService();
  }

  /**
   * Generates a unique cache key for search parameters
   * @param query Search query text
   * @param sortBy Sort order
   * @param filter Active filter
   * @param category Selected category
   * @returns Unique cache key
   */
  generateCacheKey(
    query?: string,
    sortBy?: string,
    filter?: string,
    category?: string
  ): string {
    const params = `${query || ''}:${sortBy || 'downloads'}:${filter || 'all'}:${category || 'all'}`;
    const hash = crypto.createHash('sha256').update(params).digest('hex');
    return `search:${hash}`;
  }

  /**
   * Saves search results to cache
   * @param cacheKey Cache key
   * @param mods Array of mod results
   * @param totalCount Total results available
   * @param pageCount Total pages
   * @returns Cache key and expiration info
   */
  async saveCacheEntry(
    cacheKey: string,
    mods: any[],
    totalCount: number,
    pageCount: number
  ): Promise<{ cacheKey: string; expiresIn: number; timestamp: number }> {
    if (!this.redis) {
      await this.initialize();
    }

    try {
      const timestamp = Date.now();
      const expiresAt = timestamp + this.CACHE_TTL * 1000;

      const cacheEntry: CachedSearchResult = {
        mods,
        totalCount,
        pageCount,
        timestamp,
        expiresAt
      };

      // Save to Redis with TTL
      await this.redis!.set(cacheKey, cacheEntry, this.CACHE_TTL);

      logger.info(
        `Search cache saved: key=${cacheKey}, results=${mods.length}, ttl=${this.CACHE_TTL}s`
      );

      return {
        cacheKey,
        expiresIn: this.CACHE_TTL,
        timestamp
      };
    } catch (error) {
      logger.error('Failed to save search cache', error);
      throw error;
    }
  }

  /**
   * Retrieves cached search results
   * @param cacheKey Cache key
   * @returns Cached results or null if expired/not found
   */
  async getCacheEntry(cacheKey: string): Promise<CachedSearchResult | null> {
    if (!this.redis) {
      await this.initialize();
    }

    try {
      const cached = await this.redis!.get<CachedSearchResult>(cacheKey);

      if (!cached) {
        logger.debug(`Cache miss for key: ${cacheKey}`);
        return null;
      }

      // Check if expired
      if (Date.now() > cached.expiresAt) {
        logger.debug(`Cache expired for key: ${cacheKey}`);
        await this.redis!.invalidate(cacheKey);
        return null;
      }

      logger.debug(`Cache hit for key: ${cacheKey}, results=${cached.mods.length}`);
      return cached;
    } catch (error) {
      logger.error(`Failed to retrieve cache entry ${cacheKey}`, error);
      return null;
    }
  }

  /**
   * Invalidates cache entries matching a pattern
   * @param pattern Pattern to match
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) {
      await this.initialize();
    }

    try {
      await this.redis!.invalidate(pattern);
      logger.info(`Search cache invalidated for pattern: ${pattern}`);
    } catch (error) {
      logger.error(`Failed to invalidate cache pattern ${pattern}`, error);
    }
  }

  /**
   * Clears all search cache
   */
  async clearAll(): Promise<void> {
    if (!this.redis) {
      await this.initialize();
    }

    try {
      await this.redis!.invalidate('search:');
      logger.info('All search cache cleared');
    } catch (error) {
      logger.error('Failed to clear search cache', error);
    }
  }

  /**
   * Gets cache statistics
   */
  async getStats(): Promise<{ totalKeys: number; isHealthy: boolean }> {
    if (!this.redis) {
      await this.initialize();
    }

    try {
      const totalKeys = await this.redis!.getSize();
      const isHealthy = this.redis!.isHealthy();

      return { totalKeys, isHealthy };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return { totalKeys: 0, isHealthy: false };
    }
  }
}

// Export singleton
export const searchCacheService = new SearchCacheService();
