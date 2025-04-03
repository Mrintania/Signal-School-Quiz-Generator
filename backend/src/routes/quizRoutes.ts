import express, { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import QuizController from '../controllers/quizController.js';
import ExportController from '../controllers/exportController.js';
import { commonRules, validate, sanitizeAll } from '../utils/validator.js';
import { generalLimiter, aiGenerationLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/auth.js';
import { pool } from '../config/db.js';

interface TestRow extends RowDataPacket {
    test: number;
}

interface TableInfoRow extends RowDataPacket {
    Table: string;
}

interface ColumnInfoRow extends RowDataPacket {
    Field: string;
    Type: string;
    Null: string;
    Key: string;
    Default: string | null;
    Extra: string;
}

interface DatabaseRow {
    [key: string]: any;
}

interface TableColumn {
    Field: string;
    Type: string;
    Null: string;
    Key: string;
    Default: string | null;
    Extra: string;
}

const router = express.Router();

// Apply sanitization middleware to all routes
router.use(sanitizeAll);

// Apply general rate limiter to all quiz routes
router.use(generalLimiter);

// Add authenticateToken to secure routes
router.use(authenticateToken);

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

// Database test route
router.get('/test-db', async (req: Request, res: Response) => {
    try {
        // Ensure pool is not null
        if (!pool) {
            return res.status(500).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        // Test database connection
        const [rows] = await pool.execute<TestRow[]>('SELECT 1 as test');

        // Check if quizzes table exists
        const [tables] = await pool.execute<TableInfoRow[]>(`
            SHOW TABLES LIKE 'quizzes'
        `);

        const quizzesTableExists = tables.length > 0;

        if (quizzesTableExists) {
            // Get table structure
            const [columns] = await pool.execute<ColumnInfoRow[]>(`
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
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
});

export default router;