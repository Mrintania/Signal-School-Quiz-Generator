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
};

export default api;