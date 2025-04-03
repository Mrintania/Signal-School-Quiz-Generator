// backend/src/services/cacheService.js
import { logger } from '../utils/logger.js';

/**
 * Cache strategies
 * @enum {string}
 */
const CacheStrategy = {
    MEMORY: 'memory',
    // Could add REDIS or other strategies later
};

/**
 * Cache service for performance optimization
 */
class CacheService {
    constructor(strategy = CacheStrategy.MEMORY, options = {}) {
        this.strategy = strategy;
        this.options = {
            defaultTtl: 600, // 10 minutes
            maxItems: 1000,  // Maximum items in memory cache
            ...options
        };

        // Initialize cache storage based on strategy
        this.initializeCache();
    }

    /**
     * Initialize cache storage
     */
    initializeCache() {
        switch (this.strategy) {
            case CacheStrategy.MEMORY:
                this.cache = new Map();
                this.expiries = new Map();
                this.lastAccess = new Map();
                break;
            // Add other strategies here when implemented
            default:
                logger.warn(`Unsupported cache strategy: ${this.strategy}. Falling back to memory cache.`);
                this.strategy = CacheStrategy.MEMORY;
                this.cache = new Map();
                this.expiries = new Map();
                this.lastAccess = new Map();
        }
    }

    /**
     * Get an item from cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or undefined if not found
     */
    get(key) {
        switch (this.strategy) {
            case CacheStrategy.MEMORY:
                // Check if key exists and is not expired
                if (this.cache.has(key)) {
                    const expiry = this.expiries.get(key);

                    if (expiry > Date.now()) {
                        // Update last access time for LRU
                        this.lastAccess.set(key, Date.now());

                        return this.cache.get(key);
                    } else {
                        // Item expired, remove it
                        this.delete(key);
                    }
                }
                return undefined;

            // Add other strategies here
        }
    }

    /**
     * Set an item in cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in seconds (optional)
     */
    set(key, value, ttl = this.options.defaultTtl) {
        switch (this.strategy) {
            case CacheStrategy.MEMORY:
                // Check if cache is full and we need to evict
                if (this.cache.size >= this.options.maxItems && !this.cache.has(key)) {
                    this.evictLRU();
                }

                this.cache.set(key, value);
                this.expiries.set(key, Date.now() + (ttl * 1000));
                this.lastAccess.set(key, Date.now());
                break;

            // Add other strategies here
        }
    }

    /**
     * Delete an item from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        switch (this.strategy) {
            case CacheStrategy.MEMORY:
                this.cache.delete(key);
                this.expiries.delete(key);
                this.lastAccess.delete(key);
                break;

            // Add other strategies here
        }
    }

    /**
     * Clear all items from cache
     */
    clear() {
        switch (this.strategy) {
            case CacheStrategy.MEMORY:
                this.cache.clear();
                this.expiries.clear();
                this.lastAccess.clear();
                break;

            // Add other strategies here
        }
    }

    /**
     * Invalidate cache entries by pattern
     * @param {string} pattern - Pattern to match cache keys
     */
    invalidateByPattern(pattern) {
        switch (this.strategy) {
            case CacheStrategy.MEMORY:
                // Convert keys to array so we can iterate while deleting
                const keys = [...this.cache.keys()];

                const matchingKeys = keys.filter(key => key.includes(pattern));

                if (matchingKeys.length > 0) {
                    logger.debug(`Invalidating ${matchingKeys.length} cache keys matching pattern: ${pattern}`);

                    matchingKeys.forEach(key => this.delete(key));
                }
                break;

            // Add other strategies here
        }
    }

    /**
     * Evict least recently used items
     * @param {number} count - Number of items to evict (default: 1)
     */
    evictLRU(count = 1) {
        if (this.strategy === CacheStrategy.MEMORY) {
            // Sort keys by last access time
            const sortedKeys = [...this.lastAccess.entries()]
                .sort((a, b) => a[1] - b[1])
                .map(entry => entry[0]);

            // Evict the oldest items
            for (let i = 0; i < Math.min(count, sortedKeys.length); i++) {
                this.delete(sortedKeys[i]);
            }
        }
    }

    /**
     * Get or compute a value
     * @param {string} key - Cache key
     * @param {Function} compute - Function to compute value if not cached
     * @param {number} ttl - Time to live in seconds (optional)
     * @returns {Promise<*>} Cached or computed value
     */
    async getOrCompute(key, compute, ttl = this.options.defaultTtl) {
        const cachedValue = this.get(key);

        if (cachedValue !== undefined) {
            return cachedValue;
        }

        // Value not in cache, compute it
        const value = await compute();

        // Cache the computed value
        this.set(key, value, ttl);

        return value;
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        switch (this.strategy) {
            case CacheStrategy.MEMORY:
                return {
                    strategy: this.strategy,
                    size: this.cache.size,
                    maxItems: this.options.maxItems,
                    defaultTtl: this.options.defaultTtl
                };

            // Add other strategies here
            default:
                return {
                    strategy: this.strategy
                };
        }
    }
}

// Create a singleton instance
const cacheService = new CacheService(CacheStrategy.MEMORY);

export { cacheService, CacheService, CacheStrategy };