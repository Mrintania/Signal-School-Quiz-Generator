// backend/src/middlewares/cache/CacheMiddleware.js
import logger from '../../utils/common/Logger.js';
import { CacheService } from '../../services/common/CacheService.js';

/**
 * Cache Middleware
 * จัดการ caching สำหรับ HTTP requests
 * รองรับ GET, POST และ cache invalidation
 */
export class CacheMiddleware {
    constructor(cacheService) {
        this.cacheService = cacheService || new CacheService();

        // Configuration
        this.config = {
            defaultTTL: 300, // 5 minutes
            maxKeyLength: 250,
            headerPrefix: 'X-Cache',
            skipCacheHeader: 'X-Skip-Cache',
            cacheKeyHeader: 'X-Cache-Key',
            enableEtag: true,
            enableLastModified: true
        };

        // Cache key generators
        this.keyGenerators = {
            default: this.generateDefaultKey.bind(this),
            user: this.generateUserKey.bind(this),
            quiz: this.generateQuizKey.bind(this),
            search: this.generateSearchKey.bind(this)
        };
    }

    /**
     * Create cache middleware for GET requests
     * @param {string} keyPrefix - Cache key prefix
     * @param {number} ttl - Time to live in seconds
     * @param {Object} options - Additional options
     */
    get(keyPrefix, ttl = this.config.defaultTTL, options = {}) {
        return async (req, res, next) => {
            try {
                // Skip caching for non-GET requests
                if (req.method !== 'GET') {
                    return next();
                }

                // Skip if cache is disabled for this request
                if (req.headers[this.config.skipCacheHeader]) {
                    logger.debug('Cache skipped due to header', { path: req.path });
                    return next();
                }

                // Generate cache key
                const cacheKey = this.generateCacheKey(keyPrefix, req, options);

                // Try to get from cache
                const cachedData = await this.cacheService.get(cacheKey);

                if (cachedData) {
                    // Cache hit
                    this.handleCacheHit(req, res, cachedData, cacheKey);
                    return;
                }

                // Cache miss - set up response interception
                this.setupResponseInterception(req, res, cacheKey, ttl, options);

                logger.cache('miss', cacheKey, {
                    path: req.path,
                    userId: req.user?.userId
                });

                next();

            } catch (error) {
                logger.errorWithContext(error, {
                    operation: 'cache.get',
                    path: req.path,
                    keyPrefix
                });

                // Continue without cache on error
                next();
            }
        };
    }

