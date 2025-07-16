// backend/src/middlewares/validation/ValidationMiddleware.js
import { ValidationError } from '../../errors/CustomErrors.js';
import { ResponseDTO } from '../../dto/common/ResponseDTO.js';
import logger from '../../utils/logger.js';

/**
 * Validation Middleware
 * จัดการ validation แบบรวมศูนย์
 */
export class ValidationMiddleware {
    /**
     * Validate DTO class
     * @param {Class} DTOClass - DTO class to validate
     * @returns {Function} Express middleware
     */
    static validateDTO(DTOClass) {
        return (req, res, next) => {
            try {
                // Create DTO instance (will trigger validation)
                const dto = new DTOClass(req.body);

                // Attach validated data to request
                req.validatedData = dto.toJSON();

                next();
            } catch (error) {
                if (error instanceof ValidationError) {
                    logger.warn('Validation failed:', { error: error.message, body: req.body });

                    return res.status(400).json(
                        ResponseDTO.error('ข้อมูลไม่ถูกต้อง', [error.message])
                    );
                }

                logger.error('Validation error:', error);
                return res.status(500).json(
                    ResponseDTO.error('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล')
                );
            }
        };
    }

    /**
     * Validate request parameters
     * @param {Object} schema - Parameter validation schema
     * @returns {Function} Express middleware
     */
    static validateParams(schema) {
        return (req, res, next) => {
            const errors = [];

            Object.keys(schema).forEach(paramName => {
                const value = req.params[paramName];
                const rules = schema[paramName];

                // Required validation
                if (rules.required && (value === undefined || value === null || value === '')) {
                    errors.push(`Parameter '${paramName}' is required`);
                    return;
                }

                if (value) {
                    // Type validation
                    if (rules.type === 'number' && isNaN(value)) {
                        errors.push(`Parameter '${paramName}' must be a number`);
                    }

                    if (rules.type === 'uuid' && !this.isValidUUID(value)) {
                        errors.push(`Parameter '${paramName}' must be a valid UUID`);
                    }

                    // Length validation
                    if (rules.minLength && value.length < rules.minLength) {
                        errors.push(`Parameter '${paramName}' must be at least ${rules.minLength} characters`);
                    }

                    if (rules.maxLength && value.length > rules.maxLength) {
                        errors.push(`Parameter '${paramName}' must not exceed ${rules.maxLength} characters`);
                    }

                    // Custom validation
                    if (rules.validate && !rules.validate(value)) {
                        errors.push(`Parameter '${paramName}' is invalid`);
                    }
                }
            });

            if (errors.length > 0) {
                logger.warn('Parameter validation failed:', { errors, params: req.params });

                return res.status(400).json(
                    ResponseDTO.error('Invalid parameters', errors)
                );
            }

            next();
        };
    }

    /**
     * Validate query parameters
     * @param {Object} schema - Query validation schema
     * @returns {Function} Express middleware
     */
    static validateQuery(schema) {
        return (req, res, next) => {
            const errors = [];
            const sanitizedQuery = {};

            Object.keys(schema).forEach(queryName => {
                const value = req.query[queryName];
                const rules = schema[queryName];

                // Set default value
                if (value === undefined && rules.default !== undefined) {
                    sanitizedQuery[queryName] = rules.default;
                    return;
                }

                // Required validation
                if (rules.required && (value === undefined || value === null || value === '')) {
                    errors.push(`Query parameter '${queryName}' is required`);
                    return;
                }

                if (value !== undefined) {
                    // Type conversion and validation
                    if (rules.type === 'number') {
                        const numValue = Number(value);
                        if (isNaN(numValue)) {
                            errors.push(`Query parameter '${queryName}' must be a number`);
                        } else {
                            sanitizedQuery[queryName] = numValue;
                        }
                    } else if (rules.type === 'boolean') {
                        sanitizedQuery[queryName] = value === 'true' || value === '1';
                    } else {
                        sanitizedQuery[queryName] = value;
                    }

                    // Range validation for numbers
                    if (rules.type === 'number' && !isNaN(Number(value))) {
                        const numValue = Number(value);
                        if (rules.min !== undefined && numValue < rules.min) {
                            errors.push(`Query parameter '${queryName}' must be at least ${rules.min}`);
                        }
                        if (rules.max !== undefined && numValue > rules.max) {
                            errors.push(`Query parameter '${queryName}' must not exceed ${rules.max}`);
                        }
                    }

                    // Enum validation
                    if (rules.enum && !rules.enum.includes(value)) {
                        errors.push(`Query parameter '${queryName}' must be one of: ${rules.enum.join(', ')}`);
                    }
                }
            });

            if (errors.length > 0) {
                logger.warn('Query validation failed:', { errors, query: req.query });

                return res.status(400).json(
                    ResponseDTO.error('Invalid query parameters', errors)
                );
            }

            // Replace query with sanitized version
            req.query = { ...req.query, ...sanitizedQuery };
            next();
        };
    }

    /**
     * File upload validation
     * @param {Object} options - File validation options
     * @returns {Function} Express middleware
     */
    static validateFile(options = {}) {
        return (req, res, next) => {
            if (!req.file && options.required) {
                return res.status(400).json(
                    ResponseDTO.error('File upload is required')
                );
            }

            if (req.file) {
                const errors = [];

                // File size validation
                if (options.maxSize && req.file.size > options.maxSize) {
                    errors.push(`File size must not exceed ${Math.round(options.maxSize / 1024 / 1024)}MB`);
                }

                // File type validation
                if (options.allowedTypes && !options.allowedTypes.includes(req.file.mimetype)) {
                    errors.push(`File type must be one of: ${options.allowedTypes.join(', ')}`);
                }

                // File extension validation
                if (options.allowedExtensions) {
                    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
                    if (!options.allowedExtensions.includes(fileExtension)) {
                        errors.push(`File extension must be one of: ${options.allowedExtensions.join(', ')}`);
                    }
                }

                if (errors.length > 0) {
                    logger.warn('File validation failed:', { errors, file: req.file.originalname });

                    return res.status(400).json(
                        ResponseDTO.error('File validation failed', errors)
                    );
                }
            }

            next();
        };
    }

    /**
     * Check if string is valid UUID
     * @param {string} str - String to validate
     * @returns {boolean} Is valid UUID
     */
    static isValidUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    /**
     * Sanitize input to prevent XSS
     * @param {*} input - Input to sanitize
     * @returns {*} Sanitized input
     */
    static sanitizeInput(input) {
        if (typeof input === 'string') {
            return input
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        }

        if (Array.isArray(input)) {
            return input.map(item => this.sanitizeInput(item));
        }

        if (typeof input === 'object' && input !== null) {
            const sanitized = {};
            Object.keys(input).forEach(key => {
                sanitized[key] = this.sanitizeInput(input[key]);
            });
            return sanitized;
        }

        return input;
    }
}

export default ValidationMiddleware;