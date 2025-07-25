// src/middlewares/error/ErrorHandlingMiddleware.js
import {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ExternalAPIError,
    DatabaseError,
    RateLimitError
} from '../../errors/CustomErrors.js';

/**
 * Global Error Handler Middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
    // Set default values
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error for debugging (ใน production ควรใช้ proper logging)
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Handle different error types
    if (process.env.NODE_ENV === 'development') {
        return sendErrorDevelopment(err, res);
    } else {
        return sendErrorProduction(err, res);
    }
};

/**
 * Send error response in development mode
 */
const sendErrorDevelopment = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        error: {
            status: err.status,
            message: err.message,
            stack: err.stack,
            type: err.type || 'UNKNOWN_ERROR',
            statusCode: err.statusCode,
            ...(err.errors && { validationErrors: err.errors }),
            ...(err.service && { service: err.service })
        }
    });
};

/**
 * Send error response in production mode
 */
const sendErrorProduction = (err, res) => {
    // Operational errors: ส่งรายละเอียดให้ client
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                status: err.status,
                message: err.message,
                type: err.type || 'OPERATIONAL_ERROR',
                ...(err.errors && { validationErrors: err.errors })
            }
        });
    }

    // Programming errors: ไม่ส่งรายละเอียดใน production
    return res.status(500).json({
        success: false,
        error: {
            status: 'error',
            message: 'Something went wrong!',
            type: 'INTERNAL_ERROR'
        }
    });
};

/**
 * Handle async errors in route handlers
 */
export const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Handle 404 errors for undefined routes
 */
export const handleNotFound = (req, res, next) => {
    const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
    next(err);
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = () => {
    process.on('uncaughtException', (err) => {
        console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
        console.error('Error:', err.name, err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    });
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (server) => {
    process.on('unhandledRejection', (err) => {
        console.error('UNHANDLED REJECTION! 💥 Shutting down...');
        console.error('Error:', err.name, err.message);
        server.close(() => {
            process.exit(1);
        });
    });
};

/**
 * Handle SIGTERM signal
 */
export const handleSigterm = (server) => {
    process.on('SIGTERM', () => {
        console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
        server.close(() => {
            console.log('💥 Process terminated!');
        });
    });
};

export default {
    globalErrorHandler,
    catchAsync,
    handleNotFound,
    handleUncaughtException,
    handleUnhandledRejection,
    handleSigterm
};