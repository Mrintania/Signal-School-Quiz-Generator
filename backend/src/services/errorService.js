// backend/src/services/errorService.js
import { logger } from '../utils/logger.js';
import configService from './configService.js';

/**
 * Custom error class with HTTP status
 */
class AppError extends Error {
    /**
     * Create an application error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Error code (optional)
     */
    constructor(message, statusCode = 500, code = '') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Indicates this is an expected operational error

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Service for handling and processing errors
 */
class ErrorService {
    /**
     * Create a 400 Bad Request error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static badRequest(message = 'Bad Request', code = 'BAD_REQUEST') {
        return new AppError(message, 400, code);
    }

    /**
     * Create a 401 Unauthorized error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    /**
     * Create a 403 Forbidden error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    /**
     * Create a 404 Not Found error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static notFound(message = 'Not Found', code = 'NOT_FOUND') {
        return new AppError(message, 404, code);
    }

    /**
     * Create a 409 Conflict error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static conflict(message = 'Conflict', code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }

    /**
     * Create a 422 Unprocessable Entity error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static validation(message = 'Validation Error', code = 'VALIDATION_ERROR') {
        return new AppError(message, 422, code);
    }

    /**
     * Create a 429 Too Many Requests error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static tooManyRequests(message = 'Too Many Requests', code = 'TOO_MANY_REQUESTS') {
        return new AppError(message, 429, code);
    }

    /**
     * Create a 500 Internal Server Error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static internal(message = 'Internal Server Error', code = 'INTERNAL_ERROR') {
        return new AppError(message, 500, code);
    }

    /**
     * Create a 503 Service Unavailable error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static serviceUnavailable(message = 'Service Unavailable', code = 'SERVICE_UNAVAILABLE') {
        return new AppError(message, 503, code);
    }

    /**
     * Create a database error
     * @param {Error} error - Original database error
     * @param {string} operation - Database operation
     * @returns {AppError} Application error
     */
    static database(error, operation = 'database operation') {
        logger.error(`Database error during ${operation}:`, error);

        return new AppError(
            `A database error occurred during ${operation}`,
            500,
            'DATABASE_ERROR'
        );
    }

    /**
     * Handle error and prepare response
     * @param {Error} err - Error object
     * @param {Object} req - Express request object
     * @returns {Object} Error response object
     */
    static handleError(err, req) {
        // Log the error
        if (!err.isOperational) {
            logger.error(
                'Unexpected error:',
                {
                    message: err.message,
                    stack: err.stack,
                    url: req?.originalUrl,
                    method: req?.method,
                    body: req?.body,
                    params: req?.params,
                    query: req?.query,
                    user: req?.user
                }
            );
        } else {
            logger.warn(
                `Operational error (${err.statusCode}):`,
                {
                    message: err.message,
                    code: err.code,
                    url: req?.originalUrl,
                    method: req?.method
                }
            );
        }

        // Prepare error response
        const statusCode = err.statusCode || 500;

        const response = {
            success: false,
            message: err.message || 'An unexpected error occurred'
        };

        // Include error code if available
        if (err.code) {
            response.code = err.code;
        }

        // Include detailed error info in development
        if (configService.isDevelopment()) {
            response.error = err.message;
            response.stack = err.stack;
        }

        return { statusCode, response };
    }

    /**
     * Express error handling middleware
     * @returns {Function} Express middleware
     */
    static errorHandlerMiddleware() {
        return (err, req, res, next) => {
            const { statusCode, response } = ErrorService.handleError(err, req);
            res.status(statusCode).json(response);
        };
    }

    /**
     * Express 404 middleware
     * @returns {Function} Express middleware
     */
    static notFoundMiddleware() {
        return (req, res, next) => {
            const err = ErrorService.notFound(`Route not found: ${req.originalUrl}`);
            next(err);
        };
    }
}

export { ErrorService, AppError };