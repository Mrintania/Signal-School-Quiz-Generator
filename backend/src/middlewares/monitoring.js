import { logger } from '../utils/logger.js';

/**
 * Request counting middleware
 */
export const requestCounter = (req, res, next) => {
    if (!global.requestCount) global.requestCount = 0;
    global.requestCount++;

    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });

    next();
};

/**
 * Error counting middleware
 */
export const errorCounter = (err, req, res, next) => {
    if (!global.errorCount) global.errorCount = 0;
    global.errorCount++;

    logger.error(`Error in ${req.method} ${req.path}:`, err);

    next(err);
};

/**
 * Quiz generation tracking
 */
export const trackQuizGeneration = (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
        try {
            const response = typeof data === 'string' ? JSON.parse(data) : data;

            if (req.path.includes('/generate') && response.success) {
                global.lastQuizGenerated = new Date().toISOString();
                logger.info('Quiz generated successfully');
            }
        } catch (error) {
            // Ignore parsing errors
        }

        originalSend.call(this, data);
    };

    next();
};