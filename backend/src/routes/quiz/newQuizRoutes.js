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
import errorHandlingMiddleware from '../../middlewares/error/ErrorHandlingMiddleware.js'; // ใช้ default import
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
// errorHandlingMiddleware is already a singleton instance, no need to create new instance

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
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Define allowed file types
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, CSV, XLS, XLSX files are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files
    }
});

// Middleware setup
router.use(authenticateToken);
router.use(rateLimiter);

// Quiz Generation Routes
router.post('/generate',
    aiGenerationLimiter,
    upload.single('file'),
    quizValidationRules.generateQuiz,
    errorHandlingMiddleware.asyncHandler(quizGenerationController.generateQuiz.bind(quizGenerationController))
);

router.post('/generate-batch',
    aiGenerationLimiter,
    upload.array('files', 5),
    quizValidationRules.generateBatchQuiz,
    errorHandlingMiddleware.asyncHandler(quizGenerationController.generateBatchQuiz.bind(quizGenerationController))
);

router.post('/generate-from-template',
    aiGenerationLimiter,
    quizValidationRules.generateFromTemplate,
    errorHandlingMiddleware.asyncHandler(quizGenerationController.generateFromTemplate.bind(quizGenerationController))
);

// Quiz Management Routes
router.get('/',
    cacheMiddleware.get('user-quizzes', 300), // Cache for 5 minutes
    errorHandlingMiddleware.asyncHandler(quizManagementController.getUserQuizzes.bind(quizManagementController))
);

router.get('/:quizId',
    cacheMiddleware.get('quiz-detail', 600), // Cache for 10 minutes
    quizValidationRules.getQuiz,
    errorHandlingMiddleware.asyncHandler(quizManagementController.getQuizById.bind(quizManagementController))
);

router.put('/:quizId',
    quizValidationRules.updateQuiz,
    errorHandlingMiddleware.asyncHandler(quizManagementController.updateQuiz.bind(quizManagementController))
);

router.delete('/:quizId',
    quizValidationRules.deleteQuiz,
    errorHandlingMiddleware.asyncHandler(quizManagementController.deleteQuiz.bind(quizManagementController))
);

router.post('/:quizId/duplicate',
    quizValidationRules.duplicateQuiz,
    errorHandlingMiddleware.asyncHandler(quizManagementController.duplicateQuiz.bind(quizManagementController))
);

// Quiz Export/Import Routes
router.get('/:quizId/export',
    quizValidationRules.exportQuiz,
    errorHandlingMiddleware.asyncHandler(quizManagementController.exportQuiz.bind(quizManagementController))
);

router.post('/import',
    upload.single('quizFile'),
    quizValidationRules.importQuiz,
    errorHandlingMiddleware.asyncHandler(quizManagementController.importQuiz.bind(quizManagementController))
);

// Quiz Statistics Routes
router.get('/:quizId/stats',
    cacheMiddleware.get('quiz-stats', 300),
    quizValidationRules.getQuizStats,
    errorHandlingMiddleware.asyncHandler(quizManagementController.getQuizStatistics.bind(quizManagementController))
);

// Quiz Templates Routes
router.get('/templates/list',
    cacheMiddleware.get('quiz-templates', 1800), // Cache for 30 minutes
    errorHandlingMiddleware.asyncHandler(quizManagementController.getQuizTemplates.bind(quizManagementController))
);

router.post('/templates/save',
    quizValidationRules.saveTemplate,
    errorHandlingMiddleware.asyncHandler(quizManagementController.saveAsTemplate.bind(quizManagementController))
);

// Quiz Validation Routes
router.post('/:quizId/validate',
    quizValidationRules.validateQuiz,
    errorHandlingMiddleware.asyncHandler(quizGenerationController.validateQuizContent.bind(quizGenerationController))
);

// Quiz Preview Routes
router.get('/:quizId/preview',
    cacheMiddleware.get('quiz-preview', 600),
    quizValidationRules.previewQuiz,
    errorHandlingMiddleware.asyncHandler(quizManagementController.previewQuiz.bind(quizManagementController))
);

// Quiz Regeneration Routes
router.post('/:quizId/regenerate',
    aiGenerationLimiter,
    quizValidationRules.regenerateQuiz,
    errorHandlingMiddleware.asyncHandler(quizGenerationController.regenerateQuiz.bind(quizGenerationController))
);

// Error handling middleware (must be last)
router.use(errorHandlingMiddleware.create());

// Log routes initialization
logger.info('Quiz routes initialized with all endpoints');

export default router;