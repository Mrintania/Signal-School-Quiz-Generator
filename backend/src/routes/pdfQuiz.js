// routes/pdfQuiz.js
const express = require('express');
const { PDFQuizController, upload } = require('../controllers/pdfQuizController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.post('/generate-from-pdf', 
  authenticateToken, 
  upload.single('pdf'), 
  PDFQuizController.generateQuizFromPDF
);

router.get('/pdf-quiz-history', 
  authenticateToken, 
  PDFQuizController.getPDFQuizHistory
);

module.exports = router;