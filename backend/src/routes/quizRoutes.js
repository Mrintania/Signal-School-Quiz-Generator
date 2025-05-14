import express from 'express';
import QuizController from '../controllers/quizController.js';
import ExportController from '../controllers/exportController.js';
import { commonRules, validate, sanitizeAll } from '../utils/validator.js';
import { generalLimiter, aiGenerationLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/auth.js'; // Import authentication middleware

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';


const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../../uploads/quiz-files');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 }); // Set proper permissions
}

// Configure multer storage with better error handling
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Verify directory exists before saving
        if (!fs.existsSync(uploadsDir)) {
            return cb(new Error('Upload directory does not exist'), null);
        }
        // Check if directory is writable
        try {
            fs.accessSync(uploadsDir, fs.constants.W_OK);
            cb(null, uploadsDir);
        } catch (err) {
            cb(new Error('Upload directory is not writable'), null);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.tmp';
        const sanitizedFilename = 'quiz-doc-' + uniqueSuffix + ext;
        cb(null, sanitizedFilename);
    }
});

// Improve file filter for better validation
const fileFilter = (req, file, cb) => {
    // Accept only allowed document types
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

    // Check if MIME type is valid
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}. Only PDF, DOCX, and TXT files are allowed.`), false);
    }
};

// Initialize multer upload with better error handling
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1  // Only one file at a time
    }
});

// Add new route for file-based quiz generation
router.post(
    '/generate-from-file',
    upload.single('quizFile'),
    QuizController.generateQuizFromFile
);


// Apply sanitization middleware to all routes
router.use(sanitizeAll);

// Apply general rate limiter to all quiz routes
router.use(generalLimiter);

// Add authenticateToken to secure routes
router.use(authenticateToken); // Apply authentication to all quiz routes

// API Route for generating a quiz - stricter rate limiting for AI calls
router.post(
    '/generate',
    aiGenerationLimiter,
    commonRules.quizRules.generate,
    validate,
    QuizController.generateQuiz
);

// API Route for saving a generated quiz
router.post(
    '/save',
    commonRules.quizRules.create,
    validate,
    QuizController.saveQuiz
);

// API Route for getting all quizzes
router.get('/', QuizController.getAllQuizzes);

// API Route for getting a quiz by ID
router.get(
    '/:id',
    commonRules.quizRules.getById,
    validate,
    QuizController.getQuizById
);

// API Route for deleting a quiz
router.delete(
    '/:id',
    commonRules.quizRules.delete,
    validate,
    QuizController.deleteQuiz
);

// API Route for renaming a quiz
router.patch(
    '/:id/rename',
    commonRules.quizRules.rename,
    validate,
    QuizController.renameQuiz
);

// API Route for exporting a quiz in GIFT format for Moodle
router.get(
    '/:id/export/moodle',
    commonRules.quizRules.getById,
    validate,
    ExportController.exportQuizToGift
);

// API Route for exporting a quiz in plain text format
router.get(
    '/:id/export/text',
    commonRules.quizRules.getById,
    validate,
    ExportController.exportQuizToPlainText
);

// API Route for updating quiz questions
router.patch(
    '/:id/questions',
    commonRules.quizRules.updateQuestions,
    validate,
    QuizController.updateQuizQuestions
);

// API Route for moving a quiz to a folder
router.patch(
    '/:id/move',
    commonRules.quizRules.move,
    validate,
    QuizController.moveQuiz
);

// API Route for checking title availability
router.get('/check-title', QuizController.checkTitleAvailability);

router.get('/test-db', async (req, res) => {
    try {
        // Test database connection
        const [rows] = await pool.execute('SELECT 1 as test');

        // Check if quizzes table exists
        const [tables] = await pool.execute(`
        SHOW TABLES LIKE 'quizzes'
      `);

        const quizzesTableExists = tables.length > 0;

        if (quizzesTableExists) {
            // Get table structure
            const [columns] = await pool.execute(`
          DESCRIBE quizzes
        `);

            return res.status(200).json({
                success: true,
                message: 'Database connection successful',
                dbTest: rows[0],
                quizzesTableExists,
                tableStructure: columns
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Database connection successful, but quizzes table does not exist',
                dbTest: rows[0],
                quizzesTableExists
            });
        }
    } catch (error) {
        console.error('Database test error:', error);

        return res.status(500).json({
            success: false,
            message: 'Database test failed',
            error: error.message,
            stack: error.stack
        });
    }
});

export default router;