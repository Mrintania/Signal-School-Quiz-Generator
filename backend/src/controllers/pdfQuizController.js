// controllers/pdfQuizController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const fs = require('fs');

// Configure multer for PDF uploads
const upload = multer({
  dest: 'uploads/pdfs/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

class PDFQuizController {
  static async generateQuizFromPDF(req, res) {
    try {
      const { quizSettings } = req.body;
      const pdfFile = req.file;
      
      if (!pdfFile) {
        return res.status(400).json({ error: 'PDF file required' });
      }

      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // Convert PDF to base64
      const pdfBuffer = fs.readFileSync(pdfFile.path);
      const pdfBase64 = pdfBuffer.toString('base64');

      // Prepare prompt for quiz generation
      const prompt = `
        Analyze this PDF document and create ${quizSettings.questionCount || 10} quiz questions.
        
        Requirements:
        - Language: ${quizSettings.language || 'Thai'}
        - Difficulty: ${quizSettings.difficulty || 'Medium'}
        - Question Type: ${quizSettings.questionType || 'Multiple Choice'}
        - Subject Area: ${quizSettings.subject || 'General'}
        
        Extract key concepts, facts, and information from the document to create relevant questions.
        Format the output as JSON with this structure:
        {
          "title": "Quiz title based on document content",
          "questions": [
            {
              "question": "Question text",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": 0,
              "explanation": "Why this answer is correct"
            }
          ]
        }
      `;

      // Send to Gemini with PDF
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: pdfBase64,
            mimeType: 'application/pdf'
          }
        }
      ]);

      const response = await result.response;
      const quizData = JSON.parse(response.text());

      // Clean up uploaded file
      fs.unlinkSync(pdfFile.path);

      // Save quiz to database
      const savedQuiz = await this.saveQuizToDatabase(quizData, req.user.id);

      res.json({
        success: true,
        quiz: savedQuiz,
        message: 'Quiz generated successfully from PDF'
      });

    } catch (error) {
      console.error('PDF Quiz Generation Error:', error);
      res.status(500).json({ 
        error: 'Failed to generate quiz from PDF',
        details: error.message 
      });
    }
  }

  static async saveQuizToDatabase(quizData, userId) {
    // Implementation for saving to MySQL database
    // Similar to existing quiz saving logic
  }
}

module.exports = { PDFQuizController, upload };