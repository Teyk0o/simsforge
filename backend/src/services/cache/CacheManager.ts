/**
 * In-memory cache with TTL support
 * Automatically cleans up expired entries
 * Used for caching expensive API calls (CurseForge, etc.)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheManager {
  private readonly cache: Map<string, CacheEntry<any>>;
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private readonly cleanupInterval: number = 60000; // 60 seconds
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new Map();
    this.startCleanupTimer();
  }

  /**
   * Sets a value in cache with optional TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Gets a value from cache if it exists and hasn't expired
   * @param key Cache key
   * @returns Cached data or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Invalidates all cache entries matching a pattern
   * @param pattern Pattern to match against cache keys
   */
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets current cache size (for monitoring)
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Removes all expired entries from cache
   * Called automatically every 60 seconds
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries (${this.cache.size} remaining)`);
    }
  }

  /**
   * Starts automatic cleanup timer
   * @private
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);

    // Allow process to exit if only cleanup timer is running
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stops the cleanup timer (called on shutdown)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const cacheManager = new CacheManager();
