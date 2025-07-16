// backend/src/middlewares/validation/QuizValidation.js
import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../../errors/CustomErrors.js';
import logger from '../../utils/common/Logger.js';

/**
 * Quiz Validation Middleware
 * จัดการการตรวจสอบความถูกต้องของข้อมูลข้อสอบ
 */

/**
 * Validation result handler middleware
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value
        }));

        logger.warn('Validation errors:', {
            userId: req.user?.userId,
            path: req.path,
            method: req.method,
            errors: errorMessages
        });

        return res.status(400).json({
            success: false,
            message: 'ข้อมูลไม่ถูกต้อง',
            errors: errorMessages,
            timestamp: new Date().toISOString()
        });
    }

    next();
};

/**
 * Quiz Generation Validation Rules
 */
export const validateQuizGeneration = [
    body('content')
        .notEmpty()
        .withMessage('เนื้อหาสำหรับสร้างข้อสอบไม่สามารถเป็นค่าว่างได้')
        .isLength({ min: 50, max: 50000 })
        .withMessage('เนื้อหาต้องมีความยาวระหว่าง 50-50,000 ตัวอักษร')
        .custom((value) => {
            // Check for meaningful content (not just whitespace)
            const meaningfulContent = value.trim().replace(/\s+/g, ' ');
            if (meaningfulContent.length < 50) {
                throw new Error('เนื้อหาต้องมีความหมายและยาวอย่างน้อย 50 ตัวอักษร');
            }
            return true;
        }),

    body('questionType')
        .notEmpty()
        .withMessage('ต้องระบุประเภทของคำถาม')
        .isIn(['multiple_choice', 'true_false', 'fill_in_blank', 'essay', 'matching'])
        .withMessage('ประเภทคำถามไม่ถูกต้อง'),

    body('questionCount')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('จำนวนคำถามต้องอยู่ระหว่าง 1-100')
        .toInt(),

    body('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard', 'expert'])
        .withMessage('ระดับความยากไม่ถูกต้อง'),

    body('subject')
        .optional()
        .isLength({ max: 100 })
        .withMessage('ชื่อวิชาต้องไม่เกิน 100 ตัวอักษร')
        .trim(),

    body('language')
        .optional()
        .isIn(['th', 'en'])
        .withMessage('ภาษาต้องเป็น th หรือ en'),

    body('includeExplanations')
        .optional()
        .isBoolean()
        .withMessage('includeExplanations ต้องเป็น boolean')
        .toBoolean(),

    body('customInstructions')
        .optional()
        .isLength({ max: 500 })
        .withMessage('คำแนะนำเพิ่มเติมต้องไม่เกิน 500 ตัวอักษร')
        .trim(),

    handleValidationErrors
];

/**
 * Quiz Creation Validation Rules
 */
export const validateQuizCreation = [
    body('title')
        .notEmpty()
        .withMessage('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้')
        .isLength({ min: 3, max: 255 })
        .withMessage('ชื่อข้อสอบต้องมีความยาวระหว่าง 3-255 ตัวอักษร')
        .trim()
        .custom((value) => {
            // Check for meaningful title (not just numbers or special characters)
            const meaningfulPattern = /^[\u0E00-\u0E7Fa-zA-Z0-9\s\-_.,!?()]+$/;
            if (!meaningfulPattern.test(value)) {
                throw new Error('ชื่อข้อสอบมีตัวอักษรที่ไม่ถูกต้อง');
            }
            return true;
        }),

    body('topic')
        .optional()
        .isLength({ max: 255 })
        .withMessage('หัวข้อต้องไม่เกิน 255 ตัวอักษร')
        .trim(),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('คำอธิบายต้องไม่เกิน 1,000 ตัวอักษร')
        .trim(),

    body('category')
        .optional()
        .isIn(['general', 'mathematics', 'science', 'language', 'history', 'technology', 'other'])
        .withMessage('หมวดหมู่ไม่ถูกต้อง'),

    body('questionType')
        .optional()
        .isIn(['multiple_choice', 'true_false', 'fill_in_blank', 'essay', 'matching'])
        .withMessage('ประเภทคำถามไม่ถูกต้อง'),

    body('difficultyLevel')
        .optional()
        .isIn(['easy', 'medium', 'hard', 'expert'])
        .withMessage('ระดับความยากไม่ถูกต้อง'),

    body('timeLimit')
        .optional()
        .isInt({ min: 1, max: 480 })
        .withMessage('เวลาในการทำข้อสอบต้องอยู่ระหว่าง 1-480 นาที')
        .toInt(),

    body('folderId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Folder ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    body('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('สถานะไม่ถูกต้อง'),

    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic ต้องเป็น boolean')
        .toBoolean(),

    body('tags')
        .optional()
        .isArray()
        .withMessage('tags ต้องเป็น array')
        .custom((tags) => {
            if (tags.length > 10) {
                throw new Error('จำนวน tags ต้องไม่เกิน 10 รายการ');
            }
            
            for (const tag of tags) {
                if (typeof tag !== 'string' || tag.length > 50) {
                    throw new Error('แต่ละ tag ต้องเป็น string และไม่เกิน 50 ตัวอักษร');
                }
            }
            
            return true;
        }),

    body('questions')
        .optional()
        .isArray()
        .withMessage('questions ต้องเป็น array')
        .custom((questions) => {
            if (questions.length > 100) {
                throw new Error('จำนวนคำถามต้องไม่เกิน 100 ข้อ');
            }
            
            // Validate each question
            questions.forEach((question, index) => {
                validateQuestionStructure(question, index);
            });
            
            return true;
        }),

    handleValidationErrors
];

/**
 * Quiz Update Validation Rules
 */
export const validateQuizUpdate = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Quiz ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    body('title')
        .optional()
        .isLength({ min: 3, max: 255 })
        .withMessage('ชื่อข้อสอบต้องมีความยาวระหว่าง 3-255 ตัวอักษร')
        .trim(),

    body('topic')
        .optional()
        .isLength({ max: 255 })
        .withMessage('หัวข้อต้องไม่เกิน 255 ตัวอักษร')
        .trim(),

    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('คำอธิบายต้องไม่เกิน 1,000 ตัวอักษร')
        .trim(),

    body('category')
        .optional()
        .isIn(['general', 'mathematics', 'science', 'language', 'history', 'technology', 'other'])
        .withMessage('หมวดหมู่ไม่ถูกต้อง'),

    body('difficultyLevel')
        .optional()
        .isIn(['easy', 'medium', 'hard', 'expert'])
        .withMessage('ระดับความยากไม่ถูกต้อง'),

    body('timeLimit')
        .optional()
        .isInt({ min: 1, max: 480 })
        .withMessage('เวลาในการทำข้อสอบต้องอยู่ระหว่าง 1-480 นาที')
        .toInt(),

    body('status')
        .optional()
        .isIn(['draft', 'published', 'archived'])
        .withMessage('สถานะไม่ถูกต้อง'),

    handleValidationErrors
];

