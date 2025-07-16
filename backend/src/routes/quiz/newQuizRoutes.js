// backend/src/routes/quiz/newQuizRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Import new controllers
import { QuizGenerationController } from '../../controllers/quiz/QuizGenerationController.js';
import { QuizManagementController } from '../../controllers/quiz/QuizManagementController.js';

// Import middleware
import { authenticateToken } from '../../middlewares/auth.js';
import { rateLimiter, aiGenerationLimiter } from '../../middlewares/rateLimiter.js';
import { quizValidationRules } from '../../middlewares/validation/QuizValidation.js';
import { ErrorHandlingMiddleware } from '../../middlewares/error/ErrorHandlingMiddleware.js';
import { CacheMiddleware } from '../../middlewares/cache/CacheMiddleware.js';

// Import services for dependency injection
import { QuizGenerationService } from '../../services/quiz/QuizGenerationService.js';
import { QuizManagementService } from '../../services/quiz/QuizManagementService.js';
import { CacheService } from '../../services/common/CacheService.js';
import { FileService } from '../../services/common/FileService.js';

import logger from '../../utils/common/Logger.js';

const router = express.Router();

// Initialize services with dependency injection
const cacheService = new CacheService();
const fileService = new FileService();
const quizGenerationService = new QuizGenerationService({ fileService, cacheService });
const quizManagementService = new QuizManagementService({ cacheService });

// Initialize controllers with dependencies
const quizGenerationController = new QuizGenerationController({
    quizGenerationService,
    fileService
});

const quizManagementController = new QuizManagementController({
    quizManagementService,
    cacheService
});

