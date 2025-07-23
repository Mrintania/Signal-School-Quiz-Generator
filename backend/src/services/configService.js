// backend/src/services/configService.js
import 'dotenv/config';
import logger from '../utils/common/Logger.js'; // ใช้ default import แทน

/**
 * Configuration Service
 * จัดการ configuration และ environment variables
 */
class ConfigService {
    constructor() {
        this.config = null;
        this.loadConfig();
    }

    /**
     * Load configuration from environment variables
     */
    loadConfig() {
        // Load configuration
        this.config = {
            // Server configuration
            server: {
                port: this._getIntEnv('PORT', 8000),
                environment: this._getEnv('NODE_ENV', 'development'),
                apiVersion: this._getEnv('API_VERSION', 'v1'),
                frontendUrl: this._getEnv('FRONTEND_URL', 'http://localhost:3000')
            },

            // Database configuration
            database: {
                host: this._getEnv('DB_HOST', 'localhost'),
                port: this._getIntEnv('DB_PORT', 3306),
                user: this._getEnv('DB_USER', 'root'),
                password: this._getEnv('DB_PASSWORD', ''),
                name: this._getEnv('DB_NAME', 'signal_school_quiz_db'),
                connectionLimit: this._getIntEnv('DB_CONNECTION_LIMIT', 10),
                queueLimit: this._getIntEnv('DB_QUEUE_LIMIT', 0),
                acquireTimeout: this._getIntEnv('DB_ACQUIRE_TIMEOUT', 60000),
                timeout: this._getIntEnv('DB_TIMEOUT', 60000),
                reconnect: this._getEnv('DB_RECONNECT', 'true') === 'true',
                slowQueryThreshold: this._getIntEnv('DB_SLOW_QUERY_THRESHOLD', 1000),
                logQueries: this._getEnv('DB_LOG_QUERIES', 'false') === 'true'
            },

            // JWT configuration
            jwt: {
                secret: this._getEnv('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production'),
                expiresIn: this._getEnv('JWT_EXPIRES_IN', '24h'),
                refreshExpiresIn: this._getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
                issuer: this._getEnv('JWT_ISSUER', 'signal-school-quiz-generator'),
                audience: this._getEnv('JWT_AUDIENCE', 'signal-school-users')
            },

            // API Keys
            apiKeys: {
                gemini: this._getEnv('GEMINI_API_KEY', ''),
                openai: this._getEnv('OPENAI_API_KEY', ''),
                anthropic: this._getEnv('ANTHROPIC_API_KEY', '')
            },

            // Email configuration
            email: {
                enabled: this._getEnv('EMAIL_ENABLED', 'false') === 'true',
                service: this._getEnv('EMAIL_SERVICE', 'gmail'),
                smtp: {
                    host: this._getEnv('SMTP_HOST', 'smtp.gmail.com'),
                    port: this._getIntEnv('SMTP_PORT', 587),
                    secure: this._getEnv('SMTP_SECURE', 'false') === 'true',
                    user: this._getEnv('SMTP_USER', ''),
                    password: this._getEnv('SMTP_PASSWORD', '')
                },
                from: {
                    name: this._getEnv('EMAIL_FROM_NAME', 'Signal School Quiz Generator'),
                    address: this._getEnv('EMAIL_FROM_ADDRESS', 'noreply@signalschool.ac.th')
                },
                // Development email settings
                devSmtp: {
                    host: this._getEnv('DEV_SMTP_HOST', 'localhost'),
                    port: this._getIntEnv('DEV_SMTP_PORT', 1025),
                    user: this._getEnv('DEV_SMTP_USER', ''),
                    password: this._getEnv('DEV_SMTP_PASSWORD', '')
                }
            },

            // Rate limiting
            rateLimit: {
                general: {
                    windowMs: this._getIntEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
                    max: this._getIntEnv('RATE_LIMIT_MAX', 100)
                },
                auth: {
                    windowMs: this._getIntEnv('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
                    max: this._getIntEnv('AUTH_RATE_LIMIT_MAX', 5)
                },
                aiGeneration: {
                    windowMs: this._getIntEnv('AI_RATE_LIMIT_WINDOW_MS', 60 * 1000), // 1 minute
                    max: this._getIntEnv('AI_RATE_LIMIT_MAX', 10)
                }
            },

            // File storage
            storage: {
                type: this._getEnv('STORAGE_TYPE', 'local'), // local, cloudinary, s3
                local: {
                    uploadPath: this._getEnv('LOCAL_UPLOAD_PATH', 'uploads'),
                    maxFileSize: this._getIntEnv('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
                    allowedTypes: this._getEnv('ALLOWED_FILE_TYPES', 'pdf,doc,docx,txt,csv,xls,xlsx').split(',')
                },
                cloudinary: {
                    cloudName: this._getEnv('CLOUDINARY_CLOUD_NAME', ''),
                    apiKey: this._getEnv('CLOUDINARY_API_KEY', ''),
                    apiSecret: this._getEnv('CLOUDINARY_API_SECRET', '')
                }
            },

            // Security
            security: {
                bcryptRounds: this._getIntEnv('BCRYPT_ROUNDS', 12),
                sessionSecret: this._getEnv('SESSION_SECRET', 'your-session-secret-change-this'),
                corsOrigins: this._getEnv('CORS_ORIGINS', 'http://localhost:3000').split(','),
                trustedProxies: this._getEnv('TRUSTED_PROXIES', '').split(',').filter(Boolean)
            },

            // Logging
            logging: {
                level: this._getEnv('LOG_LEVEL', process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
                enableFileLogging: this._getEnv('ENABLE_FILE_LOGGING', 'true') === 'true',
                enableConsoleLogging: this._getEnv('ENABLE_CONSOLE_LOGGING', 'true') === 'true',
                maxFileSize: this._getIntEnv('LOG_MAX_FILE_SIZE', 5 * 1024 * 1024), // 5MB
                maxFiles: this._getIntEnv('LOG_MAX_FILES', 5)
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
        let value = this.config;

        // Navigate through the object
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    /**
     * Set configuration value
     * @param {string} key - Configuration key (dot notation)
     * @param {*} value - Value to set
     */
    set(key, value) {
        const keys = key.split('.');
        let current = this.config;

        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!current[k] || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }

        // Set the final value
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Check if running in development mode
     * @returns {boolean} True if in development mode
     */
    isDevelopment() {
        return this.get('server.environment') === 'development';
    }

    /**
     * Check if running in production mode
     * @returns {boolean} True if in production mode
     */
    isProduction() {
        return this.get('server.environment') === 'production';
    }

    /**
     * Check if running in test mode
     * @returns {boolean} True if in test mode
     */
    isTest() {
        return this.get('server.environment') === 'test';
    }

    /**
     * Get all configuration (sanitized)
     * @returns {Object} Complete configuration without sensitive data
     */
    getAll() {
        const config = { ...this.config };

        // Remove sensitive information
        if (config.database) {
            delete config.database.password;
        }
        if (config.jwt) {
            delete config.jwt.secret;
        }
        if (config.email?.smtp) {
            delete config.email.smtp.password;
        }
        if (config.email?.devSmtp) {
            delete config.email.devSmtp.password;
        }
        if (config.apiKeys) {
            config.apiKeys = Object.keys(config.apiKeys).reduce((acc, key) => {
                acc[key] = config.apiKeys[key] ? '***' : '';
                return acc;
            }, {});
        }

        return config;
    }

    /**
     * Validate required configuration
     * @throws {Error} If required configuration is missing
     */
    validate() {
        const required = [
            'jwt.secret',
            'database.host',
            'database.user',
            'database.name'
        ];

        const missing = required.filter(key => !this.get(key));

        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        // Validate API keys if AI features are enabled
        if (!this.get('apiKeys.gemini') && !this.get('apiKeys.openai') && !this.get('apiKeys.anthropic')) {
            logger.warn('No AI API keys configured. AI features will not work.');
        }

        logger.info('Configuration validation passed');
    }

    /**
     * Reload configuration
     */
    reload() {
        logger.info('Reloading configuration...');
        this.loadConfig();
        this.validate();
        logger.info('Configuration reloaded successfully');
    }
}

// Create singleton instance
const configService = new ConfigService();

// Validate configuration on load
try {
    configService.validate();
} catch (error) {
    logger.error('Configuration validation failed:', error);
    process.exit(1);
}

export default configService;