/**
 * Interface for cache services (in-memory, Redis, etc.)
 * Provides a common contract for caching implementations
 */
export interface ICacheService {
  /**
   * Sets a value in cache with optional TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in seconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl?: number): Promise<void>;

  /**
   * Gets a value from cache if it exists and hasn't expired
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Invalidates all cache entries matching a pattern
   * @param pattern Pattern to match against cache keys
   */
  invalidate(pattern: string): Promise<void>;

  /**
   * Clears all cache entries
   */
  clear(): Promise<void>;

  /**
   * Gets current cache size (for monitoring)
   */
  getSize(): Promise<number>;

  /**
   * Checks if a key exists in cache
   */
  exists(key: string): Promise<boolean>;
}
