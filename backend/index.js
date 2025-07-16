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
import { 
    ErrorHandlingMiddleware,
    authenticateToken,
    rateLimiter
} from './middlewares/index.js';

// Import routes
import {
    newQuizRoutes,
    authRoutes,
    userRoutes,
    adminRoutes,
    dashboardRoutes,
    schoolRoutes
} from './routes/index.js';

// Import services
import { CacheService } from './services/index.js';

// Import utils
import { Logger } from './utils/index.js';

/**
 * Application Factory
 * สร้าง Express application พร้อม configuration
 */
export class ApplicationFactory {
    static create() {
        const app = express();

        // Initialize services
        const cacheService = new CacheService();
        const errorHandler = new ErrorHandlingMiddleware();

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
                Logger.apiAccess(req, res, duration);
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
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false
        }));

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                services: {
                    database: 'connected', // This should be checked properly
                    cache: cacheService.getSize() >= 0 ? 'connected' : 'disconnected'
                }
            });
        });

        // API routes
        app.use('/api/auth', authRoutes);
        app.use('/api/users', userRoutes);
        app.use('/api/admin', adminRoutes);
        app.use('/api/dashboard', dashboardRoutes);
        app.use('/api/schools', schoolRoutes);

        // Quiz routes (new architecture)
        app.use('/api/quiz', newQuizRoutes);

        // Static files
        app.use('/uploads', express.static('uploads'));

        // 404 handler
        app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'API endpoint not found',
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        app.use(errorHandler.create());

        return app;
    }

    /**
     * Start the application
     */
    static async start(port = process.env.PORT || 3001) {
        try {
            const app = this.create();

            // Test database connection
            await this.testDatabaseConnection();

            // Start server
            const server = app.listen(port, () => {
                Logger.info(`🚀 Signal School Quiz Generator API started on port ${port}`, {
                    environment: process.env.NODE_ENV || 'development',
                    port,
                    timestamp: new Date().toISOString()
                });
            });

            // Graceful shutdown
            this.setupGracefulShutdown(server);

            return server;

        } catch (error) {
            Logger.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    /**
     * Test database connection
     */
    static async testDatabaseConnection() {
        try {
            // Test database connection
            const [rows] = await database.execute('SELECT 1 as test');
            Logger.info('Database connection successful');
        } catch (error) {
            Logger.error('Database connection failed:', error);
            throw error;
        }
    }

    /**
     * Setup graceful shutdown
     */
    static setupGracefulShutdown(server) {
        const shutdown = (signal) => {
            Logger.info(`Received ${signal}, shutting down gracefully`);
            
            server.close(() => {
                Logger.info('HTTP server closed');
                
                // Close database connections
                database.end(() => {
                    Logger.info('Database connections closed');
                    process.exit(0);
                });
            });

            // Force close after 30 seconds
            setTimeout(() => {
                Logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}

// Export the factory
export default ApplicationFactory;

// Start the application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    ApplicationFactory.start();
}