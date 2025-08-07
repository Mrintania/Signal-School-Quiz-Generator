// backend/src/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticateUser } = require('../middleware/auth');
const { generalLimiter, aiGenerationLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');
const { validateQuiz, validateQuestion } = require('../middleware/validation');

/**
 * Quiz Management Routes
 * เส้นทางสำหรับการจัดการข้อสอบ
 */

// GET /api/quizzes - ดึงข้อสอบทั้งหมดของผู้ใช้
router.get('/',
    authenticateUser,
    generalLimiter,
    quizController.getAllQuizzes
);

// GET /api/quizzes/:id - ดึงข้อสอบตาม ID
router.get('/:id',
    authenticateUser,
    generalLimiter,
    quizController.getQuizById
);

// POST /api/quizzes - สร้างข้อสอบใหม่
router.post('/',
    authenticateUser,
    generalLimiter,
    validateQuiz,
    quizController.createQuiz
);

// PUT /api/quizzes/:id - แก้ไขข้อสอบ
router.put('/:id',
    authenticateUser,
    generalLimiter,
    validateQuiz,
    quizController.updateQuiz
);

// DELETE /api/quizzes/:id - ลบข้อสอบ
router.delete('/:id',
    authenticateUser,
    generalLimiter,
    quizController.deleteQuiz
);

/**
 * AI Generation Routes
 * เส้นทางสำหรับการสร้างข้อสอบด้วย AI
 */

// POST /api/quizzes/generate - สร้างข้อสอบด้วย AI จากข้อความ
router.post('/generate',
    authenticateUser,
    aiGenerationLimiter,
    quizController.generateQuizWithAI
);

// POST /api/quizzes/generate-from-file - สร้างข้อสอบจากไฟล์เอกสาร
router.post('/generate-from-file',
    authenticateUser,
    aiGenerationLimiter,
    upload.single('file'),
    quizController.generateQuizFromFile
);

// POST /api/quizzes/analyze-content - วิเคราะห์เนื้อหาก่อนสร้างข้อสอบ
router.post('/analyze-content',
    authenticateUser,
    aiGenerationLimiter,
    quizController.analyzeContent
);

/**
 * Import/Export Routes
 * เส้นทางสำหรับการนำเข้า/ส่งออกข้อสอบ
 */

// POST /api/quizzes/import - นำเข้าข้อสอบจากไฟล์
router.post('/import',
    authenticateUser,
    generalLimiter,
    upload.single('file'),
    quizController.importQuiz
);

// GET /api/quizzes/:id/export - ส่งออกข้อสอบเป็นไฟล์
router.get('/:id/export',
    authenticateUser,
    generalLimiter,
    quizController.exportQuiz
);

// GET /api/quizzes/:id/export/pdf - ส่งออกข้อสอบเป็น PDF
router.get('/:id/export/pdf',
    authenticateUser,
    generalLimiter,
    quizController.exportQuizToPDF
);

/**
 * Question Management Routes
 * เส้นทางสำหรับการจัดการคำถาม
 */

// GET /api/quizzes/:id/questions - ดึงคำถามทั้งหมดในข้อสอบ
router.get('/:id/questions',
    authenticateUser,
    generalLimiter,
    quizController.getQuizQuestions
);

// POST /api/quizzes/:id/questions - เพิ่มคำถามใหม่
router.post('/:id/questions',
    authenticateUser,
    generalLimiter,
    validateQuestion,
    quizController.addQuestion
);

// PUT /api/quizzes/:id/questions/:questionId - แก้ไขคำถาม
router.put('/:id/questions/:questionId',
    authenticateUser,
    generalLimiter,
    validateQuestion,
    quizController.updateQuestion
);

// DELETE /api/quizzes/:id/questions/:questionId - ลบคำถาม
router.delete('/:id/questions/:questionId',
    authenticateUser,
    generalLimiter,
    quizController.deleteQuestion
);

// POST /api/quizzes/:id/questions/bulk - เพิ่มคำถามหลายข้อพร้อมกัน
router.post('/:id/questions/bulk',
    authenticateUser,
    generalLimiter,
    quizController.addBulkQuestions
);

/**
 * Quiz Templates Routes
 * เส้นทางสำหรับการจัดการเทมเพลตข้อสอบ
 */

// GET /api/quizzes/templates - ดึงเทมเพลตข้อสอบ
router.get('/templates/list',
    authenticateUser,
    generalLimiter,
    quizController.getQuizTemplates
);

// POST /api/quizzes/templates - สร้างเทมเพลตใหม่
router.post('/templates/create',
    authenticateUser,
    generalLimiter,
    quizController.createQuizTemplate
);

// POST /api/quizzes/templates/:templateId/use - ใช้เทมเพลตสร้างข้อสอบ
router.post('/templates/:templateId/use',
    authenticateUser,
    generalLimiter,
    quizController.useQuizTemplate
);

/**
 * Quiz Statistics Routes
 * เส้นทางสำหรับสstatisticsข้อสอบ
 */

// GET /api/quizzes/:id/statistics - ดูสถิติข้อสอบ
router.get('/:id/statistics',
    authenticateUser,
    generalLimiter,
    quizController.getQuizStatistics
);

// GET /api/quizzes/user/statistics - ดูสถิติการใช้งานของผู้ใช้
router.get('/user/statistics',
    authenticateUser,
    generalLimiter,
    quizController.getUserQuizStatistics
);

/**
 * Quiz Sharing Routes
 * เส้นทางสำหรับการแชร์ข้อสอบ
 */

// POST /api/quizzes/:id/share - แชร์ข้อสอบ
router.post('/:id/share',
    authenticateUser,
    generalLimiter,
    quizController.shareQuiz
);

// GET /api/quizzes/shared/:shareToken - เข้าถึงข้อสอบที่แชร์
router.get('/shared/:shareToken',
    quizController.getSharedQuiz
);

/**
 * Error Handling Middleware
 */
router.use((error, req, res, next) => {
    console.error('Quiz Routes Error:', error);
    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Internal server error in quiz routes',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

module.exports = router;