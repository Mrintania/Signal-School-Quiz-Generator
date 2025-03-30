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

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
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
    return response.data; // Return data directly
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
      
      // Handle authentication errors
      if (statusCode === 401) {
        // Clear token for authentication errors
        localStorage.removeItem('token');
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?session=expired';
        }
      }
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
    return await requestFn(); // Return response directly (already processed by interceptor)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error.message, 500);
  }
};

// Authentication API Services
export const authService = {
  register: async (userData) => {
    return handleApiRequest(() => api.post('/auth/register', userData));
  },
  
  login: async (email, password) => {
    return handleApiRequest(() => api.post('/auth/login', { email, password }));
  },
  
  checkAuthStatus: async () => {
    return handleApiRequest(() => api.get('/auth/status'));
  },
  
  forgotPassword: async (email) => {
    return handleApiRequest(() => api.post('/auth/forgot-password', { email }));
  },
  
  resetPassword: async (token, newPassword) => {
    return handleApiRequest(() => api.post('/auth/reset-password', { token, newPassword }));
  },
  
  verifyEmail: async (token) => {
    return handleApiRequest(() => api.post('/auth/verify-email', { token }));
  },
  
  resendVerification: async (email) => {
    return handleApiRequest(() => api.post('/auth/resend-verification', { email }));
  }
};

// User API Services
export const userService = {
  getProfile: async () => {
    return handleApiRequest(() => api.get('/users/profile'));
  },
  
  updateProfile: async (profileData) => {
    return handleApiRequest(() => api.put('/users/profile', profileData));
  },
  
  updatePassword: async (currentPassword, newPassword) => {
    return handleApiRequest(() => api.put('/users/password', { currentPassword, newPassword }));
  },
  
  updateSettings: async (settings) => {
    return handleApiRequest(() => api.put('/users/settings', settings));
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
  
  // Get recent quizzes and dashboard data
  getRecentQuizzes: async (limit = 10) => {
    return handleApiRequest(() => api.get('/dashboard/recent-quizzes', { params: { limit } }));
  },
  
  getDashboardStats: async () => {
    return handleApiRequest(() => api.get('/dashboard/stats'));
  }
};

// Generic API helper for general API calls
export const apiService = {
  get: async (endpoint, params) => {
    return handleApiRequest(() => api.get(endpoint, { params }));
  },
  
  post: async (endpoint, data) => {
    return handleApiRequest(() => api.post(endpoint, data));
  },
  
  put: async (endpoint, data) => {
    return handleApiRequest(() => api.put(endpoint, data));
  },
  
  patch: async (endpoint, data) => {
    return handleApiRequest(() => api.patch(endpoint, data));
  },
  
  delete: async (endpoint, data) => {
    return handleApiRequest(() => api.delete(endpoint, { data }));
  }
};

// Admin user verification API methods
export const adminService = {
  // Get users pending verification
  getPendingUsers: async () => {
      return handleApiRequest(() => api.get('/auth/pending-users'));
  },

  // Verify a user by ID
  verifyUser: async (userId) => {
      return handleApiRequest(() => api.post(`/auth/verify-user/${userId}`));
  },

  // Get all users (for admin panel)
  getAllUsers: async (params = {}) => {
      const { page = 1, limit = 10, search = '', status = '' } = params;
      const queryString = new URLSearchParams({ 
          page, 
          limit, 
          search, 
          status 
      }).toString();
      
      return handleApiRequest(() => api.get(`/users/admin/users?${queryString}`));
  },
};

export default {
  auth: authService,
  user: userService,
  quiz: quizService,
  api: apiService,
  admin: adminService
};