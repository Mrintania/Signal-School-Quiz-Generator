// backend/src/services/common/CacheService.js
import redis from 'redis';
import logger from '../../utils/logger.js';

/**
 * Cache Service
 * จัดการ caching ด้วย Redis หรือ Memory cache
 */
export class CacheService {
    constructor() {
        this.useRedis = process.env.REDIS_URL || process.env.NODE_ENV === 'production';
        this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour

        if (this.useRedis) {
            this.initRedis();
        } else {
            this.initMemoryCache();
        }
    }

    async initRedis() {
        try {
            this.client = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379'
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error:', err);
            });

            this.client.on('connect', () => {
                logger.info('Connected to Redis');
            });

            await this.client.connect();
            this.isConnected = true;
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            this.fallbackToMemory();
        }
    }

    initMemoryCache() {
        this.cache = new Map();
        this.timers = new Map();
        this.isConnected = true;
        logger.info('Using memory cache');
    }

    fallbackToMemory() {
        logger.warn('Falling back to memory cache');
        this.useRedis = false;
        this.initMemoryCache();
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<*>} Cached value or null
     */
    async get(key) {
        try {
            if (this.useRedis && this.isConnected) {
                const value = await this.client.get(key);
                return value ? JSON.parse(value) : null;
            } else {
                return this.cache.get(key) || null;
            }
        } catch (error) {
            logger.error('Cache get error:', { key, error: error.message });
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            if (this.useRedis && this.isConnected) {
                await this.client.setEx(key, ttl, JSON.stringify(value));
                return true;
            } else {
                this.cache.set(key, value);

                // Set expiry timer
                if (this.timers.has(key)) {
                    clearTimeout(this.timers.get(key));
                }

                const timer = setTimeout(() => {
                    this.cache.delete(key);
                    this.timers.delete(key);
                }, ttl * 1000);

                this.timers.set(key, timer);
                return true;
            }
        } catch (error) {
            logger.error('Cache set error:', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        try {
            if (this.useRedis && this.isConnected) {
                await this.client.del(key);
                return true;
            } else {
                if (this.timers.has(key)) {
                    clearTimeout(this.timers.get(key));
                    this.timers.delete(key);
                }
                return this.cache.delete(key);
            }
        } catch (error) {
            logger.error('Cache delete error:', { key, error: error.message });
            return false;
        }
    }

    /**
     * Clear all cache
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        try {
            if (this.useRedis && this.isConnected) {
                await this.client.flushAll();
                return true;
            } else {
                this.cache.clear();
                this.timers.forEach(timer => clearTimeout(timer));
                this.timers.clear();
                return true;
            }
        } catch (error) {
            logger.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * Invalidate cache by pattern
     * @param {string} pattern - Pattern to match
     * @returns {Promise<number>} Number of keys deleted
     */
    async invalidatePattern(pattern) {
        try {
            if (this.useRedis && this.isConnected) {
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    await this.client.del(keys);
                }
                return keys.length;
            } else {
                let count = 0;
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));

                for (const key of this.cache.keys()) {
                    if (regex.test(key)) {
                        await this.delete(key);
                        count++;
                    }
                }
                return count;
            }
        } catch (error) {
            logger.error('Cache pattern invalidation error:', { pattern, error: error.message });
            return 0;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Key exists
     */
    async exists(key) {
        try {
            if (this.useRedis && this.isConnected) {
                return await this.client.exists(key) === 1;
            } else {
                return this.cache.has(key);
            }
        } catch (error) {
            logger.error('Cache exists error:', { key, error: error.message });
            return false;
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    async getStats() {
        try {
            if (this.useRedis && this.isConnected) {
                const info = await this.client.info('memory');
                return {
                    type: 'redis',
                    connected: this.isConnected,
                    memory: info
                };
            } else {
                return {
                    type: 'memory',
                    connected: this.isConnected,
                    keys: this.cache.size,
                    timers: this.timers.size
                };
            }
        } catch (error) {
            return {
                type: this.useRedis ? 'redis' : 'memory',
                connected: false,
                error: error.message
            };
        }
    }

    /**
     * Close cache connection
     */
    async close() {
        try {
            if (this.useRedis && this.client) {
                await this.client.quit();
            } else {
                this.timers.forEach(timer => clearTimeout(timer));
                this.cache.clear();
                this.timers.clear();
            }
            this.isConnected = false;
        } catch (error) {
            logger.error('Error closing cache:', error);
        }
    }
}