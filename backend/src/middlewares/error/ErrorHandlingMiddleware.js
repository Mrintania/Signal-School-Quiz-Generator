// backend/src/middlewares/error/ErrorHandlingMiddleware.js
import logger from '../../utils/common/Logger.js';
import { ResponseBuilder } from '../../utils/common/ResponseBuilder.js';
import { 
    AppError, 
    ValidationError, 
    UnauthorizedError, 
    NotFoundError, 
    DatabaseError,
    AIServiceError,
    FileOperationError,
    BusinessLogicError
} from '../../errors/CustomErrors.js';

/**
 * Error Handling Middleware
 * จัดการ error ทั้งหมดใน application อย่างเป็นระบบ
 * แปลง error เป็น response format ที่เหมาะสม
 */
export class ErrorHandlingMiddleware {
    constructor() {
        this.responseBuilder = new ResponseBuilder();
        
        // Error code mapping
        this.errorCodeMap = {
            'ValidationError': 400,
            'UnauthorizedError': 401,
            'ForbiddenError': 403,
            'NotFoundError': 404,
            'ConflictError': 409,
            'BusinessLogicError': 422,
            'RateLimitError': 429,
            'DatabaseError': 500,
            'AIServiceError': 502,
            'ExternalServiceError': 503,
            'FileOperationError': 500,
            'CacheError': 500
        };

        // Development vs Production error details
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }

    /**
     * Main error handling method
     */
    handle(error, req, res, next) {
        try {
            // Log the error
            this.logError(error, req);

            // Handle different error types
            const errorResponse = this.processError(error, req);

            // Add request context
            errorResponse.path = req.path;
            errorResponse.method = req.method;
            errorResponse.timestamp = new Date().toISOString();

            // Add user context if available
            if (req.user) {
                errorResponse.userId = req.user.userId;
            }

            // Send error response
            res.status(errorResponse.statusCode).json(errorResponse.body);

        } catch (handlingError) {
            // If error handling itself fails, send minimal error response
            logger.error('Error in error handler:', handlingError);
            
            res.status(500).json({
                success: false,
                message: 'Internal server error occurred while handling the request',
                error: 'HANDLER_ERROR',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Process different types of errors
     */
    processError(error, req) {
        // Handle known custom errors
        if (error instanceof AppError) {
            return this.handleCustomError(error, req);
        }

        // Handle validation errors from express-validator
        if (error.name === 'ValidationError' && error.errors) {
            return this.handleExpressValidationError(error, req);
        }

        // Handle MongoDB/Database errors
        if (error.name === 'MongoError' || error.code) {
            return this.handleDatabaseError(error, req);
        }

        // Handle JWT errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return this.handleJWTError(error, req);
        }

        // Handle Multer file upload errors
        if (error.name === 'MulterError') {
            return this.handleMulterError(error, req);
        }

        // Handle Syntax errors (malformed JSON, etc.)
        if (error instanceof SyntaxError) {
            return this.handleSyntaxError(error, req);
        }

        // Handle generic errors
        return this.handleGenericError(error, req);
    }

    /**
     * Handle custom application errors
     */
    handleCustomError(error, req) {
        const statusCode = this.errorCodeMap[error.constructor.name] || error.statusCode || 500;
        
        const body = {
            success: false,
            message: error.message || 'An error occurred',
            error: error.constructor.name
        };

        // Add error details in development
        if (this.isDevelopment && error.details) {
            body.details = error.details;
        }

        // Add stack trace in development for server errors
        if (this.isDevelopment && statusCode >= 500 && error.stack) {
            body.stack = error.stack;
        }

        return { statusCode, body };
    }

    /**
     * Handle express-validator validation errors
     */
    handleExpressValidationError(error, req) {
        const validationErrors = error.errors.map(err => ({
            field: err.path || err.param,
            message: err.msg,
            value: err.value
        }));

        const body = {
            success: false,
            message: 'Validation failed',
            error: 'VALIDATION_ERROR',
            errors: validationErrors
        };

        return { statusCode: 400, body };
    }

    /**
     * Handle database errors
     */
    handleDatabaseError(error, req) {
        let statusCode = 500;
        let message = 'Database operation failed';
        
        // Map specific database errors
        switch (error.code) {
            case 'ER_DUP_ENTRY':
            case 11000: // MongoDB duplicate key
                statusCode = 409;
                message = 'Duplicate entry found';
                break;
            case 'ER_NO_REFERENCED_ROW':
            case 'ER_ROW_IS_REFERENCED':
                statusCode = 422;
                message = 'Foreign key constraint violation';
                break;
            case 'ER_ACCESS_DENIED_ERROR':
                statusCode = 500;
                message = 'Database access denied';
                break;
            case 'ER_TABLE_DOESNT_EXIST':
                statusCode = 500;
                message = 'Database table not found';
                break;
        }

        const body = {
            success: false,
            message,
            error: 'DATABASE_ERROR'
        };

        // Add SQL info in development
        if (this.isDevelopment) {
            body.sqlCode = error.code;
            body.sqlMessage = error.sqlMessage;
        }

        return { statusCode, body };
    }

    /**
     * Handle JWT authentication errors
     */
    handleJWTError(error, req) {
        let message = 'Authentication failed';
        
        if (error.name === 'TokenExpiredError') {
            message = 'Token has expired';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Invalid token';
        }

        const body = {
            success: false,
            message,
            error: 'AUTH_ERROR'
        };

        return { statusCode: 401, body };
    }

    /**
     * Handle file upload errors
     */
    handleMulterError(error, req) {
        let message = 'File upload failed';
        let statusCode = 400;

        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File size too large';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected file field';
                break;
            case 'LIMIT_PART_COUNT':
                message = 'Too many parts';
                break;
        }

        const body = {
            success: false,
            message,
            error: 'FILE_UPLOAD_ERROR'
        };

        return { statusCode, body };
    }

    /**
     * Handle syntax errors (malformed JSON, etc.)
     */
    handleSyntaxError(error, req) {
        const body = {
            success: false,
            message: 'Request contains invalid syntax',
            error: 'SYNTAX_ERROR'
        };

        // Add details in development
        if (this.isDevelopment) {
            body.details = error.message;
        }

        return { statusCode: 400, body };
    }

    /**
     * Handle generic/unknown errors
     */
    handleGenericError(error, req) {
        const statusCode = 500;
        
        const body = {
            success: false,
            message: this.isDevelopment ? 
                (error.message || 'Internal server error') : 
                'An unexpected error occurred',
            error: 'INTERNAL_ERROR'
        };

        // Add stack trace in development
        if (this.isDevelopment && error.stack) {
            body.stack = error.stack;
        }

        return { statusCode, body };
    }

    /**
     * Log errors with appropriate level
     */
    logError(error, req) {
        const logData = {
            name: error.name,
            message: error.message,
            path: req.path,
            method: req.method,
            userId: req.user?.userId,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            timestamp: new Date().toISOString()
        };

        // Add error details
        if (error.statusCode) {
            logData.statusCode = error.statusCode;
        }

        if (error.details) {
            logData.details = error.details;
        }

        // Add stack trace for server errors
        if (!error.statusCode || error.statusCode >= 500) {
            logData.stack = error.stack;
        }

        // Log with appropriate level
        if (!error.statusCode || error.statusCode >= 500) {
            logger.error('Server Error:', logData);
        } else if (error.statusCode >= 400) {
            logger.warn('Client Error:', logData);
        } else {
            logger.info('Error:', logData);
        }

        // Log to security log for authentication/authorization errors
        if (error.statusCode === 401 || error.statusCode === 403) {
            logger.security('unauthorized-access', {
                userId: req.user?.userId,
                path: req.path,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                error: error.message
            });
        }
    }

    /**
     * Handle 404 errors (route not found)
     */
    handleNotFound(req, res, next) {
        const error = new NotFoundError(`Route not found: ${req.method} ${req.path}`);
        this.handle(error, req, res, next);
    }

    /**
     * Handle uncaught exceptions
     */
    handleUncaughtException(error) {
        logger.error('Uncaught Exception:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Graceful shutdown
        process.exit(1);
    }

    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection(reason, promise) {
        logger.error('Unhandled Promise Rejection:', {
            reason: reason instanceof Error ? reason.message : reason,
            stack: reason instanceof Error ? reason.stack : undefined,
            promise: promise.toString(),
            timestamp: new Date().toISOString()
        });

        // Graceful shutdown
        process.exit(1);
    }

    /**
     * Initialize global error handlers
     */
    initializeGlobalHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', this.handleUncaughtException.bind(this));

        // Handle unhandled promise rejections
        process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));

        logger.info('Global error handlers initialized');
    }

