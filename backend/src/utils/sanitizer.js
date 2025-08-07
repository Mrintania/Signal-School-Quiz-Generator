const validator = require('validator');

/**
 * Sanitize a single value based on its type
 * @param {*} value - The value to sanitize
 * @param {WeakSet} visited - Set to track visited objects (prevents circular references)
 * @returns {*} - Sanitized value
 */
function sanitizeValue(value, visited = new WeakSet()) {
    if (typeof value === 'string') {
        // Escape HTML entities and trim whitespace
        return validator.escape(value.trim());
    }

    if (typeof value === 'number') {
        // Ensure number is finite
        return isFinite(value) ? value : 0;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return sanitizeAll(value, visited);
    }

    if (value && typeof value === 'object') {
        return sanitizeAll(value, visited);
    }

    return value;
}

/**
 * Recursively sanitize all values in an object or array
 * @param {Object|Array} data - The data to sanitize
 * @param {WeakSet} visited - Set to track visited objects (prevents circular references)
 * @returns {Object|Array} - Sanitized data
 */
function sanitizeAll(data, visited = new WeakSet()) {
    if (!data) return data;

    // Handle primitive types directly
    if (typeof data !== 'object') {
        return sanitizeValue(data);
    }

    // Prevent circular references
    if (visited.has(data)) {
        return '[Circular Reference]';
    }
    visited.add(data);

    if (Array.isArray(data)) {
        return data.map(item => sanitizeAll(item, visited));
    }

    // Handle regular objects
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        // Sanitize key name to prevent injection
        const sanitizedKey = validator.escape(key.toString().trim());
        sanitized[sanitizedKey] = sanitizeAll(value, visited);
    }

    return sanitized;
}

/**
 * Sanitize email address
 * @param {string} email - Email to validate and sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return null;

    const trimmed = email.trim().toLowerCase();
    return validator.isEmail(trimmed) ? trimmed : null;
}

/**
 * Sanitize and validate URL
 * @param {string} url - URL to validate and sanitize
 * @returns {string|null} - Sanitized URL or null if invalid
 */
function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim();
    return validator.isURL(trimmed) ? trimmed : null;
}

/**
 * Sanitize SQL input to prevent injection
 * @param {string} input - SQL input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeSql(input) {
    if (!input || typeof input !== 'string') return '';

    return input
        .replace(/['"\\;]/g, '') // Remove dangerous characters
        .trim();
}

/**
 * Sanitize numeric input
 * @param {*} input - Input to convert to number
 * @param {number} defaultValue - Default value if conversion fails
 * @returns {number} - Sanitized number
 */
function sanitizeNumber(input, defaultValue = 0) {
    const num = Number(input);
    return isFinite(num) ? num : defaultValue;
}

/**
 * Sanitize integer input
 * @param {*} input - Input to convert to integer
 * @param {number} defaultValue - Default value if conversion fails
 * @returns {number} - Sanitized integer
 */
function sanitizeInteger(input, defaultValue = 0) {
    const num = parseInt(input, 10);
    return isFinite(num) ? num : defaultValue;
}

/**
 * Sanitize boolean input
 * @param {*} input - Input to convert to boolean
 * @param {boolean} defaultValue - Default value if conversion fails
 * @returns {boolean} - Sanitized boolean
 */
function sanitizeBoolean(input, defaultValue = false) {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
        const lower = input.toLowerCase().trim();
        return ['true', '1', 'yes', 'on'].includes(lower);
    }
    if (typeof input === 'number') return input !== 0;
    return defaultValue;
}

module.exports = {
    sanitizeAll,
    sanitizeValue,
    sanitizeEmail,
    sanitizeUrl,
    sanitizeSql,
    sanitizeNumber,
    sanitizeInteger,
    sanitizeBoolean
};