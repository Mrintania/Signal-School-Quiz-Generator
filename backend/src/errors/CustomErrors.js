// src/errors/CustomErrors.js

/**
 * Base Error Class สำหรับแอปพลิเคชัน
 */
export class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error Class
 */
export class ValidationError extends AppError {
    constructor(message = 'Validation Error', errors = []) {
        super(message, 400);
        this.errors = errors;
        this.type = 'VALIDATION_ERROR';
    }
}

/**
 * Authentication Error Class
 */
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
        this.type = 'AUTHENTICATION_ERROR';
    }
}

/**
 * Authorization Error Class
 */
export class AuthorizationError extends AppError {
    constructor(message = 'Access forbidden') {
        super(message, 403);
        this.type = 'AUTHORIZATION_ERROR';
    }
}

/**
 * Not Found Error Class
 */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
        this.type = 'NOT_FOUND_ERROR';
    }
}

/**
 * External API Error Class
 */
export class ExternalAPIError extends AppError {
    constructor(message = 'External API Error', service = 'Unknown') {
        super(message, 502);
        this.service = service;
        this.type = 'EXTERNAL_API_ERROR';
    }
}

/**
 * Database Error Class
 */
export class DatabaseError extends AppError {
    constructor(message = 'Database Error') {
        super(message, 500);
        this.type = 'DATABASE_ERROR';
    }
}

/**
 * Rate Limit Error Class
 */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
        this.type = 'RATE_LIMIT_ERROR';
    }
}

// Export เป็น default object เพื่อความสะดวก
export default {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ExternalAPIError,
    DatabaseError,
    RateLimitError
};