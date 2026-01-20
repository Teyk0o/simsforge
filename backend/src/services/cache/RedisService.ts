import { createClient, RedisClientType } from 'redis';
import { ICacheService } from './ICacheService';
import { logger } from '@utils/logger';

/**
 * Redis-based cache service
 * Provides distributed caching across multiple instances
 * Automatically reconnects on failure
 */
export class RedisService implements ICacheService {
  private client: RedisClientType | null = null;
  private readonly defaultTTL: number = 5 * 60; // 5 minutes in seconds
  private isConnected: boolean = false;

  constructor(
    private readonly host: string = 'localhost',
    private readonly port: number = 6379,
    private readonly password?: string,
    private readonly db: number = 0
  ) {}

  /**
   * Connects to Redis server
   */
  async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: this.host,
          port: this.port,
          reconnectStrategy: (retries) => {
            const delay = Math.min(retries * 50, 500);
            return delay;
          }
        },
        ...(this.password && { password: this.password }),
        ...(this.db && { database: this.db })
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error', err);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('close', () => {
        logger.warn('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      logger.info(`Redis connected to ${this.host}:${this.port}`);
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  /**
   * Disconnects from Redis server
   */
  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  /**
   * Sets a value in Redis with optional TTL
   */
  async set<T>(key: string, data: T, ttl: number = this.defaultTTL): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn(`Redis not connected, skipping set for key: ${key}`);
      return;
    }

    try {
      const serialized = JSON.stringify(data);
      if (ttl > 0) {
        await this.client.setEx(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Redis set error for key ${key}`, error);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Gets a value from Redis
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) {
      logger.warn(`Redis not connected, returning null for key: ${key}`);
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redis get error for key ${key}`, error);
      return null;
    }
  }

  /**
   * Invalidates all cache entries matching a pattern
   */
  async invalidate(pattern: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn(`Redis not connected, skipping invalidate for pattern: ${pattern}`);
      return;
    }

    try {
      const keys = await this.client.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Redis invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Redis invalidate error for pattern ${pattern}`, error);
    }
  }

  /**
   * Clears all cache entries
   */
  async clear(): Promise<void> {
    if (!this.client || !this.isConnected) {
      logger.warn('Redis not connected, skipping clear');
      return;
    }

    try {
      await this.client.flushDb();
      logger.info('Redis database cleared');
    } catch (error) {
      logger.error('Redis clear error', error);
    }
  }

  /**
   * Gets current cache size
   */
  async getSize(): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      const info = await this.client.info('keyspace');
      const match = info.match(/keys=(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (error) {
      logger.error('Redis getSize error', error);
      return 0;
    }
  }

  /**
   * Checks if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}`, error);
      return false;
    }
  }

  /**
   * Checks if Redis is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Create and export singleton Redis instance
let redisInstance: RedisService | null = null;

export async function getRedisService(): Promise<RedisService> {
  if (!redisInstance) {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;
    const db = parseInt(process.env.REDIS_DB || '0', 10);

    redisInstance = new RedisService(host, port, password, db);
    await redisInstance.connect();
  }
  return redisInstance;
}

export async function closeRedisService(): Promise<void> {
  if (redisInstance) {
    await redisInstance.disconnect();
    redisInstance = null;
  }
}
