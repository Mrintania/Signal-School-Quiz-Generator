import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Quiz API Services
export const quizService = {
  // Generate a new quiz using OpenAI
  generateQuiz: async (quizData) => {
    try {
      const response = await api.post('/quizzes/generate', quizData);
      return response.data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  },

  // Save a generated quiz
  saveQuiz: async (quizData) => {
    try {
      const response = await api.post('/quizzes/save', quizData);
      return response.data;
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  },

  // Get all quizzes
  getAllQuizzes: async () => {
    try {
      const response = await api.get('/quizzes');
      return response.data;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  // Get a quiz by ID
  getQuizById: async (quizId) => {
    try {
      const response = await api.get(`/quizzes/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error;
    }
  },

  // Delete a quiz
  deleteQuiz: async (quizId) => {
    try {
      const response = await api.delete(`/quizzes/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  // Rename a quiz
  renameQuiz: async (quizId, newTitle) => {
    try {
      const response = await api.patch(`/quizzes/${quizId}/rename`, { title: newTitle });
      return response.data;
    } catch (error) {
      console.error('Error renaming quiz:', error);
      throw error;
    }
  },

  // Export quiz to Moodle GIFT format
  exportQuizToMoodle: (quizId) => {
    // สร้าง URL สำหรับดาวน์โหลดไฟล์
    const downloadUrl = `${API_URL}/quizzes/${quizId}/export/moodle`;

    // เปิด URL ในแท็บใหม่หรือเริ่มการดาวน์โหลด
    window.open(downloadUrl, '_blank');
  },

  // Export quiz to plain text format
  exportQuizToText: (quizId) => {
    // สร้าง URL สำหรับดาวน์โหลดไฟล์
    const downloadUrl = `${API_URL}/quizzes/${quizId}/export/text`;

    // เปิด URL ในแท็บใหม่หรือเริ่มการดาวน์โหลด
    window.open(downloadUrl, '_blank');
  },
  // Add this to frontend/src/services/api.js
  updateQuizQuestions: async (quizId, questions) => {
    try {
      // Here we're updating the quiz with new questions
      // Note: This endpoint might need to be implemented on the backend if it doesn't exist
      const response = await api.patch(`/quizzes/${quizId}/questions`, { questions });
      return response.data;
    } catch (error) {
      console.error('Error updating quiz questions:', error);
      throw error;
    }
  },
  
  /**
   * A utility function to check title availability before saving
   * It should be added to the quizService object
   */
  checkTitleAvailability: async (title) => {
    try {
      // Optional: Add a backend endpoint to check for duplicate titles
      // For now, let's assume it always returns success
      return {
        success: true,
        data: {
          isDuplicate: false,
          suggestedTitle: title
        }
      };
    } catch (error) {
      console.error('Error checking title availability:', error);
      throw error;
    }
  },
};



export default api;