// Initialize middleware
const cacheMiddleware = new CacheMiddleware(cacheService);
const errorHandler = new ErrorHandlingMiddleware();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/temp';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate safe filename with timestamp
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname);
        const safeName = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_{2,}/g, '_')
            .substring(0, 50);

        cb(null, `${timestamp}_${random}_${safeName}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        req.fileValidationError = new Error('Invalid file type');
        cb(null, false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
    },
    fileFilter
});

// Apply global middleware
router.use(authenticateToken);
router.use(rateLimiter);

// Set UTF-8 headers
router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

// =================================================================
// QUIZ GENERATION ROUTES
// =================================================================

/**
 * Generate quiz from text content
 * POST /api/quiz/generation/text
 */
router.post('/generation/text',
    aiGenerationLimiter,
    quizValidationRules.generation,
    quizGenerationController.generateQuizFromText
);

/**
 * Generate quiz from uploaded file
 * POST /api/quiz/generation/file
 */
router.post('/generation/file',
    upload.single('file'),
    aiGenerationLimiter,
    quizValidationRules.fileUpload,
    quizGenerationController.generateQuizFromFile
);

/**
 * Generate additional questions for existing quiz
 * POST /api/quiz/generation/:id/additional
 */
router.post('/generation/:id/additional',
    aiGenerationLimiter,
    quizValidationRules.additionalQuestions,
    quizGenerationController.generateAdditionalQuestions
);

/**
 * Regenerate quiz questions
 * POST /api/quiz/generation/:id/regenerate
 */
router.post('/generation/:id/regenerate',
    aiGenerationLimiter,
    quizValidationRules.id,
    quizGenerationController.regenerateQuizQuestions
);

/**
 * Check AI service health
 * GET /api/quiz/generation/health
 */
router.get('/generation/health',
    cacheMiddleware.get('ai-health', 60), // Cache for 1 minute
    quizGenerationController.checkAIServiceHealth
);

/**
 * Preview generation prompt (Admin only)
 * POST /api/quiz/generation/preview-prompt
 */
router.post('/generation/preview-prompt',
    quizValidationRules.generation,
    quizGenerationController.previewGenerationPrompt
);

/**
 * Estimate generation cost
 * POST /api/quiz/generation/estimate-cost
 */
router.post('/generation/estimate-cost',
    quizGenerationController.estimateGenerationCost
);

/**
 * Analyze content difficulty
 * POST /api/quiz/generation/analyze-difficulty
 */
router.post('/generation/analyze-difficulty',
    quizGenerationController.analyzeDifficulty
);

/**
 * Validate generation input
 * POST /api/quiz/generation/validate
 */
router.post('/generation/validate',
    quizGenerationController.validateGenerationInput
);

/**
 * Get generation history
 * GET /api/quiz/generation/history
 */
router.get('/generation/history',
    cacheMiddleware.get('generation-history', 300), // Cache for 5 minutes
    quizGenerationController.getGenerationHistory
);

/**
 * Cancel ongoing generation
 * POST /api/quiz/generation/cancel/:taskId
 */
router.post('/generation/cancel/:taskId',
    quizGenerationController.cancelGeneration
);

/**
 * Get generation status
 * GET /api/quiz/generation/status/:taskId
 */
router.get('/generation/status/:taskId',
    quizGenerationController.getGenerationStatus
);

// =================================================================
// QUIZ MANAGEMENT ROUTES
// =================================================================

/**
 * Get all user's quizzes with pagination and filters
 * GET /api/quiz/management
 */
router.get('/management',
    cacheMiddleware.get('user-quizzes', 300), // Cache for 5 minutes
    quizValidationRules.search,
    quizManagementController.getAllQuizzes
);

/**
 * Get quiz by ID
 * GET /api/quiz/management/:id
 */
router.get('/management/:id',
    cacheMiddleware.get('quiz-detail', 600), // Cache for 10 minutes
    quizValidationRules.id,
    quizManagementController.getQuizById
);

/**
 * Create new quiz
 * POST /api/quiz/management
 */
router.post('/management',
    quizValidationRules.creation,
    cacheMiddleware.invalidate(['user-quizzes:*', 'quiz-statistics:*']),
    quizManagementController.createQuiz
);

/**
 * Update quiz
 * PUT /api/quiz/management/:id
 */
router.put('/management/:id',
    quizValidationRules.update,
    cacheMiddleware.invalidate(['quiz:*', 'user-quizzes:*']),
    quizManagementController.updateQuiz
);

/**
 * Delete quiz
 * DELETE /api/quiz/management/:id
 */
router.delete('/management/:id',
    quizValidationRules.id,
    cacheMiddleware.invalidate(['quiz:*', 'user-quizzes:*', 'quiz-statistics:*']),
    quizManagementController.deleteQuiz
);

/**
 * Rename quiz
 * PATCH /api/quiz/management/:id/rename
 */
router.patch('/management/:id/rename',
    quizValidationRules.rename,
    cacheMiddleware.invalidate(['quiz:*', 'user-quizzes:*']),
    quizManagementController.renameQuiz
);

/**
 * Move quiz to folder
 * PATCH /api/quiz/management/:id/move
 */
router.patch('/management/:id/move',
    quizValidationRules.move,
    cacheMiddleware.invalidate(['quiz:*', 'user-quizzes:*']),
    quizManagementController.moveQuiz
);

/**
 * Duplicate quiz
 * POST /api/quiz/management/:id/duplicate
 */
router.post('/management/:id/duplicate',
    quizValidationRules.id,
    cacheMiddleware.invalidate(['user-quizzes:*', 'quiz-statistics:*']),
    quizManagementController.duplicateQuiz
);

/**
 * Share quiz
 * POST /api/quiz/management/:id/share
 */
router.post('/management/:id/share',
    quizValidationRules.id,
    quizManagementController.shareQuiz
);

/**
 * Update quiz questions
 * PUT /api/quiz/management/:id/questions
 */
router.put('/management/:id/questions',
    quizValidationRules.questionsUpdate,
    cacheMiddleware.invalidate(['quiz:*', 'user-quizzes:*']),
    quizManagementController.updateQuizQuestions
);

/**
 * Search quizzes
 * GET /api/quiz/management/search
 */
router.get('/management/search',
    quizValidationRules.search,
    quizManagementController.searchQuizzes
);

/**
 * Get recent quizzes
 * GET /api/quiz/management/recent
 */
router.get('/management/recent',
    cacheMiddleware.get('recent-quizzes', 300), // Cache for 5 minutes
    quizManagementController.getRecentQuizzes
);

/**
 * Get user statistics
 * GET /api/quiz/management/statistics
 */
router.get('/management/statistics',
    cacheMiddleware.get('quiz-statistics', 600), // Cache for 10 minutes
    quizManagementController.getQuizStatistics
);

/**
 * Bulk operations on quizzes
 * POST /api/quiz/management/bulk
 */
router.post('/management/bulk',
    quizValidationRules.bulkOperations,
    cacheMiddleware.invalidate(['user-quizzes:*', 'quiz-statistics:*']),
    quizManagementController.bulkOperations
);

/**
 * Check title availability
 * GET /api/quiz/management/check-title
 */
router.get('/management/check-title',
    quizManagementController.checkTitleAvailability
);

// =================================================================
// LEGACY COMPATIBILITY ROUTES
// =================================================================

/**
 * Legacy route compatibility
 * These routes maintain backward compatibility with existing frontend
 */

// Legacy generate route
router.post('/generate',
    aiGenerationLimiter,
    quizValidationRules.generation,
    (req, res, next) => {
        logger.warn('Using legacy generate route, consider migrating to /generation/text');
        next();
    },
    quizGenerationController.generateQuizFromText
);

// Legacy generate from file route
router.post('/generate-from-file',
    upload.single('file'),
    aiGenerationLimiter,
    quizValidationRules.fileUpload,
    (req, res, next) => {
        logger.warn('Using legacy generate-from-file route, consider migrating to /generation/file');
        next();
    },
    quizGenerationController.generateQuizFromFile
);

// Legacy management routes
router.get('/',
    cacheMiddleware.get('user-quizzes', 300),
    (req, res, next) => {
        logger.warn('Using legacy quiz list route, consider migrating to /management');
        next();
    },
    quizManagementController.getAllQuizzes
);

router.get('/:id',
    cacheMiddleware.get('quiz-detail', 600),
    quizValidationRules.id,
    (req, res, next) => {
        logger.warn('Using legacy quiz detail route, consider migrating to /management/:id');
        next();
    },
    quizManagementController.getQuizById
);

router.post('/',
    quizValidationRules.creation,
    (req, res, next) => {
        logger.warn('Using legacy quiz create route, consider migrating to /management');
        next();
    },
    quizManagementController.createQuiz
);

router.delete('/:id',
    quizValidationRules.id,
    cacheMiddleware.invalidate(['quiz:*', 'user-quizzes:*']),
    (req, res, next) => {
        logger.warn('Using legacy quiz delete route, consider migrating to /management/:id');
        next();
    },
    quizManagementController.deleteQuiz
);

// =================================================================
// ERROR HANDLING
// =================================================================

// Handle multer errors
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)',
                error: 'FILE_TOO_LARGE'
            });
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'ประเภทไฟล์ไม่ถูกต้อง',
                error: 'INVALID_FILE_TYPE'
            });
        }
    }
    next(error);
});

// Global error handler for quiz routes
router.use(errorHandler.handle.bind(errorHandler));

// Route not found handler
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// =================================================================
// DEVELOPMENT ROUTES (only in development)
// =================================================================

if (process.env.NODE_ENV === 'development') {
    /**
     * Development route to test controllers
     * GET /api/quiz/dev/test
     */
    router.get('/dev/test', (req, res) => {
        res.json({
            success: true,
            message: 'Quiz routes are working',
            controllers: {
                generation: !!quizGenerationController,
                management: !!quizManagementController
            },
            services: {
                generation: !!quizGenerationService,
                management: !!quizManagementService,
                cache: !!cacheService,
                file: !!fileService
            },
            timestamp: new Date().toISOString()
        });
    });

    /**
     * Development route to clear all caches
     * POST /api/quiz/dev/clear-cache
     */
    router.post('/dev/clear-cache', async (req, res) => {
        try {
            const cleared = await cacheService.clear();
            res.json({
                success: true,
                message: 'Cache cleared successfully',
                itemsCleared: cleared,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to clear cache',
                error: error.message
            });
        }
    });

    /**
     * Development route to get cache statistics
     * GET /api/quiz/dev/cache-stats
     */
    router.get('/dev/cache-stats', (req, res) => {
        const stats = cacheService.getStats();
        res.json({
            success: true,
            cacheStats: stats,
            timestamp: new Date().toISOString()
        });
    });
}

// Log route initialization
logger.info('Quiz routes initialized:', {
    environment: process.env.NODE_ENV,
    controllers: {
        generation: !!quizGenerationController,
        management: !!quizManagementController
    },
    middleware: {
        cache: !!cacheMiddleware,
        errorHandler: !!errorHandler,
        upload: !!upload
    }
});

export default router;