/**
 * Quiz ID Validation Rules
 */
export const validateQuizId = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Quiz ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    handleValidationErrors
];

/**
 * Quiz Search Validation Rules
 */
export const validateQuizSearch = [
    query('query')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('คำค้นหาต้องมีความยาวระหว่าง 1-100 ตัวอักษร')
        .trim(),

    query('category')
        .optional()
        .isIn(['general', 'mathematics', 'science', 'language', 'history', 'technology', 'other'])
        .withMessage('หมวดหมู่ไม่ถูกต้อง'),

    query('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard', 'expert'])
        .withMessage('ระดับความยากไม่ถูกต้อง'),

    query('questionType')
        .optional()
        .isIn(['multiple_choice', 'true_false', 'fill_in_blank', 'essay', 'matching'])
        .withMessage('ประเภทคำถามไม่ถูกต้อง'),

    query('status')
        .optional()
        .isIn(['draft', 'published', 'archived', 'active'])
        .withMessage('สถานะไม่ถูกต้อง'),

    query('folderId')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Folder ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('หมายเลขหน้าต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('จำนวนรายการต่อหน้าต้องอยู่ระหว่าง 1-100')
        .toInt(),

    query('sortBy')
        .optional()
        .isIn(['title', 'created_at', 'updated_at', 'question_count'])
        .withMessage('การเรียงลำดับไม่ถูกต้อง'),

    query('sortOrder')
        .optional()
        .isIn(['ASC', 'DESC', 'asc', 'desc'])
        .withMessage('ทิศทางการเรียงลำดับต้องเป็น ASC หรือ DESC')
        .toUpperCase(),

    handleValidationErrors
];

/**
 * Quiz Rename Validation Rules
 */
export const validateQuizRename = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Quiz ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    body('title')
        .notEmpty()
        .withMessage('ชื่อข้อสอบไม่สามารถเป็นค่าว่างได้')
        .isLength({ min: 3, max: 255 })
        .withMessage('ชื่อข้อสอบต้องมีความยาวระหว่าง 3-255 ตัวอักษร')
        .trim(),

    handleValidationErrors
];

/**
 * Quiz Move Validation Rules
 */
export const validateQuizMove = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Quiz ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    body('folderId')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('Folder ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    handleValidationErrors
];

/**
 * Quiz Questions Update Validation Rules
 */
export const validateQuizQuestionsUpdate = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Quiz ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    body('questions')
        .isArray()
        .withMessage('questions ต้องเป็น array')
        .custom((questions) => {
            if (questions.length === 0) {
                throw new Error('ต้องมีอย่างน้อย 1 คำถาม');
            }
            
            if (questions.length > 100) {
                throw new Error('จำนวนคำถามต้องไม่เกิน 100 ข้อ');
            }
            
            // Validate each question
            questions.forEach((question, index) => {
                validateQuestionStructure(question, index);
            });
            
            return true;
        }),

    handleValidationErrors
];

/**
 * Bulk Operations Validation Rules
 */
