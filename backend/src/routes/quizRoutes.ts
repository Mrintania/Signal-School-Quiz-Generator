import express, { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import QuizController from '../controllers/quizController.js';
import ExportController from '../controllers/exportController.js';
import { commonRules, validate, sanitizeAll } from '../utils/validator.js';
import { generalLimiter, aiGenerationLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/auth.js';
import { pool } from '../config/db.js';
import { AuthRequest } from '../types/index.js';
import QuizService from '../services/quizService.js';

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

// 1. เส้นทางสำหรับสร้างโฟลเดอร์ใหม่
router.post(
    '/folders',
    async (req: AuthRequest, res: Response) => {
        try {
            const { name, parentId } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // ตรวจสอบชื่อโฟลเดอร์
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Folder name is required'
                });
            }

            // สร้างโฟลเดอร์
            const result = await QuizService.createFolder(name.trim(), userId, parentId || null);

            if (result.success) {
                return res.status(201).json({
                    success: true,
                    message: 'Folder created successfully',
                    folderId: result.folderId
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create folder',
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error creating folder:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while creating the folder',
                error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
            });
        }
    }
);

// 2. เส้นทางสำหรับดึงข้อมูลโฟลเดอร์ทั้งหมดของผู้ใช้
router.get(
    '/folders',
    async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const folders = await QuizService.getUserFolders(userId);

            return res.status(200).json({
                success: true,
                data: folders
            });
        } catch (error) {
            console.error('Error fetching folders:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching folders',
                error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
            });
        }
    }
);

// 3. เส้นทางสำหรับดึงข้อมูลข้อสอบในโฟลเดอร์
router.get(
    '/folders/:folderId/quizzes',
    async (req: AuthRequest, res: Response) => {
        try {
            const { folderId } = req.params;
            const userId = req.user?.userId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 100;
            const offset = (page - 1) * limit;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงโฟลเดอร์นี้หรือไม่
            const hasAccess = await QuizService.checkFolderAccess(folderId, userId);
            if (!hasAccess && folderId !== 'root' && folderId !== '0') {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this folder'
                });
            }

            // ดึงข้อมูลข้อสอบในโฟลเดอร์
            const result = await QuizService.getFolderQuizzes(folderId, { limit, offset });

            // สร้างการตอบกลับพร้อมข้อมูลการแบ่งหน้า
            return res.status(200).json({
                success: true,
                data: result.quizzes,
                pagination: {
                    total: result.total,
                    page,
                    limit,
                    totalPages: Math.ceil(result.total / limit)
                }
            });
        } catch (error) {
            console.error('Error fetching folder quizzes:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching folder quizzes',
                error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
            });
        }
    }
);

export default router;