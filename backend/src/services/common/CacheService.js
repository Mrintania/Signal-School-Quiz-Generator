// backend/src/services/common/CacheService.js
import logger from '../../utils/common/Logger.js';
import { CacheError } from '../../errors/CustomErrors.js';

/**
 * Cache Service
 * จัดการระบบ cache สำหรับ application
 * รองรับ in-memory cache และ Redis (ถ้ามี)
 */
export class CacheService {
    constructor(config = {}) {
        this.config = {
            defaultTTL: config.defaultTTL || 3600, // 1 hour
            maxSize: config.maxSize || 1000, // Maximum number of items
            cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
            enableMetrics: config.enableMetrics !== false,
            ...config
        };

        // In-memory cache storage
        this.cache = new Map();
        this.accessTimes = new Map();
        this.hitCount = 0;
        this.missCount = 0;
        this.setCount = 0;
        this.deleteCount = 0;

        // Start cleanup interval
        this.startCleanupInterval();

        logger.info('CacheService initialized:', {
            defaultTTL: this.config.defaultTTL,
            maxSize: this.config.maxSize,
            enableMetrics: this.config.enableMetrics
        });
    }

    /**
     * Get value from cache
     */
    async get(key) {
        try {
            if (!key || typeof key !== 'string') {
                throw new CacheError('Cache key must be a non-empty string');
            }

            const item = this.cache.get(key);

            if (!item) {
                this.recordMiss(key);
                return null;
            }

            // Check if item has expired
            if (this.isExpired(item)) {
                this.cache.delete(key);
                this.accessTimes.delete(key);
                this.recordMiss(key);
                return null;
            }

            // Update access time
            this.accessTimes.set(key, Date.now());
            this.recordHit(key);

            logger.cache('get', key, {
                hit: true,
                ttl: item.ttl,
                size: this.getValueSize(item.value)
            });

            return item.value;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.get',
                key
            });

