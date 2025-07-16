/**
 * Custom Error Classes
 * สร้าง custom error types สำหรับ application
 */

/**
 * Base Application Error
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Validation Error - 400
 */
export class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 400, details);
    }
}

/**
 * Unauthorized Error - 401
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401);
    }
}

/**
 * Forbidden Error - 403
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
    }
}

/**
 * Not Found Error - 404
 */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

/**
 * Conflict Error - 409
 */
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
    }
}

/**
 * Rate Limit Error - 429
 */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests', retryAfter = null) {
        super(message, 429, { retryAfter });
    }
}

/**
 * Internal Server Error - 500
 */
export class InternalServerError extends AppError {
    constructor(message = 'Internal server error', details = null) {
        super(message, 500, details);
    }
}

/**
 * Database Error - 500
 */
export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', query = null) {
        super(message, 500, { query });
    }
}

/**
 * AI Service Error - 502
 */
export class AIServiceError extends AppError {
    constructor(message = 'AI service unavailable', provider = null) {
        super(message, 502, { provider });
    }
}

/**
 * File Operation Error - 500
 */
export class FileOperationError extends AppError {
    constructor(message = 'File operation failed', operation = null) {
        super(message, 500, { operation });
    }
}

/**
 * Cache Error - 500
 */
export class CacheError extends AppError {
    constructor(message = 'Cache operation failed', operation = null) {
        super(message, 500, { operation });
    }
}

/**
 * Business Logic Error - 422
 */
export class BusinessLogicError extends AppError {
    constructor(message = 'Business rule violation') {
        super(message, 422);
    }
}

/**
 * External Service Error - 503
 */
export class ExternalServiceError extends AppError {
    constructor(message = 'External service unavailable', service = null) {
        super(message, 503, { service });
    }
}

/**
 * Error Factory
 * สร้าง error instances จาก error type
 */
export class ErrorFactory {
    static createError(type, message, details = null) {
        switch (type.toLowerCase()) {
            case 'validation':
                return new ValidationError(message, details);
            case 'unauthorized':
                return new UnauthorizedError(message);
            case 'forbidden':
                return new ForbiddenError(message);
            case 'notfound':
                return new NotFoundError(message);
            case 'conflict':
                return new ConflictError(message);
            case 'ratelimit':
                return new RateLimitError(message, details?.retryAfter);
            case 'database':
                return new DatabaseError(message, details?.query);
            case 'aiservice':
                return new AIServiceError(message, details?.provider);
            case 'fileoperation':
                return new FileOperationError(message, details?.operation);
            case 'cache':
                return new CacheError(message, details?.operation);
            case 'businesslogic':
                return new BusinessLogicError(message);
            case 'externalservice':
                return new ExternalServiceError(message, details?.service);
            default:
                return new InternalServerError(message, details);
        }
    }

    /**
     * Parse database error และแปลงเป็น custom error
     */
    static fromDatabaseError(dbError) {
        const { code, errno, sqlMessage } = dbError;

        switch (code) {
            case 'ER_DUP_ENTRY':
                return new ConflictError('Duplicate entry found', {
                    sqlMessage,
                    errno
                });
            case 'ER_NO_REFERENCED_ROW':
            case 'ER_ROW_IS_REFERENCED':
                return new BusinessLogicError('Foreign key constraint violation', {
                    sqlMessage,
                    errno
                });
            case 'ER_ACCESS_DENIED_ERROR':
                return new UnauthorizedError('Database access denied', {
                    sqlMessage,
                    errno
                });
            case 'ER_TABLE_DOESNT_EXIST':
                return new NotFoundError('Database table not found', {
                    sqlMessage,
                    errno
                });
            default:
                return new DatabaseError(sqlMessage || 'Database operation failed', {
                    code,
                    errno,
                    sqlMessage
                });
        }
    }

    /**
     * Parse file system error
     */
    static fromFileSystemError(fsError) {
        const { code, path } = fsError;

        switch (code) {
            case 'ENOENT':
                return new NotFoundError(`File not found: ${path}`);
            case 'EACCES':
                return new ForbiddenError(`Access denied: ${path}`);
            case 'ENOSPC':
                return new InternalServerError('Insufficient disk space');
            case 'EMFILE':
                return new InternalServerError('Too many open files');
            default:
                return new FileOperationError(fsError.message, { code, path });
        }
    }
}

/**
 * Error Handler Utility
 * จัดการ error ที่เกิดขึ้นใน application
 */
export class ErrorHandler {
    /**
     * Handle และแปลง error เป็น response format
     */
    static handleError(error) {
        // ถ้าเป็น custom error อยู่แล้ว ส่งออกไปเลย
        if (error instanceof AppError) {
            return error;
        }

        // แปลง database error
        if (error.code && error.errno) {
            return ErrorFactory.fromDatabaseError(error);
        }

        // แปลง file system error
        if (error.code && error.path) {
            return ErrorFactory.fromFileSystemError(error);
        }

        // Default error
        return new InternalServerError(error.message || 'Unknown error occurred');
    }

    /**
     * Log error ตาม severity
     */
    static logError(error, logger) {
        const logData = {
            name: error.name,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details,
            stack: error.stack,
            timestamp: error.timestamp || new Date().toISOString()
        };

        if (error.statusCode >= 500) {
            logger.error('Server Error:', logData);
        } else if (error.statusCode >= 400) {
            logger.warn('Client Error:', logData);
        } else {
            logger.info('Error:', logData);
        }
    }
}