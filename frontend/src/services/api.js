// frontend/src/services/api.js
import axios from 'axios';
import adminService from './adminService';

// Base API URL from environment variable or default to localhost
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
});



// Add a request interceptor to add the auth token to all requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Quiz Service
const quizService = {
  // Generate a quiz based on given parameters
  generateQuiz: async (data) => {
    try {
      const response = await api.post('/quizzes/generate', data);
      return response.data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  },

  // Generate a quiz based on an uploaded document file
  generateQuizFromFile: async (formData, onProgress) => {
    try {
      console.log('Starting file upload with form data');

      // Check if there's a file in FormData
      const file = formData.get('quizFile');
      if (!file) {
        console.error('No file in FormData object');
        throw new Error('No file found in form data');
      }

      console.log('File info:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Client-side file validation
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('File too large. Maximum file size is 10MB');
      }

      // Check file type
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!validTypes.includes(file.type)) {
        throw new Error('Unsupported file type. Only PDF, DOCX, and TXT files are supported.');
      }

      // Monitor upload progress
      const onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
        if (onProgress && typeof onProgress === 'function') {
          onProgress(percentCompleted);
        }
      };

      // Adjust timeout based on file size
      const timeout = Math.max(120000, file.size / 5); // At least 2 minutes, more for larger files

      // Make API request with proper retry handling
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Upload attempt ${attempts}/${maxAttempts}`);

          // Send API request
          const response = await api.post('/quizzes/generate-from-file', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress,
            timeout,
          });

          // Handle successful response
          console.log('File upload completed successfully, response:', response.data);
          return response.data;
        } catch (error) {
          lastError = error;
          console.error(`Upload attempt ${attempts} failed:`, error);

          // Check if it's worth retrying (rate limiting or temporary error)
          if (error.response && (error.response.status === 429 || error.response.status === 503)) {
            const waitTime = Math.pow(2, attempts) * 1000; // Exponential backoff
            console.warn(`Rate limit or service unavailable, waiting ${waitTime}ms before retry`);

            // Inform user about retry
            if (onProgress && typeof onProgress === 'function') {
              onProgress(-1, `Service busy, retrying in ${waitTime / 1000} seconds... (${attempts}/${maxAttempts})`);
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }

          // For other errors, break and throw
          break;
        }
      }

      // Error handling if all attempts failed
      console.error('Error in file upload after', maxAttempts, 'attempts:', lastError);

      // Determine appropriate error message
      if (lastError.response) {
        // Handle different HTTP error status codes
        switch (lastError.response.status) {
          case 400:
            throw new Error(lastError.response.data?.message || 'Invalid request. Please check your file.');
          case 413:
            throw new Error('File too large. Maximum file size is 10MB.');
          case 415:
            throw new Error('Unsupported file type. Only PDF, DOCX, and TXT files are supported.');
          case 429:
            throw new Error('Too many requests. Please try again later.');
          case 500:
            throw new Error('Server error processing your file. Please try again.');
          case 503:
            throw new Error('Service temporarily unavailable. Please try again later.');
          case 504:
            throw new Error('Request timed out. Please try with a smaller file.');
          default:
            throw new Error(lastError.response.data?.message || `Error: ${lastError.response.status}`);
        }
      } else if (lastError.request) {
        // No response received
        throw new Error('No response from server. Please check your connection and try again.');
      } else {
        // Something else happened
        throw new Error(lastError.message || 'An error occurred during file upload.');
      }
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  },

  // บันทึกข้อสอบที่สร้าง
  saveQuiz: async (quizData) => {
    try {
      // ตรวจสอบให้แน่ใจว่ามีข้อมูลที่จำเป็น
      if (!quizData.title || !quizData.questions || quizData.questions.length === 0) {
        throw new Error('Missing required quiz data');
      }

      console.log('Sending quiz data to API:', quizData);

      // เพิ่ม timeout และส่งข้อมูล
      const response = await api.post('/quizzes/save', quizData, {
        timeout: 10000, // เพิ่ม timeout เป็น 10 วินาที
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        }
      });

      console.log('API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving quiz:', error);
      if (error.response) {
        // ดึงข้อความข้อผิดพลาดจาก response
        console.error('API error response:', error.response.data);
        throw error.response.data;
      } else if (error.request) {
        // ไม่ได้รับการตอบกลับจาก server
        console.error('No response from server');
        throw new Error('Server did not respond. Please check your connection.');
      } else {
        // เกิดข้อผิดพลาดอื่นๆ
        throw error;
      }
    }
  },

  // Get all quizzes with optional pagination
  getAllQuizzes: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/quizzes?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  // Get a specific quiz by ID
  getQuizById: async (id) => {
    try {
      const response = await api.get(`/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error;
    }
  },

  // Delete a quiz
  deleteQuiz: async (id) => {
    try {
      const response = await api.delete(`/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  // Rename a quiz
  renameQuiz: async (id, title) => {
    try {
      const response = await api.patch(`/quizzes/${id}/rename`, { title });
      return response.data;
    } catch (error) {
      console.error('Error renaming quiz:', error);
      throw error;
    }
  },

  // Export a quiz to Moodle format
  exportToMoodle: async (id) => {
    try {
      const response = await api.get(`/quizzes/${id}/export/moodle`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting quiz to Moodle:', error);
      throw error;
    }
  },

  // Export a quiz to plain text format
  exportToText: async (id) => {
    try {
      const response = await api.get(`/quizzes/${id}/export/text`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting quiz to text:', error);
      throw error;
    }
  },

  // Update quiz questions
  updateQuizQuestions: async (id, questions) => {
    try {
      const response = await api.patch(`/quizzes/${id}/questions`, { questions });
      return response.data;
    } catch (error) {
      console.error('Error updating quiz questions:', error);
      throw error;
    }
  },

  // Move a quiz to a folder
  moveQuiz: async (id, folderId) => {
    try {
      const response = await api.patch(`/quizzes/${id}/move`, { folderId });
      return response.data;
    } catch (error) {
      console.error('Error moving quiz:', error);
      throw error;
    }
  },

  // Check if a title is available
  checkTitleAvailability: async (title) => {
    try {
      const response = await api.get(`/quizzes/check-title?title=${encodeURIComponent(title)}`);
      return response.data;
    } catch (error) {
      console.error('Error checking title availability:', error);
      throw error;
    }
  }
};

// Auth Service
const authService = {
  // User registration
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  },

  // User login
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Error in forgot password:', error);
      throw error;
    }
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  // Verify user email
  verifyEmail: async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      console.error('Error verifying email:', error);
      throw error;
    }
  },

  // Accept school invitation
  acceptInvitation: async (data) => {
    try {
      const response = await api.post('/auth/accept-invitation', data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  },

  // Login with Google
  googleLogin: async (idToken) => {
    try {
      const response = await api.post('/auth/google', { idToken });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error) {
      console.error('Error during Google login:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  checkAuthStatus: async () => {
    try {
      const response = await api.get('/auth/status');
      return response.data;
    } catch (error) {
      // Don't log this error as it's expected when not authenticated
      throw error;
    }
  }
};

// User Service
const userService = {
  // Get current user profile
  getCurrentUser: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  // Update user password
  updatePassword: async (passwordData) => {
    try {
      const response = await api.put('/users/password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  },

  // Upload profile image
  uploadProfileImage: async (formData) => {
    try {
      const response = await api.post('/users/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  },

  // Update user settings
  updateSettings: async (settingsData) => {
    try {
      const response = await api.put('/users/settings', settingsData);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  // Get user activity history
  getUserActivity: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/users/activity?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }
};

// Dashboard Service
const dashboardService = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get recent activities
  getRecentActivities: async () => {
    try {
      const response = await api.get('/dashboard/activities');
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },

  // Get system status (admin only)
  getSystemStatus: async () => {
    try {
      const response = await api.get('/dashboard/system-status');
      return response.data;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }
};

// Export services
export {
  quizService,
  authService,
  userService,
  dashboardService,
  adminService
};

export default {
  quizService,
  authService,
  userService,
  dashboardService,
  adminService
};