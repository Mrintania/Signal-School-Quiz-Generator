// backend/src/services/configService.js
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Service for centralized configuration management
 */
class ConfigService {
    constructor() {
        this.config = {
            // Server configuration
            server: {
                port: this._getEnv('PORT', 3001),
                environment: this._getEnv('NODE_ENV', 'development'),
                frontendUrl: this._getEnv('FRONTEND_URL', 'http://localhost:3000'),
                skipAuth: this._getEnv('SKIP_AUTH', 'false') === 'true',
                logAuth: this._getEnv('LOG_AUTH', 'false') === 'true'
            },

            // Database configuration
            database: {
                host: this._getEnv('DB_HOST', 'localhost'),
                user: this._getEnv('DB_USER', 'root'),
                password: this._getEnv('DB_PASSWORD', ''),
                name: this._getEnv('DB_NAME', 'quiz_generator'),
                connectionLimit: this._getIntEnv('DB_CONNECTION_LIMIT', 10),
                queueLimit: this._getIntEnv('DB_QUEUE_LIMIT', 0)
            },

            // JWT configuration
            jwt: {
                secret: this._getEnv('JWT_SECRET', 'your_jwt_secret_key_here'),
                expiresIn: this._getEnv('JWT_EXPIRES_IN', '24h')
            },

            // Email configuration
            email: {
                from: this._getEnv('EMAIL_FROM', 'Signal School Quiz Generator <no-reply@signalschool.com>'),
                // Production SMTP settings
                smtp: {
                    host: this._getEnv('SMTP_HOST', ''),
                    port: this._getIntEnv('SMTP_PORT', 587),
                    secure: this._getEnv('SMTP_SECURE', 'false') === 'true',
                    user: this._getEnv('SMTP_USER', ''),
                    password: this._getEnv('SMTP_PASSWORD', '')
                },
                // Development SMTP settings
                devSmtp: {
                    host: this._getEnv('DEV_SMTP_HOST', ''),
                    port: this._getIntEnv('DEV_SMTP_PORT', 587),
                    secure: this._getEnv('DEV_SMTP_SECURE', 'false') === 'true',
                    user: this._getEnv('DEV_SMTP_USER', ''),
                    password: this._getEnv('DEV_SMTP_PASSWORD', '')
                }
            },

            // API keys
            apiKeys: {
                googleGeminiApiKey: this._getEnv('GOOGLE_GEMINI_API_KEY', '')
            },

            // Rate limiting
            rateLimiter: {
                general: {
                    windowMs: this._getIntEnv('RATE_LIMIT_GENERAL_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
                    max: this._getIntEnv('RATE_LIMIT_GENERAL_MAX', 100) // 100 requests per 15 minutes
                },
                auth: {
                    windowMs: this._getIntEnv('RATE_LIMIT_AUTH_WINDOW_MS', 60 * 60 * 1000), // 1 hour
                    max: this._getIntEnv('RATE_LIMIT_AUTH_MAX', 10) // 10 requests per hour
                },
                aiGeneration: {
                    windowMs: this._getIntEnv('RATE_LIMIT_AI_WINDOW_MS', 60 * 60 * 1000), // 1 hour
                    max: this._getIntEnv('RATE_LIMIT_AI_MAX', 20) // 20 requests per hour
                }
            },

            // Caching
            cache: {
                strategy: this._getEnv('CACHE_STRATEGY', 'memory'),
                defaultTtl: this._getIntEnv('CACHE_DEFAULT_TTL', 600), // 10 minutes
                maxItems: this._getIntEnv('CACHE_MAX_ITEMS', 1000)
            },

            // Upload limits
            upload: {
                maxFileSize: this._getIntEnv('UPLOAD_MAX_FILE_SIZE', 2 * 1024 * 1024), // 2 MB
                allowedTypes: this._getEnv('UPLOAD_ALLOWED_TYPES', 'image/jpeg,image/png,image/gif').split(',')
            }
        };

        // Log config loading (excluding sensitive data)
        const sanitizedConfig = { ...this.config };
        delete sanitizedConfig.database.password;
        delete sanitizedConfig.jwt.secret;
        delete sanitizedConfig.email.smtp.password;
        delete sanitizedConfig.email.devSmtp.password;
        delete sanitizedConfig.apiKeys;

        logger.debug('Configuration loaded:', sanitizedConfig);
    }

    /**
     * Get environment variable with fallback
     * @param {string} key - Environment variable name
     * @param {string} defaultValue - Default value if not set
     * @returns {string} Environment variable value or default
     * @private
     */
    _getEnv(key, defaultValue) {
        return process.env[key] || defaultValue;
    }

    /**
     * Get environment variable as integer with fallback
     * @param {string} key - Environment variable name
     * @param {number} defaultValue - Default value if not set
     * @returns {number} Environment variable value as integer or default
     * @private
     */
    _getIntEnv(key, defaultValue) {
        const value = process.env[key];
        return value ? parseInt(value, 10) : defaultValue;
    }

    /**
     * Get configuration value
     * @param {string} key - Configuration key (dot notation)
     * @param {*} defaultValue - Default value if not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue = null) {
        // Split the key by dots
        const keys = key.split('.');

        // Traverse the config object
        let result = this.config;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return defaultValue;
            }
        }

        return result;
    }

    /**
     * Get all configuration
     * @returns {Object} Full configuration object
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Check if environment is production
     * @returns {boolean} True if production
     */
    isProduction() {
        return this.config.server.environment === 'production';
    }

    /**
     * Check if environment is development
     * @returns {boolean} True if development
     */
    isDevelopment() {
        return this.config.server.environment === 'development';
    }

    /**
     * Check if environment is test
     * @returns {boolean} True if test
     */
    isTest() {
        return this.config.server.environment === 'test';
    }
}

// Create a singleton instance
const configService = new ConfigService();

export default configService;