// backend/src/index.js
/**
 * Main Application Index File
 * Entry point สำหรับ backend application
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import configurations
import { database } from './config/index.js';

// Import middleware
import errorHandlingMiddleware from './middlewares/error/ErrorHandlingMiddleware.js';
import { authenticateToken } from './middlewares/auth.js';
import { rateLimiter } from './middlewares/rateLimiter.js';

// Import utils
import logger from './utils/common/Logger.js';

// Import services
import { CacheService } from './services/common/CacheService.js';

/**
 * Dynamic Route Importer
 * นำเข้า routes โดยตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
 */
async function importRoutes() {
    const routes = {};

    try {
        // Import only existing route files
        const { default: newQuizRoutes } = await import('./routes/quiz/newQuizRoutes.js');
        routes.newQuizRoutes = newQuizRoutes;
    } catch (error) {
        logger.warn('newQuizRoutes not found, skipping...');
    }

    try {
        const { default: authRoutes } = await import('./routes/authRoutes.js');
        routes.authRoutes = authRoutes;
    } catch (error) {
        logger.warn('authRoutes not found, skipping...');
    }

    try {
        const { default: userRoutes } = await import('./routes/userRoutes.js');
        routes.userRoutes = userRoutes;
    } catch (error) {
        logger.warn('userRoutes not found, skipping...');
    }

    try {
        const { default: adminRoutes } = await import('./routes/adminRoutes.js');
        routes.adminRoutes = adminRoutes;
    } catch (error) {
        logger.warn('adminRoutes not found, skipping...');
    }

    try {
        const { default: dashboardRoutes } = await import('./routes/dashboardRoutes.js');
        routes.dashboardRoutes = dashboardRoutes;
    } catch (error) {
        logger.warn('dashboardRoutes not found, skipping...');
    }

    try {
        const { default: schoolRoutes } = await import('./routes/schoolRoutes.js');
        routes.schoolRoutes = schoolRoutes;
    } catch (error) {
        logger.warn('schoolRoutes not found, skipping...');
    }

    return routes;
}

/**
 * Application Factory
 * สร้าง Express application พร้อม configuration
 */
class ApplicationFactory {
    static async create() {
        const app = express();

        // Initialize services
        const cacheService = new CacheService();

        // Security middleware
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            },
            crossOriginEmbedderPolicy: false
        }));

        // CORS configuration
        app.use(cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Compression
        app.use(compression());

        // Body parsing
        app.use(express.json({
            limit: '10mb',
            verify: (req, res, buf) => {
                // Store raw body for webhook verification if needed
                req.rawBody = buf;
            }
        }));
        app.use(express.urlencoded({
            extended: true,
            limit: '10mb'
        }));

        // Request logging
        app.use((req, res, next) => {
            const start = Date.now();

            res.on('finish', () => {
                const duration = Date.now() - start;
                logger.info(`${req.method} ${req.path}`, {
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            });

            next();
        });

        // Global rate limiting
        app.use(rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // Limit each IP to 1000 requests per windowMs
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later.',
                error: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
        }));

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Signal School Quiz Generator Backend is running',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                version: process.env.APP_VERSION || '2.0.0'
            });
        });

        // Import and setup routes dynamically
        const routes = await importRoutes();

        // API Routes - only register if imported successfully
        if (routes.authRoutes) {
            app.use('/api/auth', routes.authRoutes);
            logger.info('Auth routes registered');
        }

        if (routes.userRoutes) {
            app.use('/api/users', routes.userRoutes);
            logger.info('User routes registered');
        }

        if (routes.newQuizRoutes) {
            app.use('/api/quiz', routes.newQuizRoutes);
            logger.info('Quiz routes registered');
        }

        if (routes.adminRoutes) {
            app.use('/api/admin', routes.adminRoutes);
            logger.info('Admin routes registered');
        }

        if (routes.dashboardRoutes) {
            app.use('/api/dashboard', routes.dashboardRoutes);
            logger.info('Dashboard routes registered');
        }

        if (routes.schoolRoutes) {
            app.use('/api/school', routes.schoolRoutes);
            logger.info('School routes registered');
        }

        // Basic test route
        app.get('/api/test', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'API is working',
                timestamp: new Date().toISOString()
            });
        });

        // 404 handler for unknown routes
        app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: `Route ${req.originalUrl} not found`,
                error: 'NOT_FOUND'
            });
        });

        // Global error handling middleware (must be last)
        app.use(errorHandlingMiddleware.create());

        return app;
    }
}

/**
 * Start the server
 */
async function startServer() {
    try {
        // Initialize database connection
        await database.connect();
        logger.info('Database connected successfully');

        // Create Express application
        const app = await ApplicationFactory.create();

        // Start server
        const PORT = process.env.PORT || 8000;
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Signal School Quiz Generator Backend started`);
            logger.info(`📍 Server running on port ${PORT}`);
            logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 API Base URL: http://localhost:${PORT}/api`);
            logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`Received ${signal}. Starting graceful shutdown...`);

            server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    await database.disconnect();
                    logger.info('Database connection closed');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during database shutdown:', error);
                    process.exit(1);
                }
            });

            // Force close after 30 seconds
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch(error => {
        logger.error('Unhandled error during server startup:', error);
        process.exit(1);
    });
}

// Export functions
export { startServer, ApplicationFactory };