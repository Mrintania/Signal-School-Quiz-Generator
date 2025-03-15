import express from 'express';
import QuizController from '../controllers/quizController.js';
import ExportController from '../controllers/exportController.js';

const router = express.Router();

// API Route for generating a quiz
router.post('/generate', QuizController.generateQuiz);

// API Route for saving a generated quiz
router.post('/save', QuizController.saveQuiz);

// API Route for getting all quizzes
router.get('/', QuizController.getAllQuizzes);

// API Route for getting a quiz by ID
router.get('/:id', QuizController.getQuizById);

// API Route for deleting a quiz
router.delete('/:id', QuizController.deleteQuiz);

// API Route for renaming a quiz
router.patch('/:id/rename', QuizController.renameQuiz);

// API Route for exporting a quiz in GIFT format for Moodle
router.get('/:id/export/moodle', ExportController.exportQuizToGift);

// API Route for exporting a quiz in plain text format
router.get('/:id/export/text', ExportController.exportQuizToPlainText);

// เพิ่ม Route ใหม่สำหรับตรวจสอบชื่อข้อสอบซ้ำ
router.get('/check-title', QuizController.checkTitleAvailability);

export default router;