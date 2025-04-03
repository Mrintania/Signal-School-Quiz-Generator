// backend/src/index.ts
import { logger } from './utils/logger.js';
import AppInitService from './services/appInitService.js';
import configService from './services/configService.js';

/**
 * Main application entry point
 */
async function main() {
    try {
        logger.info('Starting Signal School Quiz Generator backend');

        // Initialize the Express app
        const app = await AppInitService.initializeApp();

        // Start the server
        const PORT = configService.get<number>('server.port', 3001);
        const server = app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Environment: ${configService.get<string>('server.environment', 'development')}`);
            logger.info(`API URL: http://localhost:${PORT}/api`);
        });

        // Log successful startup
        logger.info('Application started successfully');

        // Handle server errors
        server.on('error', (error: Error & { code?: string }) => {
            logger.error('Server error:', error);

            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use. Please use a different port.`);
                process.exit(1);
            }
        });

        // Graceful shutdown handler
        const gracefulShutdown = () => {
            logger.info('Starting graceful shutdown...');

            server.close(() => {
                logger.info('HTTP server closed');
                logger.info('Graceful shutdown completed');
                process.exit(0);
            });

            // Force exit after 10 seconds if graceful shutdown fails
            setTimeout(() => {
                logger.error('Graceful shutdown timeout, forcing exit');
                process.exit(1);
            }, 10000);
        };

        // Listen for termination signals
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        return { app, server };
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Execute main function
main()
    .catch(error => {
        logger.error('Unhandled error in main:', error);
        process.exit(1);
    });

// Handle unexpected errors
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    // Give time to log the error before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error('Unhandled Rejection:', reason);
});