// backend/src/config/cache.js
/**
 * Cache Configuration
 * การตั้งค่าระบบ cache
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Cache Configuration Object
 */
const cacheConfig = {
    // Cache strategy
    strategy: process.env.CACHE_STRATEGY || 'memory', // memory, redis
    
    // Default TTL (Time To Live) in seconds
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL) || 600, // 10 minutes
    
    // Maximum number of items in memory cache
    maxItems: parseInt(process.env.CACHE_MAX_ITEMS) || 1000,
    
    // Cache key prefix
    keyPrefix: process.env.CACHE_KEY_PREFIX || 'quiz_app',
    
    // Redis configuration (if using redis strategy)
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB) || 0,
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
        lazyConnect: true,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
    },
    
    // Memory cache configuration
    memory: {
        checkperiod: 120, // Period for checking expired items (seconds)
        deleteOnExpire: true,
        maxKeys: 1000,
        stdTTL: 600 // Default TTL in seconds
    },
    
    // Cache invalidation patterns
    invalidationPatterns: {
        quiz: [
            'quiz:*',
            'quizzes:*',
            'user:*:quizzes'
        ],
        user: [
            'user:*',
            'users:*'
        ],
        dashboard: [
            'dashboard:*',
            'stats:*'
        ]
    },
    
    // Specific cache configurations for different endpoints
    endpoints: {
        // Quiz-related caching
        quizList: {
            ttl: 300, // 5 minutes
            keyGenerator: 'user'
        },
        quizDetail: {
            ttl: 600, // 10 minutes
            keyGenerator: 'quiz'
        },
        quizGeneration: {
            ttl: 1800, // 30 minutes
            keyGenerator: 'default'
        },
        
        // Dashboard caching
        dashboardStats: {
            ttl: 900, // 15 minutes
            keyGenerator: 'user'
        },
        
        // User-related caching
        userProfile: {
            ttl: 1800, // 30 minutes
            keyGenerator: 'user'
        }
    },
    
    // Cache warming settings
    warming: {
        enabled: process.env.CACHE_WARMING_ENABLED === 'true',
        interval: parseInt(process.env.CACHE_WARMING_INTERVAL) || 3600000, // 1 hour
        endpoints: [
            '/api/dashboard/stats',
            '/api/quizzes/popular',
            '/api/users/profile'
        ]
    },
    
    // Cache monitoring
    monitoring: {
        enabled: process.env.CACHE_MONITORING_ENABLED === 'true',
        logLevel: process.env.CACHE_LOG_LEVEL || 'info',
        includeHitRate: true,
        includeResponseTime: true
    }
};

export default cacheConfig;