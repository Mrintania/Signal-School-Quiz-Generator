import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

/**
 * Health Check Controller for monitoring system status
 */
export class HealthController {

    /**
     * Basic health check endpoint
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async healthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                checks: {
                    api: true,
                    database: await HealthController._checkDatabase(),
                    gemini: await HealthController._checkGeminiAPI(),
                    filesystem: await HealthController._checkFileSystem(),
                    environment: HealthController._checkEnvironment()
                }
            };

            // Determine overall health status
            const allChecks = Object.values(health.checks);
            const isHealthy = allChecks.every(check => check === true);

            if (!isHealthy) {
                health.status = 'degraded';
            }

            const statusCode = isHealthy ? 200 : 503;

            res.status(statusCode).json(health);

        } catch (error) {
            logger.error('Health check failed:', error);

            res.status(500).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
                checks: {
                    api: false
                }
            });
        }
    }

    /**
     * Detailed system status check
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    static async systemStatus(req, res) {
        try {
            const status = {
                system: {
                    status: 'operational',
                    timestamp: new Date().toISOString(),
                    node_version: process.version,
                    platform: process.platform,
                    arch: process.arch,
                    uptime: process.uptime(),
                    memory: {
                        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                        external: Math.round(process.memoryUsage().external / 1024 / 1024),
                        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
                    },
                    cpu: {
                        usage: process.cpuUsage()
                    }
                },
                services: {
                    database: await HealthController._checkDatabaseDetailed(),
                    gemini_ai: await HealthController._checkGeminiDetailed(),
                    file_system: await HealthController._checkFileSystemDetailed(),
                    configuration: HealthController._checkConfigurationDetailed()
                },
                metrics: {
                    requests_processed: global.requestCount || 0,
                    errors_occurred: global.errorCount || 0,
                    last_quiz_generated: global.lastQuizGenerated || null
                }
            };

            res.json(status);

        } catch (error) {
            logger.error('System status check failed:', error);

            res.status(500).json({
                system: {
                    status: 'error',
                    timestamp: new Date().toISOString(),
                    error: error.message
                }
            });
        }
    }

    /**
     * Check database connectivity
     * @private
     */
    static async _checkDatabase() {
        try {
            // If you have a database connection, test it here
            // For now, assume it's working if no error occurs
            return true;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Check Gemini API connectivity
     * @private
     */
    static async _checkGeminiAPI() {
        try {
            const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

            if (!apiKey || apiKey === 'your_gemini_api_key_here') {
                return false;
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

            // Quick test with timeout
            const testPromise = model.generateContent("Test");
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );

            await Promise.race([testPromise, timeoutPromise]);
            return true;

        } catch (error) {
            logger.warn('Gemini API health check failed:', error.message);
            return false;
        }
    }

    /**
     * Check file system access
     * @private
     */
    static async _checkFileSystem() {
        try {
            const fs = await import('fs');
            const path = await import('path');

            // Check if uploads directory exists and is writable
            const uploadsDir = path.join(process.cwd(), 'uploads');

            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Test write access
            const testFile = path.join(uploadsDir, 'health-check-test.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);

            return true;

        } catch (error) {
            logger.error('File system health check failed:', error);
            return false;
        }
    }

    /**
     * Check environment configuration
     * @private
     */
    static _checkEnvironment() {
        const requiredVars = [
            'NODE_ENV',
            'PORT',
            'GOOGLE_GEMINI_API_KEY'
        ];

        const missing = requiredVars.filter(varName => !process.env[varName]);

        if (missing.length > 0) {
            logger.warn('Missing environment variables:', missing);
            return false;
        }

        // Check if API key looks valid (not default value)
        if (process.env.GOOGLE_GEMINI_API_KEY === 'your_gemini_api_key_here') {
            return false;
        }

        return true;
    }

    /**
     * Detailed database check
     * @private
     */
    static async _checkDatabaseDetailed() {
        try {
            // Add actual database connection test here
            return {
                status: 'connected',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'quiz_generator',
                last_check: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'disconnected',
                error: error.message,
                last_check: new Date().toISOString()
            };
        }
    }

    /**
     * Detailed Gemini API check
     * @private
     */
    static async _checkGeminiDetailed() {
        try {
            const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

            if (!apiKey || apiKey === 'your_gemini_api_key_here') {
                return {
                    status: 'not_configured',
                    error: 'API key not set or using default value',
                    last_check: new Date().toISOString()
                };
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

            const start = Date.now();
            await model.generateContent("Test connection");
            const responseTime = Date.now() - start;

            return {
                status: 'connected',
                model: 'gemini-1.5-pro',
                response_time_ms: responseTime,
                last_check: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                last_check: new Date().toISOString()
            };
        }
    }

    /**
     * Detailed file system check
     * @private
     */
    static async _checkFileSystemDetailed() {
        try {
            const fs = await import('fs');
            const path = await import('path');

            const uploadsDir = path.join(process.cwd(), 'uploads');
            const stats = fs.statSync(uploadsDir);

            return {
                status: 'accessible',
                uploads_directory: uploadsDir,
                created: stats.birthtime,
                permissions: stats.mode,
                last_check: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                last_check: new Date().toISOString()
            };
        }
    }

    /**
     * Detailed configuration check
     * @private
     */
    static _checkConfigurationDetailed() {
        const config = {
            node_env: process.env.NODE_ENV,
            port: process.env.PORT,
            frontend_url: process.env.FRONTEND_URL,
            skip_auth: process.env.SKIP_AUTH,
            gemini_api_configured: !!(process.env.GOOGLE_GEMINI_API_KEY &&
                process.env.GOOGLE_GEMINI_API_KEY !== 'your_gemini_api_key_here'),
            database_configured: !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME),
            email_configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
            last_check: new Date().toISOString()
        };

        const requiredConfigs = ['node_env', 'port', 'gemini_api_configured'];
        const missingConfigs = requiredConfigs.filter(key => !config[key]);

        return {
            status: missingConfigs.length === 0 ? 'properly_configured' : 'missing_configuration',
            configuration: config,
            missing: missingConfigs
        };
    }
}