export const validateBulkOperations = [
    body('operation')
        .notEmpty()
        .withMessage('ต้องระบุการดำเนินการ')
        .isIn(['delete', 'move', 'archive', 'publish'])
        .withMessage('การดำเนินการไม่ถูกต้อง'),

    body('quizIds')
        .isArray({ min: 1 })
        .withMessage('ต้องระบุรายการ Quiz ID อย่างน้อย 1 รายการ')
        .custom((quizIds) => {
            if (quizIds.length > 50) {
                throw new Error('จำนวน Quiz ID ต้องไม่เกิน 50 รายการ');
            }
            
            // Validate each ID
            quizIds.forEach((id, index) => {
                if (!Number.isInteger(id) || id < 1) {
                    throw new Error(`Quiz ID ที่ตำแหน่ง ${index} ไม่ถูกต้อง`);
                }
            });
            
            return true;
        }),

    body('targetFolderId')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('Target Folder ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    handleValidationErrors
];

/**
 * File Upload Validation (for multer integration)
 */
export const validateFileUpload = (req, res, next) => {
    // This will be called after multer processes the file
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'ต้องแนบไฟล์สำหรับสร้างข้อสอบ',
            timestamp: new Date().toISOString()
        });
    }

    // Validate file type
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            message: 'ประเภทไฟล์ไม่รองรับ รองรับเฉพาะ PDF, DOC, DOCX, และ TXT',
            timestamp: new Date().toISOString()
        });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
        return res.status(400).json({
            success: false,
            message: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)',
            timestamp: new Date().toISOString()
        });
    }

    next();
};

/**
 * Additional Questions Generation Validation
 */
export const validateAdditionalQuestions = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Quiz ID ต้องเป็นจำนวนเต็มบวก')
        .toInt(),

    body('questionCount')
        .isInt({ min: 1, max: 50 })
        .withMessage('จำนวนคำถามเพิ่มเติมต้องอยู่ระหว่าง 1-50')
        .toInt(),

    body('difficulty')
        .optional()
        .isIn(['easy', 'medium', 'hard', 'expert'])
        .withMessage('ระดับความยากไม่ถูกต้อง'),

    body('questionType')
        .optional()
        .isIn(['multiple_choice', 'true_false', 'fill_in_blank', 'essay', 'matching'])
        .withMessage('ประเภทคำถามไม่ถูกต้อง'),

    handleValidationErrors
];

/**
 * Helper function to validate question structure
 */
function validateQuestionStructure(question, index) {
    if (!question.question || typeof question.question !== 'string') {
        throw new Error(`คำถามที่ ${index + 1}: ข้อความคำถามไม่ถูกต้อง`);
    }

    if (question.question.length > 1000) {
        throw new Error(`คำถามที่ ${index + 1}: ข้อความคำถามยาวเกินไป (สูงสุด 1,000 ตัวอักษร)`);
    }

    if (!question.options || !Array.isArray(question.options)) {
        throw new Error(`คำถามที่ ${index + 1}: ตัวเลือกต้องเป็น array`);
    }

    if (question.options.length < 2 || question.options.length > 6) {
        throw new Error(`คำถามที่ ${index + 1}: ต้องมีตัวเลือก 2-6 ตัว`);
    }

    // Validate each option
    question.options.forEach((option, optionIndex) => {
        if (!option || typeof option !== 'string') {
            throw new Error(`คำถามที่ ${index + 1}: ตัวเลือกที่ ${optionIndex + 1} ไม่ถูกต้อง`);
        }

        if (option.length > 200) {
            throw new Error(`คำถามที่ ${index + 1}: ตัวเลือกที่ ${optionIndex + 1} ยาวเกินไป (สูงสุด 200 ตัวอักษร)`);
        }
    });

    if (!question.correct_answer || typeof question.correct_answer !== 'string') {
        throw new Error(`คำถามที่ ${index + 1}: ต้องระบุคำตอบที่ถูกต้อง`);
    }

    // Check if correct answer exists in options
    if (!question.options.includes(question.correct_answer)) {
        throw new Error(`คำถามที่ ${index + 1}: คำตอบที่ถูกต้องต้องอยู่ในตัวเลือก`);
    }

    if (question.explanation && typeof question.explanation !== 'string') {
        throw new Error(`คำถามที่ ${index + 1}: คำอธิบายต้องเป็น string`);
    }

    if (question.explanation && question.explanation.length > 500) {
        throw new Error(`คำถามที่ ${index + 1}: คำอธิบายยาวเกินไป (สูงสุด 500 ตัวอักษร)`);
    }

    if (question.points !== undefined) {
        const points = parseInt(question.points);
        if (isNaN(points) || points < 1 || points > 10) {
            throw new Error(`คำถามที่ ${index + 1}: คะแนนต้องอยู่ระหว่าง 1-10`);
        }
    }
}

// Export validation rules object for easy import
export const quizValidationRules = {
    generation: validateQuizGeneration,
    creation: validateQuizCreation,
    update: validateQuizUpdate,
    id: validateQuizId,
    search: validateQuizSearch,
    rename: validateQuizRename,
    move: validateQuizMove,
    questionsUpdate: validateQuizQuestionsUpdate,
    bulkOperations: validateBulkOperations,
    fileUpload: validateFileUpload,
    additionalQuestions: validateAdditionalQuestions,
    handleErrors: handleValidationErrors
};