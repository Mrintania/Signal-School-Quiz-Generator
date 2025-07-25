// backend/src/middlewares/index.js
/**
 * Middleware Index File
 * รวม exports ของ middleware ทั้งหมด
 */

// Error handling
export { default as errorHandlingMiddleware } from './error/ErrorHandlingMiddleware.js';

// Authentication & Authorization
export { authenticateToken, authorizeRoles } from './auth.js';

// Rate limiting
export { rateLimiter, aiGenerationLimiter, authLimiter } from './rateLimiter.js';

// Validation
export { quizValidationRules } from './validation/QuizValidation.js';
export { userValidationRules } from './validation/UserValidation.js';
export { authValidationRules } from './validation/AuthValidation.js';

// File upload
export { fileUploadMiddleware } from './fileUpload.js';

// Cache
export { CacheMiddleware } from './cache/CacheMiddleware.js';

// Logging
export { requestLogger } from './requestLogger.js';

// Security
export { securityHeaders } from './security.js';