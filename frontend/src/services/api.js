import axios from 'axios';

// Use environment variable instead of hardcoded URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create custom error class
class ApiError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Request: ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    let message = 'Something went wrong';
    let statusCode = 500;
    let data = null;

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      message = error.response.data.message || 'Server error';
      statusCode = error.response.status;
      data = error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      message = 'No response from server. Please check your connection.';
      statusCode = 0;
    } else {
      // Something happened in setting up the request that triggered an Error
      message = error.message;
    }

    // Log the error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`API Error: ${message}`, error);
    }

    return Promise.reject(new ApiError(message, statusCode, data));
  }
);

// Helper function to handle API requests
const handleApiRequest = async (requestFn) => {
  try {
    const response = await requestFn();
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message, 500);
  }
};

// Quiz API Services
export const quizService = {
  // Generate a new quiz using AI
  generateQuiz: async (quizData) => {
    return handleApiRequest(() => api.post('/quizzes/generate', quizData));
  },

  // Save a generated quiz
  saveQuiz: async (quizData) => {
    return handleApiRequest(() => api.post('/quizzes/save', quizData));
  },

  // Get all quizzes
  getAllQuizzes: async () => {
    return handleApiRequest(() => api.get('/quizzes'));
  },

  // Get a quiz by ID
  getQuizById: async (quizId) => {
    return handleApiRequest(() => api.get(`/quizzes/${quizId}`));
  },

  // Delete a quiz
  deleteQuiz: async (quizId) => {
    return handleApiRequest(() => api.delete(`/quizzes/${quizId}`));
  },

  // Rename a quiz
  renameQuiz: async (quizId, newTitle) => {
    return handleApiRequest(() => api.patch(`/quizzes/${quizId}/rename`, { title: newTitle }));
  },

  // Export quiz to Moodle GIFT format
  exportQuizToMoodle: (quizId) => {
    const downloadUrl = `${API_URL}/quizzes/${quizId}/export/moodle`;
    window.open(downloadUrl, '_blank');
  },

  // Export quiz to plain text format
  exportQuizToText: (quizId) => {
    const downloadUrl = `${API_URL}/quizzes/${quizId}/export/text`;
    window.open(downloadUrl, '_blank');
  },
  
  // Update quiz questions
  updateQuizQuestions: async (quizId, questions) => {
    return handleApiRequest(() => api.patch(`/quizzes/${quizId}/questions`, { questions }));
  },
  
  // Check title availability
  checkTitleAvailability: async (title) => {
    return handleApiRequest(() => api.get('/quizzes/check-title', { params: { title } }));
  },
  
  // Move quiz to folder
  moveQuiz: async (quizId, folderId) => {
    // For now, using localStorage for compatibility with existing code
    try {
      const quizFolders = JSON.parse(localStorage.getItem('quizFolders') || '{}');
      quizFolders[quizId] = folderId;
      localStorage.setItem('quizFolders', JSON.stringify(quizFolders));
      window.dispatchEvent(new Event('storage'));
      
      // In a production environment, this would call the API instead
      // return handleApiRequest(() => api.patch(`/quizzes/${quizId}/move`, { folderId }));
      
      return { success: true, message: 'Quiz moved successfully' };
    } catch (error) {
      console.error('Error moving quiz:', error);
      throw new ApiError('Failed to move quiz', 500);
    }
  },
};

export default api;