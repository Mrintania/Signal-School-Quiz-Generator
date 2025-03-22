import { GoogleGenerativeAI } from '@google/generative-ai';
import Quiz from '../models/quiz.js';

// Initialize Google Gemini API with error handling
let genAI;
try {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
} catch (error) {
  console.error('Error initializing Google Gemini API:', error);
}

// Helper function to handle API errors
const handleApiError = (res, error, message = 'An error occurred') => {
  console.error(`API Error: ${message}`, error);
  return res.status(500).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

class QuizController {
  // Generate a new quiz using Google Gemini API
  static async generateQuiz(req, res) {
    try {
      const { topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language } = req.body;

      // Validate required fields (additional protection beyond middleware)
      if (!topic || !questionType || !numberOfQuestions) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      // Check if Google Gemini API is initialized
      if (!genAI) {
        return res.status(500).json({
          success: false,
          message: 'AI service is currently unavailable'
        });
      }

      // Create prompt for Google Gemini API
      const prompt = QuizController.createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language);

      // Select model and set parameters
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // Use specified model
        generationConfig: {
          temperature: 1,
          maxOutputTokens: 8192,
        },
      });

      // Request generation with timeout handling
      const generationPromise = model.generateContent(prompt);
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI generation timed out')), 30000); // 30 seconds timeout
      });
      
      const result = await Promise.race([generationPromise, timeoutPromise]);
      const responseText = result.response.text();
      
      let quizData;
      try {
        // Parse response considering different formats
        if (responseText.includes('```json') && responseText.includes('```')) {
          const jsonString = responseText.split('```json')[1].split('```')[0].trim();
          quizData = JSON.parse(jsonString);
        } else if (responseText.includes('```') && responseText.includes('```')) {
          // For code blocks without language specification
          const jsonString = responseText.split('```')[1].split('```')[0].trim();
          quizData = JSON.parse(jsonString);
        } else {
          // Try parsing the entire response as JSON
          quizData = JSON.parse(responseText);
        }
      } catch (error) {
        console.error('Error parsing Gemini response:', error);
        
        // Return more detailed error information for debugging
        return res.status(500).json({
          success: false,
          message: 'Failed to parse quiz data from AI response',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined,
          rawResponse: process.env.NODE_ENV === 'development' ? responseText.substring(0, 500) + '...' : undefined
        });
      }

      // Validate the response data structure
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        return res.status(500).json({
          success: false,
          message: 'Invalid quiz data structure from AI response',
          details: 'The questions array is missing or invalid'
        });
      }

      // Return successful response
      return res.status(200).json({
        success: true,
        data: {
          topic,
          questionType,
          studentLevel,
          language,
          questions: quizData.questions
        }
      });
    } catch (error) {
      return handleApiError(res, error, 'Error generating quiz');
    }
  }

  // Save a quiz to the database
  static async saveQuiz(req, res) {
    try {
      const quizData = req.body;

      // Validate required fields
      if (!quizData.title || !quizData.questions || quizData.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Required fields are missing'
        });
      }

      // Check for duplicate title and get suggested title if needed
      const titleCheck = await Quiz.checkDuplicateTitle(quizData.title);
      const finalTitle = titleCheck.isDuplicate ? titleCheck.suggestedTitle : quizData.title;

      // Update title if a duplicate was found
      if (titleCheck.isDuplicate) {
        quizData.title = finalTitle;
      }

      // Save quiz to database
      const result = await Quiz.saveQuiz(quizData);

      if (result.success) {
        return res.status(201).json({
          success: true,
          message: 'Quiz saved successfully',
          quizId: result.quizId,
          title: finalTitle,
          isDuplicateTitle: titleCheck.isDuplicate
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to save quiz',
          error: result.error
        });
      }
    } catch (error) {
      return handleApiError(res, error, 'Error saving quiz');
    }
  }

  // Get all quizzes
  static async getAllQuizzes(req, res) {
    try {
      // Implement pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      
      // Get quizzes with pagination
      const result = await Quiz.getAllQuizzes(limit, offset);
      
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
      return handleApiError(res, error, 'Error fetching quizzes');
    }
  }

  // Get a quiz by ID
  static async getQuizById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Get quiz from database
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
      return handleApiError(res, error, 'Error fetching quiz by ID');
    }
  }

  // Delete a quiz
  static async deleteQuiz(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID is required'
        });
      }

      // Delete quiz from database
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
      return handleApiError(res, error, 'Error deleting quiz');
    }
  }

  // Create prompt for Google Gemini API
  static createPrompt(topic, questionType, numberOfQuestions, additionalInstructions, studentLevel, language) {
    // Set language for quiz
    const languagePrompt = language === 'thai'
      ? "Create the quiz in Thai language."
      : "Create the quiz in English language.";

    let prompt = `Create a ${questionType} quiz about "${topic}" with ${numberOfQuestions} questions. ${languagePrompt}`;

    if (studentLevel) {
      prompt += ` The quiz is intended for ${studentLevel} level students.`;
    }

    // Add any additional instructions
    if (additionalInstructions) {
      prompt += ` Additional instructions: ${additionalInstructions}`;

      // Emphasize avoiding duplication if requested
      if (additionalInstructions.includes("avoid duplication") ||
        additionalInstructions.includes("different questions")) {
        prompt += ` IMPORTANT: Please make sure to generate completely new and different questions that do not duplicate any previous questions on this topic.`;
      }
    }

    // Add format instructions based on question type
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

  // Rename a quiz
  static async renameQuiz(req, res) {
    try {
      const { id } = req.params;
      const { title } = req.body;

      // Validate inputs
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

      // Check for duplicate title
      const titleCheck = await Quiz.checkDuplicateTitle(title);
      const finalTitle = titleCheck.isDuplicate ? titleCheck.suggestedTitle : title;

      // Rename quiz in database
      const result = await Quiz.renameQuiz(id, finalTitle);

      if (result.success) {
        return res.status(200).json({
          success: true,
          message: 'Quiz renamed successfully',
          title: finalTitle,
          isDuplicateTitle: titleCheck.isDuplicate
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Failed to rename quiz',
          error: result.error
        });
      }
    } catch (error) {
      return handleApiError(res, error, 'Error renaming quiz');
    }
  }

  // Update quiz questions
  static async updateQuizQuestions(req, res) {
    try {
      const { id } = req.params;
      const { questions } = req.body;

      // Validate inputs
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

      // Update questions in database
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
      return handleApiError(res, error, 'Error updating quiz questions');
    }
  }

  // Move quiz to a folder
  static async moveQuiz(req, res) {
    try {
      const { id } = req.params;
      const { folderId } = req.body;

      // Validate inputs
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

      // Move quiz in database
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
      return handleApiError(res, error, 'Error moving quiz');
    }
  }

  // Check if a quiz title is already in use
  static async checkTitleAvailability(req, res) {
    try {
      const { title } = req.query;
      
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }
      
      const result = await Quiz.checkDuplicateTitle(title);
      
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      return handleApiError(res, error, 'Error checking title availability');
    }
  }
}

export default QuizController;