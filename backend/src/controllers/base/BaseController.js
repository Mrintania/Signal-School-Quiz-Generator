// backend/src/controllers/base/BaseController.js
import logger from '../../utils/common/Logger.js';
import { ResponseDTO } from '../../dtos/ResponseDTO.js';
import {
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    DatabaseError,
    AIServiceError
} from '../../errors/CustomErrors.js';

/**
 * Base Controller Class
 * ให้ method พื้นฐานสำหรับ controller อื่นๆ ใช้
 */
export class BaseController {
    constructor() {
        this.logger = logger;
    }

    /**
     * ส่ง success response แบบมาตรฐาน
     * @param {Object} res - Express response object
     * @param {*} data - Data to send
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code
     */
    sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
        const response = new ResponseDTO(true, data, message);

        // Log successful response for debugging
        this.logger.info(`Success Response: ${message}`, {
            statusCode,
            hasData: data ? 'Data included' : 'No data',
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
        this.logger.error(`Error Response: ${message}`, {
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

        if (error instanceof DatabaseError) {
            return this.sendError(res, error.message, 500, error);
        }

        if (error instanceof AIServiceError) {
            return this.sendError(res, error.message, 503, error);
        }

        // Handle generic errors
        this.logger.error('Unhandled error in controller:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        return this.sendError(res, defaultMessage, 500, error);
    }

    /**
     * Validate required fields in request body
     * @param {Object} body - Request body
     * @param {Array} requiredFields - Array of required field names
     * @throws {ValidationError} If any required field is missing
     */
    validateRequiredFields(body, requiredFields) {
        const missingFields = [];

        for (const field of requiredFields) {
            if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
                missingFields.push(field);
            }
        }

        if (missingFields.length > 0) {
            throw new ValidationError(
                `Missing required fields: ${missingFields.join(', ')}`
            );
        }
    }

    /**
     * Sanitize data before sending to client
     * @param {*} data - Data to sanitize
     * @returns {*} Sanitized data
     */
    sanitizeData(data) {
        if (!data) return data;

        // If it's an array, sanitize each item
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item));
        }

        // If it's an object, remove sensitive fields
        if (typeof data === 'object') {
            const sanitized = { ...data };

            // Remove sensitive fields
            const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
            sensitiveFields.forEach(field => {
                if (sanitized[field]) {
                    delete sanitized[field];
                }
            });

            return sanitized;
        }

        return data;
    }

    /**
     * Parse pagination parameters from query
     * @param {Object} query - Request query object
     * @returns {Object} Pagination parameters
     */
    parsePagination(query) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;

        // Ensure reasonable limits
        const maxLimit = 100;
        const actualLimit = limit > maxLimit ? maxLimit : limit;

        return {
            page: page > 0 ? page : 1,
            limit: actualLimit,
            offset: offset >= 0 ? offset : 0
        };
    }

    /**
     * Create pagination response
     * @param {Array} data - Data array
     * @param {number} total - Total count
     * @param {Object} pagination - Pagination parameters
     * @returns {Object} Paginated response
     */
    createPaginatedResponse(data, total, pagination) {
        const totalPages = Math.ceil(total / pagination.limit);

        return {
            data: this.sanitizeData(data),
            pagination: {
                currentPage: pagination.page,
                totalPages,
                pageSize: pagination.limit,
                totalItems: total,
                hasNextPage: pagination.page < totalPages,
                hasPreviousPage: pagination.page > 1
            }
        };
    }

    /**
     * Extract user information from request
     * @param {Object} req - Express request object
     * @returns {Object} User information
     */
    getUserFromRequest(req) {
        if (!req.user) {
            throw new UnauthorizedError('User not found in request');
        }

        return {
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role,
            permissions: req.user.permissions || []
        };
    }

    /**
     * Check if user has required permission
     * @param {Object} user - User object
     * @param {string} requiredPermission - Required permission
     * @throws {UnauthorizedError} If user doesn't have permission
     */
    checkPermission(user, requiredPermission) {
        if (!user.permissions || !user.permissions.includes(requiredPermission)) {
            throw new UnauthorizedError(
                `Access denied. Required permission: ${requiredPermission}`
            );
        }
    }

    /**
     * Async wrapper for controller methods
     * @param {Function} fn - Controller method
     * @returns {Function} Wrapped method
     */
    asyncWrapper(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Format date for response
     * @param {Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        if (!date) return null;
        return new Date(date).toISOString();
    }

    /**
     * Parse sort parameters from query
     * @param {Object} query - Request query object
     * @param {Array} allowedFields - Allowed fields for sorting
     * @returns {Object} Sort parameters
     */
    parseSortParams(query, allowedFields = []) {
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

        // Validate sort field
        if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
            throw new ValidationError(
                `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
            );
        }

        return { sortBy, sortOrder };
    }

    /**
     * Create standardized error for missing resource
     * @param {string} resourceName - Name of the resource
     * @param {string} identifier - Resource identifier
     * @throws {NotFoundError}
     */
    throwNotFound(resourceName, identifier) {
        throw new NotFoundError(`${resourceName} with ID '${identifier}' not found`);
    }

    /**
     * Log controller action
     * @param {string} action - Action name
     * @param {Object} context - Additional context
     */
    logAction(action, context = {}) {
        this.logger.info(`Controller Action: ${action}`, {
            ...context,
            timestamp: new Date().toISOString()
        });
    }
}