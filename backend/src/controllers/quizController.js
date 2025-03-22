import { GoogleGenerativeAI } from '@google/generative-ai';
import Quiz from '../models/quiz.js';

// ตั้งค่า Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);

class QuizController {
  // สร้างข้อสอบใหม่ด้วย Google Gemini API
  static async generateQuiz(req, res) {
    try {
      const { topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language } = req.body;

      if (!topic || !questionType || !numberOfQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      // สร้าง prompt สำหรับ Google Gemini API
      const prompt = QuizController.createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language);

      // เลือกโมเดล และตั้งค่าพารามิเตอร
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // ใช้โมเดลตามที่คุณระบุ gemini-2.0-flash-thinking-exp-01-21, gemini-2.0-pro-exp-02-05
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 8192,
        },
      });

      // เรียกใช้ Google Gemini API
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      let quizData;

      try {
        // ตรวจสอบว่าคำตอบมีรูปแบบ JSON หรือไม่
        if (responseText.includes('```json') && responseText.includes('```')) {
          const jsonString = responseText.split('```json')[1].split('```')[0].trim();
          quizData = JSON.parse(jsonString);
        } else if (responseText.includes('```') && responseText.includes('```')) {
          // กรณีที่ response มี code block แต่ไม่ได้ระบุภาษา
          const jsonString = responseText.split('```')[1].split('```')[0].trim();
          quizData = JSON.parse(jsonString);
        } else {
          // พยายามแปลงข้อความทั้งหมดเป็น JSON
          quizData = JSON.parse(responseText);
        }
      } catch (error) {
        console.error('Error parsing Gemini response:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to parse quiz data from AI response',
          rawResponse: responseText
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          topic,
          questionType,
          studentLevel,
          language, // ส่งค่าภาษากลับไปด้วย
          questions: quizData.questions
        }
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // บันทึกข้อสอบลงในฐานข้อมูล
  static async saveQuiz(req, res) {
    try {
      const quizData = req.body;

      if (!quizData.title || !quizData.questions || quizData.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      const result = await Quiz.saveQuiz(quizData);

      if (result.success) {
        return res.status(201).json({
          success: true,
          message: 'Quiz saved successfully',
          quizId: result.quizId
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to save quiz',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ดึงข้อมูลข้อสอบทั้งหมด
  static async getAllQuizzes(req, res) {
    try {
      const quizzes = await Quiz.getAllQuizzes();
      return res.status(200).json({
        success: true,
        data: quizzes
      });
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ดึงข้อมูลข้อสอบตาม ID
  static async getQuizById(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      const quiz = await Quiz.getQuizById(id);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Error fetching quiz by ID:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ลบข้อสอบ
  static async deleteQuiz(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      const result = await Quiz.deleteQuiz(id);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Quiz deleted successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete quiz',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // สร้าง prompt สำหรับ Google Gemini API
  static createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language) {
    // กำหนดภาษาที่ใช้ในการสร้างข้อสอบ
    const languagePrompt = language === 'thai'
      ? "Create the quiz in Thai language."
      : "Create the quiz in English language.";

    let prompt = `Create a ${questionType} quiz about "${topic}" with ${numberOfQuestions} questions. ${languagePrompt}`;

    if (studentLevel) {
      prompt += ` The quiz is intended for ${studentLevel} level students.`;
    }

    // ถ้ามีคำแนะนำเพิ่มเติม ตรวจสอบว่ามีการขอให้สร้างข้อสอบที่ไม่ซ้ำหรือไม่
    if (additionalInstructions) {
      prompt += ` Additional instructions: ${additionalInstructions}`;

      // ถ้าขอให้สร้างข้อสอบไม่ซ้ำ ให้เน้นในคำแนะนำของ prompt
      if (additionalInstructions.includes("avoid duplication") ||
        additionalInstructions.includes("different questions")) {
        prompt += ` IMPORTANT: Please make sure to generate completely new and different questions that do not duplicate any previous questions on this topic.`;
      }
    }

    if (questionType === 'Multiple Choice') {
      prompt += ` For each question, provide 4 options (A, B, C, D), indicate the correct answer, and include a brief explanation of why the answer is correct.`;
      prompt += ` Return the quiz in the following JSON format ONLY (do not include any other text or explanations outside the JSON):
      {
        "questions": [
          {
            "questionText": "Question text here",
            "options": [
              { "text": "Option A", "isCorrect": false },
              { "text": "Option B", "isCorrect": true },
              { "text": "Option C", "isCorrect": false },
              { "text": "Option D", "isCorrect": false }
            ],
            "explanation": "Explanation of the correct answer"
          }
        ]
      }`;
    } else if (questionType === 'Essay') {
      prompt += ` For each question, provide a brief guideline on what a good answer should include.`;
      prompt += ` Return the quiz in the following JSON format ONLY (do not include any other text or explanations outside the JSON):
      {
        "questions": [
          {
            "questionText": "Question text here",
            "explanation": "Guidelines for a good answer"
          }
        ]
      }`;
    }

    return prompt;
  }
  // เปลี่ยนชื่อข้อสอบ
  static async renameQuiz(req, res) {
    try {
      const { id } = req.params;
      const { title } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'New title is required'
        });
      }

      const result = await Quiz.renameQuiz(id, title);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Quiz renamed successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to rename quiz',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error renaming quiz:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update quiz questions
  static async updateQuizQuestions(req, res) {
    try {
      const { id } = req.params;
      const { questions } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Questions array is required'
        });
      }

      // Call the model method to update the questions
      const result = await Quiz.updateQuizQuestions(id, questions);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Quiz questions updated successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to update quiz questions',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error updating quiz questions:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  // เพิ่มฟังก์ชันสำหรับย้ายข้อสอบไปยังโฟลเดอร์
  static async moveQuiz(req, res) {
    try {
      const { id } = req.params;
      const { folderId } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      if (!folderId) {
        return res.status(400).json({
          success: false,
          message: 'Folder ID is required'
        });
      }

      const result = await Quiz.moveQuiz(id, folderId);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Quiz moved successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to move quiz',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error moving quiz:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default QuizController;