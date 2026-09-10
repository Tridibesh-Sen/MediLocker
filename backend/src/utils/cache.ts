import { logger } from './logger';
import { env } from '../config/env';
import { Redis } from '@upstash/redis';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private store: Map<string, CacheEntry> = new Map();
  private redisClient: Redis | null = null;
  private maxEntries = 10000;

  constructor() {
    // Initialize Upstash Redis if credentials exist
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redisClient = new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        });
        logger.info('⚡ Upstash Redis remote cache layer initialized successfully.');
      } catch (err: any) {
        logger.warn('Failed to initialize Redis client. Falling back to in-memory cache.', { error: err.message });
      }
    }

    // Periodic sweep of expired items every 60 seconds
    const cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        this.store.delete(key);
        expiredCount++;
      }
    }
    if (expiredCount > 0) {
      logger.debug(`🧹 Cache cleanup sweep removed ${expiredCount} expired items.`);
    }
  }

  /**
   * Get cached value by key:
   * 1. Check L1 in-memory cache (0ms latency)
   * 2. Fall back to L2 Upstash Redis cloud cache and hydrate L1
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (entry) {
      if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
        this.store.delete(key);
      } else {
        logger.debug(`🎯 L1 In-memory cache HIT: [${key}]`);
        return entry.value as T;
      }
    }

    // Fallback to L2 Upstash Redis
    if (this.redisClient) {
      try {
        const raw = await this.redisClient.get<any>(key);
        if (raw !== null && raw !== undefined) {
          logger.debug(`⚡ L2 Redis remote cache HIT: [${key}]`);
          const val: T = typeof raw === 'string' ? JSON.parse(raw) : raw;
          // Hydrate L1 in-memory for 3 minutes
          this.store.set(key, { value: val, expiresAt: Date.now() + 180000 });
          return val;
        }
      } catch (err: any) {
        logger.warn(`Redis get error on [${key}]`, { error: err.message });
      }
    }

    return null;
  }

  /**
   * Set cached value with TTL in seconds (default 300s = 5 minutes)
   */
  set<T = any>(key: string, value: T, ttlSeconds: number = 300): void {
    // Enforce memory bounds
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.store.set(key, { value, expiresAt });
    logger.debug(`💾 In-memory cache SET: [${key}] (TTL: ${ttlSeconds}s)`);

    // Async sync to Redis
    if (this.redisClient) {
      this.redisClient.set(key, JSON.stringify(value), { ex: ttlSeconds }).catch((err) => {
        logger.warn(`Redis sync failed for key ${key}`, { error: err.message });
      });
    }
  }

  /**
   * Delete cached key
   */
  del(key: string): void {
    this.store.delete(key);
    if (this.redisClient) {
      this.redisClient.del(key).catch(() => {});
    }
    logger.debug(`🗑 Cache DEL: [${key}]`);
  }

  /**
   * Invalidate all keys matching a prefix
   */
  invalidatePrefix(prefix: string): void {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    logger.debug(`🧹 Invalidated ${count} cache keys with prefix: [${prefix}]`);
  }

  async getUserProfile<T = any>(userId: string): Promise<T | null> {
    return this.get<T>(`user:profile:${userId}`);
  }

  setUserProfile<T = any>(userId: string, data: T, ttlSeconds: number = 600): void {
    this.set(`user:profile:${userId}`, data, ttlSeconds);
  }

  invalidateUserProfile(userId: string): void {
    this.del(`user:profile:${userId}`);
  }

  /**
   * User Lookup by Unit ID (Cached for 15 minutes)
   */
  async getUserByUnit<T = any>(unitId: string): Promise<T | null> {
    return this.get<T>(`user:unit:${unitId.toUpperCase()}`);
  }

  setUserByUnit<T = any>(unitId: string, data: T, ttlSeconds: number = 900): void {
    this.set(`user:unit:${unitId.toUpperCase()}`, data, ttlSeconds);
  }

  invalidateUserByUnit(unitId: string): void {
    this.del(`user:unit:${unitId.toUpperCase()}`);
  }
}

export const cacheService = new CacheService();
