// backend/src/errors/CustomErrors.js
/**
 * Custom Error Classes
 * สร้าง error classes ที่เฉพาะเจาะจงเพื่อจัดการ error ได้ดีขึ้น
 */

export class BaseError extends Error {
    constructor(message, statusCode = 500, code = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            code: this.code,
            timestamp: this.timestamp
        };
    }
}

export class ValidationError extends BaseError {
    constructor(message, field = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
    }
}

export class NotFoundError extends BaseError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.resource = resource;
    }
}

export class UnauthorizedError extends BaseError {
    constructor(message = 'Unauthorized access') {
        super(message, 403, 'UNAUTHORIZED');
    }
}

export class AuthenticationError extends BaseError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_FAILED');
    }
}

export class ConflictError extends BaseError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}

export class RateLimitError extends BaseError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

export class AIServiceError extends BaseError {
    constructor(message = 'AI service error', originalError = null) {
        super(message, 503, 'AI_SERVICE_ERROR');
        this.originalError = originalError;
    }
}

export class DatabaseError extends BaseError {
    constructor(message = 'Database operation failed', originalError = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
    }
}

export class FileError extends BaseError {
    constructor(message = 'File operation failed') {
        super(message, 400, 'FILE_ERROR');
    }
}