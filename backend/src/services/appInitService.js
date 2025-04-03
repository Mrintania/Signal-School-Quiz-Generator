// backend/src/services/appInitService.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import configService from './configService.js';
import database from '../config/db.js';
import { logger, httpLogger } from '../utils/logger.js';
import { ErrorService } from './errorService.js';
import MiddlewareService from './middlewareService.js';
import { cacheService } from './cacheService.js';
import applySecurityMiddleware from '../middlewares/security.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';
import { sanitizeAll } from '../utils/validator.js';

// Import routes
import quizRoutes from '../routes/quizRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import schoolRoutes from '../routes/schoolRoutes.js';
import dashboardRoutes from '../routes/dashboardRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';

// Initialize __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service for application initialization and setup
 */
class AppInitService {
    /**
     * Initialize and configure the Express application
     * @returns {Object} Configured Express app
     */
    static initializeApp() {
        // Create Express app
        const app = express();

        // Ensure required directories exist
        this._ensureDirectoryStructure();

        // Apply security middleware
        this._applySecurityMiddleware(app);

        // Apply common middleware
        this._applyCommonMiddleware(app);

        // Setup routes
        this._setupRoutes(app);

        // Apply error handling middleware
        this._setupErrorHandling(app);

        return app;
    }

    /**
     * Ensure required directories exist
     * @private
     */
    static _ensureDirectoryStructure() {
        const directories = [
            path.join(__dirname, '../../../logs'),
            path.join(__dirname, '../../../uploads'),
            path.join(__dirname, '../../../uploads/profile-images')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                logger.info(`Created directory: ${dir}`);
            }
        });
    }

    /**
     * Apply security-related middleware
     * @param {Object} app - Express app
     * @private
     */
    static _applySecurityMiddleware(app) {
        // Apply security middleware
        applySecurityMiddleware(app);

        // Add other security measures
        app.use(generalLimiter);
    }

    /**
     * Apply common middleware
     * @param {Object} app - Express app
     * @private
     */
    static _applyCommonMiddleware(app) {
        // HTTP request logging
        app.use(httpLogger);

        // Body parsing middleware
        app.use(express.json({ limit: '1mb' }));
        app.use(express.urlencoded({ extended: true, limit: '1mb' }));

        // Apply input sanitization
        app.use(sanitizeAll);

        // Activity logging middleware
        app.use(MiddlewareService.createActivityLogger());

        // Serve static files for profile images
        app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));
    }

    /**
     * Setup application routes
     * @param {Object} app - Express app
     * @private
     */
    static _setupRoutes(app) {
        // API Routes
        const apiPrefix = '/api';

        // Home route
        app.get(apiPrefix, (req, res) => {
            res.json({
                message: 'Welcome to Quiz Generator API',
                version: configService.get('server.apiVersion', '1.0.0'),
                status: 'Running'
            });
        });

        // API routes
        app.use(`${apiPrefix}/quizzes`, quizRoutes);
        app.use(`${apiPrefix}/auth`, authRoutes);
        app.use(`${apiPrefix}/users`, userRoutes);
        app.use(`${apiPrefix}/schools`, schoolRoutes);
        app.use(`${apiPrefix}/dashboard`, dashboardRoutes);
        app.use(`${apiPrefix}/admin`, adminRoutes);

        // Serve static files in production
        if (configService.isProduction()) {
            // Set static folder
            app.use(express.static(path.join(__dirname, '../../../../frontend/build')));

            // Any route not matched by API routes will serve the React app
            app.get('*', (req, res) => {
                res.sendFile(path.resolve(__dirname, '../../../../frontend/build', 'index.html'));
            });
        }
    }

    /**
     * Setup error handling middleware
     * @param {Object} app - Express app
     * @private
     */
    static _setupErrorHandling(app) {
        // 404 handler for API routes
        app.use('/api/*', (req, res) => {
            logger.warn(`Route not found: ${req.originalUrl}`);
            res.status(404).json({
                success: false,
                message: 'API endpoint not found'
            });
        });

        // Global error handler
        app.use((err, req, res, next) => {
            logger.error(`Global error handler: ${err.message}`, {
                url: req.originalUrl,
                method: req.method,
                stack: err.stack
            });

            const statusCode = err.statusCode || 500;

            res.status(statusCode).json({
                success: false,
                message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
            });
        });
    }
}

export default AppInitService;