import express from 'express';
import QuizController from '../controllers/quizController.js';
import { authenticateToken } from '../middlewares/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sanitizeAll } from '../utils/sanitizer.js';
import { generalLimiter } from '../middlewares/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Apply sanitization middleware to all routes
router.use(sanitizeAll);

// Apply general rate limiter to all quiz routes
router.use(generalLimiter);

// Add authenticateToken to secure routes
router.use(authenticateToken);

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        
        // Ensure UTF-8 filename handling
        const sanitizedOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const baseFileName = path.basename(sanitizedOriginalName, fileExtension);
        
        cb(null, `doc-${req.user.userId}-${uniqueSuffix}-${baseFileName}${fileExtension}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];
    
    // Handle UTF-8 filenames properly
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    file.originalname = originalName;
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('รองรับเฉพาะไฟล์ PDF, DOCX และ TXT เท่านั้น!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit
    },
    fileFilter: fileFilter
});

// Apply UTF-8 middleware to all routes
router.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

router.use(authenticateToken);

// API Route for generating a quiz - stricter rate limiting for AI calls
router.post(
    '/generate',
    aiGenerationLimiter,
    commonRules.quizRules.generate,
    validate,
    QuizController.generateQuiz
);

// API Route for generating quiz from file upload with UTF-8 support
router.post(
    '/generate-from-file',
    upload.single('file'),
    (req, res, next) => {
        // Additional UTF-8 handling middleware
        if (req.file && req.file.originalname) {
            // Ensure proper UTF-8 encoding for filename
            req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        }
        next();
    },
    QuizController.generateQuizFromFile
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