    /**
     * Create cache invalidation middleware
     * @param {Array|string} patterns - Cache key patterns to invalidate
     */
    invalidate(patterns) {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

        return async (req, res, next) => {
            try {
                // Store original end function
                const originalEnd = res.end;

                // Override end function to invalidate cache after response
                res.end = async function (chunk, encoding) {
                    // Call original end function first
                    originalEnd.call(this, chunk, encoding);

                    // Only invalidate on successful operations
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        await this.invalidateCachePatterns(patternsArray, req);
                    }
                }.bind(this);

                next();

            } catch (error) {
                logger.errorWithContext(error, {
                    operation: 'cache.invalidate',
                    patterns: patternsArray,
                    path: req.path
                });

                next();
            }
        };
    }

    /**
     * Create cache warming middleware
     * @param {Function} warmer - Function to warm cache
     */
    warm(warmer) {
        return async (req, res, next) => {
            try {
                // Run cache warming in background
                setImmediate(async () => {
                    try {
                        await warmer(req);
                        logger.cache('warm', 'background', {
                            path: req.path,
                            userId: req.user?.userId
                        });
                    } catch (warmError) {
                        logger.warn('Cache warming failed:', warmError.message);
                    }
                });

                next();

            } catch (error) {
                logger.errorWithContext(error, {
                    operation: 'cache.warm',
                    path: req.path
                });

                next();
            }
        };
    }

    /**
     * Create conditional cache middleware
     * @param {Function} condition - Function to determine if caching should be used
     * @param {string} keyPrefix - Cache key prefix
     * @param {number} ttl - Time to live
     */
    conditional(condition, keyPrefix, ttl = this.config.defaultTTL) {
        return async (req, res, next) => {
            try {
                const shouldCache = await condition(req);

                if (shouldCache) {
                    return this.get(keyPrefix, ttl)(req, res, next);
                }

                next();

            } catch (error) {
                logger.errorWithContext(error, {
                    operation: 'cache.conditional',
                    path: req.path
                });

                next();
            }
        };
    }

    /**
     * Create cache-only middleware (serve only from cache)
     * @param {string} keyPrefix - Cache key prefix
     */
    only(keyPrefix) {
        return async (req, res, next) => {
            try {
                const cacheKey = this.generateCacheKey(keyPrefix, req);
                const cachedData = await this.cacheService.get(cacheKey);

                if (cachedData) {
                    this.handleCacheHit(req, res, cachedData, cacheKey);
                    return;
                }

                // No cache data available
                res.status(503).json({
                    success: false,
                    message: 'Service temporarily unavailable',
                    error: 'CACHE_ONLY_NO_DATA',
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.errorWithContext(error, {
                    operation: 'cache.only',
                    path: req.path
                });

                res.status(500).json({
                    success: false,
                    message: 'Cache service error',
                    timestamp: new Date().toISOString()
                });
            }
        };
    }

    /**
     * Handle cache hit
     */
    handleCacheHit(req, res, cachedData, cacheKey) {
        // Set cache headers
        res.setHeader(`${this.config.headerPrefix}-Status`, 'HIT');
        res.setHeader(`${this.config.headerPrefix}-Key`, cacheKey);
        res.setHeader(`${this.config.headerPrefix}-Age`, this.getCacheAge(cachedData));

        // Set ETag if enabled
        if (this.config.enableEtag) {
            const etag = this.generateETag(cachedData);
            res.setHeader('ETag', etag);

            // Check if client has cached version
            if (req.headers['if-none-match'] === etag) {
                res.status(304).end();
                return;
            }
        }

        // Set Last-Modified if enabled
        if (this.config.enableLastModified && cachedData.lastModified) {
            res.setHeader('Last-Modified', cachedData.lastModified);

            // Check if-modified-since
            const ifModifiedSince = req.headers['if-modified-since'];
            if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(cachedData.lastModified)) {
                res.status(304).end();
                return;
            }
        }

        // Send cached response
        if (cachedData.headers) {
            Object.keys(cachedData.headers).forEach(header => {
                res.setHeader(header, cachedData.headers[header]);
            });
        }

        res.status(cachedData.statusCode || 200).json(cachedData.data);

        logger.cache('hit', cacheKey, {
            path: req.path,
            userId: req.user?.userId,
            age: this.getCacheAge(cachedData)
        });
    }

    /**
     * Setup response interception for caching
     */
    setupResponseInterception(req, res, cacheKey, ttl, options) {
        const originalJson = res.json;
        const originalSend = res.send;

        // Override json method
        res.json = function (data) {
            this.cacheResponseData(cacheKey, {
                data,
                statusCode: res.statusCode,
                headers: this.extractCacheableHeaders(res),
                lastModified: new Date().toISOString(),
                cachedAt: new Date().toISOString()
            }, ttl, options);

            return originalJson.call(this, data);
        }.bind(this);

        // Override send method
        res.send = function (data) {
            this.cacheResponseData(cacheKey, {
                data,
                statusCode: res.statusCode,
                headers: this.extractCacheableHeaders(res),
                lastModified: new Date().toISOString(),
                cachedAt: new Date().toISOString()
            }, ttl, options);

            return originalSend.call(this, data);
        }.bind(this);

        // Set cache headers
        res.setHeader(`${this.config.headerPrefix}-Status`, 'MISS');
        res.setHeader(`${this.config.headerPrefix}-Key`, cacheKey);
    }

    /**
     * Cache response data
     */
    async cacheResponseData(cacheKey, responseData, ttl, options) {
        try {
            // Only cache successful responses by default
            const { cacheErrorResponses = false, minStatusCode = 200, maxStatusCode = 299 } = options;

            if (!cacheErrorResponses &&
                (responseData.statusCode < minStatusCode || responseData.statusCode > maxStatusCode)) {
                return;
            }

            await this.cacheService.set(cacheKey, responseData, ttl);

            logger.cache('set', cacheKey, {
                statusCode: responseData.statusCode,
                ttl,
                size: JSON.stringify(responseData).length
            });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'cacheResponseData',
                cacheKey
            });
        }
    }

    /**
     * Generate cache key
     */
    generateCacheKey(prefix, req, options = {}) {
        const { keyGenerator = 'default', includeHeaders = [], excludeQuery = [] } = options;

        // Use specified key generator
        const generator = this.keyGenerators[keyGenerator] || this.keyGenerators.default;
        let key = generator(prefix, req, options);

        // Include specific headers
        if (includeHeaders.length > 0) {
            const headerParts = includeHeaders
                .map(header => `${header}:${req.headers[header] || ''}`)
                .join('|');
            key += `:h:${headerParts}`;
        }

        // Include user context
        if (req.user?.userId) {
            key += `:u:${req.user.userId}`;
        }

        // Ensure key length doesn't exceed limit
        if (key.length > this.config.maxKeyLength) {
            const hash = this.hashString(key);
            key = `${prefix}:${hash}`;
        }

        return key;
    }

    /**
     * Default key generator
     */
    generateDefaultKey(prefix, req, options) {
        const queryString = this.buildQueryString(req.query, options.excludeQuery);
        return `${prefix}:${req.path}${queryString ? `:${queryString}` : ''}`;
    }

    /**
     * User-specific key generator
     */
    generateUserKey(prefix, req, options) {
        const baseKey = this.generateDefaultKey(prefix, req, options);
        return `${baseKey}:user:${req.user?.userId || 'anonymous'}`;
    }

    /**
     * Quiz-specific key generator
     */
    generateQuizKey(prefix, req, options) {
        const quizId = req.params.id || req.params.quizId;
        const baseKey = this.generateDefaultKey(prefix, req, options);
        return quizId ? `${baseKey}:quiz:${quizId}` : baseKey;
    }

    /**
     * Search-specific key generator
     */
    generateSearchKey(prefix, req, options) {
        const searchParams = ['query', 'category', 'difficulty', 'page', 'limit'];
        const searchQuery = searchParams
            .filter(param => req.query[param])
            .map(param => `${param}:${req.query[param]}`)
            .join('|');

        return `${prefix}:search:${this.hashString(searchQuery)}`;
    }

    /**
     * Build query string for cache key
     */
    buildQueryString(query, excludeParams = []) {
        return Object.keys(query)
            .filter(key => !excludeParams.includes(key))
            .sort()
            .map(key => `${key}=${encodeURIComponent(query[key])}`)
            .join('&');
    }

    /**
     * Extract cacheable headers
     */
    extractCacheableHeaders(res) {
        const cacheableHeaders = [
            'content-type',
            'content-language',
            'content-encoding'
        ];

        const headers = {};
        cacheableHeaders.forEach(header => {
            const value = res.getHeader(header);
            if (value) {
                headers[header] = value;
            }
        });

        return headers;
    }

    /**
     * Invalidate cache patterns
     */
    async invalidateCachePatterns(patterns, req) {
        try {
            for (const pattern of patterns) {
                // Replace placeholders with actual values
                const expandedPattern = this.expandCachePattern(pattern, req);
                const deleted = await this.cacheService.deletePattern(expandedPattern);

                logger.cache('invalidate', expandedPattern, {
                    deletedCount: deleted,
                    userId: req.user?.userId
                });
            }
        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'invalidateCachePatterns',
                patterns
            });
        }
    }

    /**
     * Expand cache pattern with request data
     */
    expandCachePattern(pattern, req) {
        return pattern
            .replace(':userId', req.user?.userId || '*')
            .replace(':quizId', req.params.id || req.params.quizId || '*')
            .replace(':path', req.path.replace(/\//g, ':'));
    }

    /**
     * Generate ETag for cached data
     */
    generateETag(data) {
        const content = JSON.stringify(data);
        return `"${this.hashString(content)}"`;
    }

    /**
     * Get cache age in seconds
     */
    getCacheAge(cachedData) {
        if (!cachedData.cachedAt) return 0;
        return Math.floor((Date.now() - new Date(cachedData.cachedAt).getTime()) / 1000);
    }

    /**
     * Hash string for cache keys
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            cacheService: this.cacheService.getStats(),
            config: this.config,
            keyGenerators: Object.keys(this.keyGenerators)
        };
    }

    /**
     * Clear all cache
     */
    async clearAll() {
        return await this.cacheService.clear();
    }
}

export default CacheMiddleware;