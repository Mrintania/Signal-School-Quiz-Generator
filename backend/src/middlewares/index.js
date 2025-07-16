/**
 * Middlewares Index File
 * รวม exports ของ middlewares ทั้งหมด
 */

// Validation Middleware
export * from './validation/QuizValidation.js';
export { default as FileValidation } from './validation/FileValidation.js';
export { default as ValidationHandler } from './validation/ValidationHandler.js';

// Cache Middleware
export { CacheMiddleware } from './cache/CacheMiddleware.js';
export { default as CacheInvalidation } from './cache/CacheInvalidation.js';

// Security Middleware
export { default as RateLimitingMiddleware } from './security/RateLimitingMiddleware.js';
export { default as AuthorizationMiddleware } from './security/AuthorizationMiddleware.js';

// Error Middleware
export { ErrorHandlingMiddleware } from './error/ErrorHandlingMiddleware.js';

// Auth Middleware
export { authenticateToken, authorizeRole } from './auth.js';

// Rate Limiter
export { rateLimiter, aiGenerationLimiter } from './rateLimiter.js';