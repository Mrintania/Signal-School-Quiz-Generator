import logger from '../../utils/logger.js';
import { ResponseDTO } from '../../dto/common/ResponseDTO.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../../errors/CustomErrors.js';

/**
 * Base Controller Class
 * ใช้เป็น parent class สำหรับ controllers อื่นๆ
 * มี common functionality ที่ controllers ทุกตัวต้องใช้
 */
export class BaseController {
    constructor() {
        // Bind methods to preserve 'this' context
        this.handleError = this.handleError.bind(this);
        this.sendSuccess = this.sendSuccess.bind(this);
        this.sendError = this.sendError.bind(this);
    }

    /**
     * ส่ง success response แบบมาตรฐาน
     * @param {Object} res - Express response object
     * @param {*} data - ข้อมูลที่จะส่งกลับ
     * @param {string} message - ข้อความ
     * @param {number} statusCode - HTTP status code
     */
    sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
        const response = new ResponseDTO(true, data, message);

        // Log success for audit
        logger.info(`Success Response: ${message}`, {
            statusCode,
            data: data ? 'Data included' : 'No data',
            timestamp: new Date().toISOString()
        });

        return res.status(statusCode).json(response);
    }

    /**
     * ส่ง error response แบบมาตรฐาน
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {*} error - Error details (ใช้ใน development เท่านั้น)
     */
    sendError(res, message = 'An error occurred', statusCode = 500, error = null) {
        const response = new ResponseDTO(false, null, message);

        // Add error details in development mode
        if (process.env.NODE_ENV === 'development' && error) {
            response.error = error;
        }

        // Log error for debugging
        logger.error(`Error Response: ${message}`, {
            statusCode,
            error: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString()
        });

        return res.status(statusCode).json(response);
    }

    /**
     * จัดการ error แบบรวมศูนย์
     * @param {Object} res - Express response object
     * @param {Error} error - Error object
     * @param {string} defaultMessage - Default error message
     */
    handleError(res, error, defaultMessage = 'An unexpected error occurred') {
        // Handle custom errors
        if (error instanceof ValidationError) {
            return this.sendError(res, error.message, 400, error);
        }

        if (error instanceof NotFoundError) {
            return this.sendError(res, error.message, 404, error);
        }

        if (error instanceof UnauthorizedError) {
            return this.sendError(res, error.message, 403, error);
        }

        // Handle database errors
        if (error.code === 'ER_DUP_ENTRY') {
            return this.sendError(res, 'Duplicate entry found', 409, error);
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return this.sendError(res, 'Referenced record not found', 400, error);
        }

        // Handle AI service errors
        if (error.code === 'AI_SERVICE_ERROR') {
            return this.sendError(res, 'AI service temporarily unavailable', 503, error);
        }

        // Default server error
        logger.error('Unhandled error:', error);
        return this.sendError(res, defaultMessage, 500, error);
    }

    /**
     * ตรวจสอบ user permissions
     * @param {Object} user - User object จาก JWT
     * @param {string|Array} requiredRoles - Required roles
     * @returns {boolean}
     */
    checkPermissions(user, requiredRoles) {
        if (!user) return false;

        if (typeof requiredRoles === 'string') {
            requiredRoles = [requiredRoles];
        }

        return requiredRoles.includes(user.role);
    }

    /**
     * ตรวจสอบว่า user เป็นเจ้าของ resource หรือไม่
     * @param {Object} user - User object
     * @param {string} resourceUserId - User ID ของ resource
     * @returns {boolean}
     */
    checkOwnership(user, resourceUserId) {
        return user && user.userId === resourceUserId;
    }

    /**
     * ตรวจสอบ pagination parameters
     * @param {Object} query - Query parameters
     * @returns {Object} Validated pagination object
     */
    validatePagination(query) {
        const page = Math.max(1, parseInt(query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
        const offset = (page - 1) * limit;

        return { page, limit, offset };
    }

    /**
     * สร้าง response metadata สำหรับ pagination
     * @param {number} total - Total records
     * @param {number} page - Current page
     * @param {number} limit - Records per page
     * @returns {Object} Pagination metadata
     */
    createPaginationMeta(total, page, limit) {
        const totalPages = Math.ceil(total / limit);

        return {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    }

    /**
     * Wrapper สำหรับ async controller methods
     * จัดการ error handling อัตโนมัติ
     * @param {Function} fn - Async controller method
     * @returns {Function} Wrapped function
     */
    asyncHandler(fn) {
        return async (req, res, next) => {
            try {
                await fn(req, res, next);
            } catch (error) {
                this.handleError(res, error);
            }
        };
    }

    /**
     * ตรวจสอบ required fields
     * @param {Object} data - Data object to validate
     * @param {Array} requiredFields - Array of required field names
     * @throws {ValidationError} If validation fails
     */
    validateRequiredFields(data, requiredFields) {
        const missingFields = requiredFields.filter(field => {
            const value = data[field];
            return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
            throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
        }
    }

    /**
     * Sanitize user input
     * @param {Object} data - Input data
     * @returns {Object} Sanitized data
     */
    sanitizeInput(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sanitized = {};

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                // Basic XSS protection
                sanitized[key] = value
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .trim();
            } else if (Array.isArray(value)) {
                sanitized[key] = value.map(item => this.sanitizeInput(item));
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeInput(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Log user activity
     * @param {Object} user - User object
     * @param {string} action - Action performed
     * @param {Object} details - Additional details
     */
    logActivity(user, action, details = {}) {
        logger.info('User Activity', {
            userId: user?.userId,
            username: user?.username,
            action,
            details,
            timestamp: new Date().toISOString(),
            ip: details.ip
        });
    }

    /**
     * Rate limiting check (helper method)
     * @param {string} key - Rate limit key
     * @param {number} limit - Rate limit
     * @param {number} window - Time window in seconds
     */
    async checkRateLimit(key, limit, window) {
        // This would integrate with Redis or memory store
        // Implementation depends on your rate limiting strategy
        return { allowed: true, remaining: limit - 1 };
    }
}

export default BaseController;