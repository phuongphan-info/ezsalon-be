import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { headersStore } from '../stores/headers.store';

@Injectable()
export class CacheService {
  private readonly defaultTTL: number;
  private redisClient: Redis;
  
  /**
   * Configuration map for related cache clearing
   * When an entity is modified, all related caches will be cleared
   */
  private readonly relatedCacheMap: Record<string, string[]> = {
    customers: ['customers', 'customer_salons', 'salons'],
    salons: ['salons', 'customer_salons'],
    customer_salons: ['customer_salons', 'salons', 'customers'],
    users: ['users'],
    roles: ['roles', 'permissions'],
    permissions: ['permissions', 'roles'],
  };

  constructor(
    private configService: ConfigService,
  ) {
    this.defaultTTL = parseInt(this.configService.get<string>('CACHE_TTL', '300'), 10);
    
    // Initialize direct Redis client for HSET operations
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get('REDIS_PORT', '6379'), 10),
      password: this.configService.get('REDIS_PASSWORD', '') || undefined,
    });
  }

  /**
   * Get data from Redis HSET using table name and filter key
   * @param tableName - Database table name (e.g., 'customers', 'salons')
   * @param filterKey - Filter identifier (e.g., 'all', 'active', JSON string)
   */
  async hget<T>(tableName: string, filterKey: string): Promise<T | undefined> {
    try {
      const result = await this.redisClient.hget(tableName, filterKey);
      return result ? JSON.parse(result) : undefined;
    } catch (error) {
      console.error('Cache HGET error:', error);
      return undefined;
    }
  }

  /**
   * Set data in Redis HSET using table name and filter key
   * @param tableName - Database table name (e.g., 'customers', 'salons')
   * @param filterKey - Filter identifier (e.g., 'all', 'active', JSON string)
   * @param value - Data to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async hset(tableName: string, filterKey: string, value: any, ttl?: number): Promise<void> {
    try {
      const actualTTL = ttl || this.defaultTTL;
      
      // Set the hash field
      await this.redisClient.hset(tableName, filterKey, JSON.stringify(value));
      
      // Set TTL for the entire hash key
      await this.redisClient.expire(tableName, actualTTL);
    } catch (error) {
      console.error('Cache HSET error:', error);
      throw error;
    }
  }

  /**
   * Delete a specific field from Redis HSET
   * @param tableName - Database table name
   * @param filterKey - Filter identifier to delete
   */
  async hdel(tableName: string, filterKey: string): Promise<void> {
    try {
      await this.redisClient.hdel(tableName, filterKey);
    } catch (error) {
      console.error('Cache HDEL error:', error);
    }
  }

  async reset(): Promise<void> {
    // Clear all cache using direct Redis client
    try {
      await this.redisClient.flushdb();
    } catch (error) {
      console.error('Cache reset error:', error);
    }
  }

  /**
   * Clear specific table cache (delete the Redis HSET key)
   * @param tableName - Table name to clear (e.g., 'customers', 'permissions')
   */
  async clearPattern(tableName: string): Promise<void> {
    try {
      await this.redisClient.del(tableName);
    } catch (error) {
      console.error('Cache clearPattern error:', error);
    }
  }

  async caching<T>(
      tableName: string,
      filters: string | { [key: string]: any },
      callback: () => Promise<T>
  ): Promise<T> {
    // Check if cache should be skipped based on headers
    if (headersStore.shouldSkipCache()) {
      // Skip caching entirely, just execute callback and return result
      console.warn('Skipping cache due to headers configuration', tableName, filters);
      return await callback();
    }

    const filterKey = this.generateFilterKey(filters);
    const cached = await this.hget<T>(tableName, filterKey);
    
    if (cached !== undefined && cached !== null) {
      return cached as T;
    }
    
    try {
        const result = await callback();
        await this.hset(tableName, filterKey, result);
        return result;
    } catch (error) {
        const cachedResult = await this.hget<T>(tableName, filterKey);
        if (cachedResult !== undefined) {
            return cachedResult;
        }
        throw error;
    }
  }

  /**
   * Generate filter key for HSET field
   * @param filters - String filter ('all', 'active') or object with query parameters
   * @returns Filter key for HSET field
   */
  generateFilterKey(filters?: string | { [key: string]: any }): string {
    if (typeof filters === 'string') {
      return filters;
    }
    
    if (filters === undefined || filters === null) {
      return 'null';
    }
    
    return JSON.stringify(filters);
  }

  /**
   * Clear all cache entries for a table (delete entire HSET)
   * @param tableName - Database table name (e.g., 'customers', 'salons')
   */
  async clearEntityCache(tableName: string): Promise<void> {
    await this.clearPattern(tableName);
  }

  /**
   * Clear all related caches for an entity based on the configuration map
   * @param tableName - Database table name (e.g., 'customers', 'salons')
   */
  async clearRelatedCaches(tableName: string): Promise<void> {
    const relatedTables = this.relatedCacheMap[tableName] || [tableName];
    
    // Clear all related caches in parallel
    await Promise.all(
      relatedTables.map(table => this.clearEntityCache(table))
    );
  }

  /**
   * Get all cached filters for a table
   * @param tableName - Database table name
   */
  async getCachedFilters(tableName: string): Promise<string[]> {
    try {
      return await this.redisClient.hkeys(tableName);
    } catch (error) {
      console.error('Cache getCachedFilters error:', error);
      return [];
    }
  }

  /**
   * Check if a table has any cached data
   * @param tableName - Database table name
   */
  async hasCache(tableName: string): Promise<boolean> {
    try {
      return (await this.redisClient.exists(tableName)) > 0;
    } catch (error) {
      console.error('Cache hasCache error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for a table
   * @param tableName - Database table name
   */
  async getCacheStats(tableName: string): Promise<{ fieldCount: number; ttl: number; fields: string[] }> {
    try {
      const fieldCount = await this.redisClient.hlen(tableName);
      const ttl = await this.redisClient.ttl(tableName);
      const fields = await this.redisClient.hkeys(tableName);
      
      return { fieldCount, ttl, fields };
    } catch (error) {
      console.error('Cache getCacheStats error:', error);
      return { fieldCount: 0, ttl: -1, fields: [] };
    }
  }

  /**
   * Get the related cache configuration map
   */
  getRelatedCacheMap(): Record<string, string[]> {
    return { ...this.relatedCacheMap };
  }

  /**
   * Update the related cache configuration for a specific table
   * @param tableName - The table name to configure
   * @param relatedTables - Array of related table names that should be cleared
   */
  setRelatedCacheConfig(tableName: string, relatedTables: string[]): void {
    this.relatedCacheMap[tableName] = [...relatedTables];
  }
}