    /**
     * Create error handler middleware function
     */
    create() {
        return this.handle.bind(this);
    }

    /**
     * Create async error handler wrapper
     */
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Create error boundary for specific routes
     */
    createBoundary(name) {
        return (error, req, res, next) => {
            // Add context information
            error.boundary = name;
            error.timestamp = new Date().toISOString();
            
            // Log boundary error
            logger.error(`Error in ${name} boundary:`, {
                name: error.name,
                message: error.message,
                boundary: name,
                path: req.path,
                method: req.method
            });

            // Pass to main error handler
            this.handle(error, req, res, next);
        };
    }

    /**
     * Validate error response before sending
     */
    validateErrorResponse(response) {
        // Ensure required fields exist
        if (!response.body || typeof response.body.success !== 'boolean') {
            return false;
        }

        if (!response.body.message || typeof response.body.message !== 'string') {
            return false;
        }

        if (!response.statusCode || typeof response.statusCode !== 'number') {
            return false;
        }

        return true;
    }

    /**
     * Get error statistics for monitoring
     */
    getErrorStats() {
        // This would typically be connected to a monitoring system
        return {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            isDevelopment: this.isDevelopment,
            errorCodeMap: this.errorCodeMap
        };
    }
}

// Create singleton instance
const errorHandlingMiddleware = new ErrorHandlingMiddleware();

// Initialize global handlers
errorHandlingMiddleware.initializeGlobalHandlers();

export default errorHandlingMiddleware;
export { ErrorHandlingMiddleware };