            // Return null on error to prevent application crashes
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set(key, value, ttl = null) {
        try {
            if (!key || typeof key !== 'string') {
                throw new CacheError('Cache key must be a non-empty string');
            }

            if (value === undefined) {
                throw new CacheError('Cache value cannot be undefined');
            }

            const actualTTL = ttl || this.config.defaultTTL;
            const expiresAt = Date.now() + (actualTTL * 1000);

            const item = {
                value: this.serializeValue(value),
                expiresAt,
                ttl: actualTTL,
                createdAt: Date.now()
            };

            // Check cache size limit
            if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
                await this.evictLeastRecentlyUsed();
            }

            this.cache.set(key, item);
            this.accessTimes.set(key, Date.now());
            this.recordSet(key);

            logger.cache('set', key, {
                ttl: actualTTL,
                size: this.getValueSize(value),
                cacheSize: this.cache.size
            });

            return true;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.set',
                key,
                ttl
            });

            throw new CacheError(`Failed to set cache: ${error.message}`);
        }
    }

    /**
     * Delete value from cache
     */
    async delete(key) {
        try {
            if (!key || typeof key !== 'string') {
                throw new CacheError('Cache key must be a non-empty string');
            }

            const deleted = this.cache.delete(key);
            this.accessTimes.delete(key);

            if (deleted) {
                this.recordDelete(key);

                logger.cache('delete', key, {
                    success: true,
                    cacheSize: this.cache.size
                });
            }

            return deleted;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.delete',
                key
            });

            throw new CacheError(`Failed to delete cache: ${error.message}`);
        }
    }

    /**
     * Delete multiple keys by pattern
     */
    async deletePattern(pattern) {
        try {
            if (!pattern || typeof pattern !== 'string') {
                throw new CacheError('Pattern must be a non-empty string');
            }

            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            const keysToDelete = [];

            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    keysToDelete.push(key);
                }
            }

            let deletedCount = 0;
            for (const key of keysToDelete) {
                if (await this.delete(key)) {
                    deletedCount++;
                }
            }

            logger.cache('deletePattern', pattern, {
                deletedCount,
                totalKeys: keysToDelete.length
            });

            return deletedCount;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.deletePattern',
                pattern
            });

            throw new CacheError(`Failed to delete by pattern: ${error.message}`);
        }
    }

    /**
     * Check if key exists in cache
     */
    async has(key) {
        try {
            if (!key || typeof key !== 'string') {
                return false;
            }

            const item = this.cache.get(key);

            if (!item) {
                return false;
            }

            // Check if expired
            if (this.isExpired(item)) {
                this.cache.delete(key);
                this.accessTimes.delete(key);
                return false;
            }

            return true;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.has',
                key
            });

            return false;
        }
    }

    /**
     * Clear all cache
     */
    async clear() {
        try {
            const size = this.cache.size;

            this.cache.clear();
            this.accessTimes.clear();

            // Reset metrics
            this.hitCount = 0;
            this.missCount = 0;
            this.setCount = 0;
            this.deleteCount = 0;

            logger.cache('clear', 'all', {
                clearedItems: size
            });

            return size;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.clear'
            });

            throw new CacheError(`Failed to clear cache: ${error.message}`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.hitCount + this.missCount;
        const hitRate = total > 0 ? (this.hitCount / total * 100).toFixed(2) : 0;

        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitCount: this.hitCount,
            missCount: this.missCount,
            setCount: this.setCount,
            deleteCount: this.deleteCount,
            hitRate: `${hitRate}%`,
            memoryUsage: this.getMemoryUsage(),
            oldestItem: this.getOldestItemAge(),
            newestItem: this.getNewestItemAge()
        };
    }

    /**
     * Get all cache keys
     */
    getKeys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache size
     */
    getSize() {
        return this.cache.size;
    }

    /**
     * Get or set with callback
     */
    async getOrSet(key, callback, ttl = null) {
        try {
            // Try to get from cache first
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }

            // Execute callback to get value
            const value = await callback();

            // Store in cache
            await this.set(key, value, ttl);

            return value;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.getOrSet',
                key
            });

            throw new CacheError(`Failed to getOrSet: ${error.message}`);
        }
    }

    /**
     * Increment numeric value
     */
    async increment(key, delta = 1, ttl = null) {
        try {
            const current = await this.get(key);
            const newValue = (current || 0) + delta;

            await this.set(key, newValue, ttl);

            return newValue;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.increment',
                key,
                delta
            });

            throw new CacheError(`Failed to increment: ${error.message}`);
        }
    }

    /**
     * Set with expiration time
     */
    async setex(key, value, seconds) {
        return await this.set(key, value, seconds);
    }

    /**
     * Set if not exists
     */
    async setnx(key, value, ttl = null) {
        try {
            const exists = await this.has(key);

            if (!exists) {
                await this.set(key, value, ttl);
                return true;
            }

            return false;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.setnx',
                key
            });

            throw new CacheError(`Failed to setnx: ${error.message}`);
        }
    }

    /**
     * Private helper methods
     */

    /**
     * Check if cache item has expired
     */
    isExpired(item) {
        return Date.now() > item.expiresAt;
    }

    /**
     * Serialize value for storage
     */
    serializeValue(value) {
        try {
            // Store primitives and simple objects as-is
            if (value === null ||
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean') {
                return value;
            }

            // Serialize objects and arrays
            return JSON.parse(JSON.stringify(value));

        } catch (error) {
            logger.warn('Failed to serialize cache value:', {
                error: error.message,
                valueType: typeof value
            });

            return value;
        }
    }

    /**
     * Get memory usage estimation
     */
    getMemoryUsage() {
        let totalSize = 0;

        for (const [key, item] of this.cache.entries()) {
            totalSize += key.length * 2; // String characters in UTF-16
            totalSize += this.getValueSize(item.value);
            totalSize += 64; // Estimated overhead
        }

        return `${(totalSize / 1024).toFixed(2)} KB`;
    }

    /**
     * Get value size estimation
     */
    getValueSize(value) {
        try {
            if (value === null || value === undefined) {
                return 8;
            }

            if (typeof value === 'string') {
                return value.length * 2; // UTF-16
            }

            if (typeof value === 'number' || typeof value === 'boolean') {
                return 8;
            }

            // For objects, estimate JSON size
            return JSON.stringify(value).length * 2;

        } catch (error) {
            return 100; // Default estimation
        }
    }

    /**
     * Get oldest item age
     */
    getOldestItemAge() {
        let oldest = null;

        for (const item of this.cache.values()) {
            if (!oldest || item.createdAt < oldest) {
                oldest = item.createdAt;
            }
        }

        return oldest ? `${Math.round((Date.now() - oldest) / 1000)}s` : 'N/A';
    }

    /**
     * Get newest item age
     */
    getNewestItemAge() {
        let newest = null;

        for (const item of this.cache.values()) {
            if (!newest || item.createdAt > newest) {
                newest = item.createdAt;
            }
        }

        return newest ? `${Math.round((Date.now() - newest) / 1000)}s` : 'N/A';
    }

    /**
     * Evict least recently used item
     */
    async evictLeastRecentlyUsed() {
        try {
            let lruKey = null;
            let lruTime = Date.now();

            // Find least recently used key
            for (const [key, accessTime] of this.accessTimes.entries()) {
                if (accessTime < lruTime) {
                    lruTime = accessTime;
                    lruKey = key;
                }
            }

            if (lruKey) {
                await this.delete(lruKey);

                logger.cache('evict', lruKey, {
                    reason: 'LRU',
                    accessTime: lruTime
                });
            }

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.evictLRU'
            });
        }
    }

    /**
     * Start cleanup interval for expired items
     */
    startCleanupInterval() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredItems();
        }, this.config.cleanupInterval);
    }

    /**
     * Clean up expired items
     */
    cleanupExpiredItems() {
        try {
            const expiredKeys = [];
            const now = Date.now();

            for (const [key, item] of this.cache.entries()) {
                if (now > item.expiresAt) {
                    expiredKeys.push(key);
                }
            }

            for (const key of expiredKeys) {
                this.cache.delete(key);
                this.accessTimes.delete(key);
            }

            if (expiredKeys.length > 0) {
                logger.cache('cleanup', 'expired', {
                    cleanedCount: expiredKeys.length,
                    remainingSize: this.cache.size
                });
            }

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cache.cleanup'
            });
        }
    }

    /**
     * Metrics recording methods
     */
    recordHit(key) {
        if (this.config.enableMetrics) {
            this.hitCount++;
        }
    }

    recordMiss(key) {
        if (this.config.enableMetrics) {
            this.missCount++;
        }
    }

    recordSet(key) {
        if (this.config.enableMetrics) {
            this.setCount++;
        }
    }

    recordDelete(key) {
        if (this.config.enableMetrics) {
            this.deleteCount++;
        }
    }

    /**
     * Shutdown cache service
     */
    shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }

        this.cache.clear();
        this.accessTimes.clear();

        logger.info('CacheService shutdown completed');
    }
}

export default CacheService;