// backend/src/services/errorService.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import configService from './configService.js';

/**
 * Custom error class with HTTP status
 */
export class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;

    /**
     * Create an application error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} code - Error code (optional)
     */
    constructor(message: string, statusCode: number = 500, code: string = '') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true; // Indicates this is an expected operational error

        Error.captureStackTrace(this, this.constructor);
    }
}

// Define an interface for error response
interface ErrorResponse {
    success: boolean;
    message: string;
    code?: string;
    error?: string;
    stack?: string;
}

/**
 * Service for handling and processing errors
 */
export class ErrorService {
    /**
     * Create a 400 Bad Request error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static badRequest(message: string = 'Bad Request', code: string = 'BAD_REQUEST'): AppError {
        return new AppError(message, 400, code);
    }

    /**
     * Create a 401 Unauthorized error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static unauthorized(message: string = 'Unauthorized', code: string = 'UNAUTHORIZED'): AppError {
        return new AppError(message, 401, code);
    }

    /**
     * Create a 403 Forbidden error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static forbidden(message: string = 'Forbidden', code: string = 'FORBIDDEN'): AppError {
        return new AppError(message, 403, code);
    }

    /**
     * Create a 404 Not Found error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static notFound(message: string = 'Not Found', code: string = 'NOT_FOUND'): AppError {
        return new AppError(message, 404, code);
    }

    /**
     * Create a 409 Conflict error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static conflict(message: string = 'Conflict', code: string = 'CONFLICT'): AppError {
        return new AppError(message, 409, code);
    }

    /**
     * Create a 422 Unprocessable Entity error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static validation(message: string = 'Validation Error', code: string = 'VALIDATION_ERROR'): AppError {
        return new AppError(message, 422, code);
    }

    /**
     * Create a 429 Too Many Requests error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static tooManyRequests(message: string = 'Too Many Requests', code: string = 'TOO_MANY_REQUESTS'): AppError {
        return new AppError(message, 429, code);
    }

    /**
     * Create a 500 Internal Server Error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static internal(message: string = 'Internal Server Error', code: string = 'INTERNAL_ERROR'): AppError {
        return new AppError(message, 500, code);
    }

    /**
     * Create a 503 Service Unavailable error
     * @param {string} message - Error message
     * @param {string} code - Error code (optional)
     * @returns {AppError} Application error
     */
    static serviceUnavailable(message: string = 'Service Unavailable', code: string = 'SERVICE_UNAVAILABLE'): AppError {
        return new AppError(message, 503, code);
    }

    /**
     * Create a database error
     * @param {Error} error - Original database error
     * @param {string} operation - Database operation
     * @returns {AppError} Application error
     */
    static database(error: Error, operation: string = 'database operation'): AppError {
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
     * @param {Request} req - Express request object
     * @returns {Object} Error response object with statusCode and response
     */
    static handleError(err: Error | AppError, req?: Request): { statusCode: number; response: ErrorResponse } {
        // Cast to AppError if possible
        const appError = err instanceof AppError ? err : new AppError(err.message);
        
        // Log the error
        if (!appError.isOperational) {
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
                    user: (req as any)?.user
                }
            );
        } else {
            logger.warn(
                `Operational error (${appError.statusCode}):`,
                {
                    message: err.message,
                    code: appError.code,
                    url: req?.originalUrl,
                    method: req?.method
                }
            );
        }

        // Prepare error response
        const statusCode = appError.statusCode || 500;

        const response: ErrorResponse = {
            success: false,
            message: err.message || 'An unexpected error occurred'
        };

        // Include error code if available
        if (appError.code) {
            response.code = appError.code;
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
        return (err: Error, req: Request, res: Response, next: NextFunction): void => {
            const { statusCode, response } = ErrorService.handleError(err, req);
            res.status(statusCode).json(response);
        };
    }

    /**
     * Express 404 middleware
     * @returns {Function} Express middleware
     */
    static notFoundMiddleware() {
        return (req: Request, res: Response, next: NextFunction): void => {
            const err = ErrorService.notFound(`Route not found: ${req.originalUrl}`);
            next(err);
        };
    }
}