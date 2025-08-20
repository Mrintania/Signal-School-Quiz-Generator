// frontend/src/services/api.js
import axios from 'axios';

// Base API URL from environment variable or default to localhost
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create main axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
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

// Add response interceptor for global error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle session expiration or invalid token
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (error.response.data?.message?.includes('token') || error.response.data?.message?.includes('expired')) {
        localStorage.removeItem('token');
        window.location.href = '/login?session=expired';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} API response
   */
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  },

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} API response
   */
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Login failed' };
    }
  },

  /**
   * Logout user
   * @returns {Promise} API response
   */
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      localStorage.removeItem('token');
      return response.data;
    } catch (error) {
      localStorage.removeItem('token');
      throw error.response?.data || { success: false, message: 'Logout failed' };
    }
  },

  /**
   * Verify email
   * @param {string} token - Verification token
   * @returns {Promise} API response
   */
  verifyEmail: async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Email verification failed' };
    }
  },

  /**
   * Forgot password
   * @param {string} email - User email
   * @returns {Promise} API response
   */
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Password reset request failed' };
    }
  },

  /**
   * Reset password
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @returns {Promise} API response
   */
  resetPassword: async (token, password) => {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Password reset failed' };
    }
  },

  /**
   * Check auth status
   * @returns {Promise} API response
   */
  checkStatus: async () => {
    try {
      const response = await api.get('/auth/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Status check failed' };
    }
  }
};

// Quiz Service
export const quizService = {
  /**
   * Generate a quiz based on given parameters
   * @param {Object} data - Quiz generation parameters
   * @returns {Promise} API response
   */
  generateQuiz: async (quizData) => {
    try {
      console.log('API Service - Sending data:', quizData);

      const response = await api.post('/quizzes/generate', {
        topic: quizData.topic,
        questionType: quizData.questionType,
        numberOfQuestions: parseInt(quizData.numberOfQuestions),
        additionalInstructions: quizData.additionalInstructions || '',
        studentLevel: quizData.studentLevel || '',
        outputLanguage: quizData.outputLanguage  // ✅ ส่ง outputLanguage
      });

      console.log('API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
 * Generate quiz from uploaded file
 * @param {FormData} formData - File and settings
 * @param {Object} options - Upload options
 * @returns {Promise} API response
 */
  generateQuizFromFile: async (formData, options = {}) => {
    try {
      console.log('=== API SERVICE DEBUG ===');
      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      console.log('========================');

      const response = await api.post('/quizzes/generate-from-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: options.onUploadProgress,
        timeout: 120000, // 2 minutes timeout for file processing
      });

      console.log('API Response:', response.data);

      // ✅ ปรับปรุงการจัดการ response
      if (response.data.success) {
        return {
          success: true,
          data: response.data.quiz || response.data.data,
          message: response.data.message || 'สร้างข้อสอบจากไฟล์สำเร็จ'
        };
      } else {
        throw new Error(response.data.message || 'ไม่สามารถสร้างข้อสอบจากไฟล์ได้');
      }

    } catch (error) {
      console.error('File quiz generation error:', error);

      // ✅ ปรับปรุง error handling
      if (error.code === 'ECONNABORTED') {
        throw new Error('การประมวลผลไฟล์ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
      }

      if (error.response?.status === 413) {
        throw new Error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB)');
      }

      if (error.response?.status === 415) {
        throw new Error('รูปแบบไฟล์ไม่ถูกต้อง รองรับเฉพาะ PDF, DOCX และ TXT');
      }

      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'ข้อมูลไฟล์ไม่ถูกต้อง');
      }

      if (error.response?.status === 503) {
        throw new Error('บริการ AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง');
      }

      // Default error
      const errorMessage = error.response?.data?.message ||
        error.message ||
        'ไม่สามารถสร้างข้อสอบจากไฟล์ได้';

      throw new Error(errorMessage);
    }
  },

  /**
   * Save a quiz to the database
   * @param {Object} data - Quiz data
   * @returns {Promise} API response
   */
  saveQuiz: async (data) => {
    try {
      const response = await api.post('/quizzes/save', data);
      return response.data;
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to save quiz' };
    }
  },

  /**
   * Get all quizzes with optional pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} API response
   */
  getAllQuizzes: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/quizzes?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch quizzes' };
    }
  },

  /**
   * Get a specific quiz by ID
   * @param {number} id - Quiz ID
   * @returns {Promise} API response
   */
  getQuizById: async (id) => {
    try {
      const response = await api.get(`/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch quiz' };
    }
  },

  /**
   * Update a quiz
   * @param {number} id - Quiz ID
   * @param {Object} data - Updated quiz data
   * @returns {Promise} API response
   */
  updateQuiz: async (id, data) => {
    try {
      const response = await api.put(`/quizzes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to update quiz' };
    }
  },

  /**
   * Delete a quiz
   * @param {number} id - Quiz ID
   * @returns {Promise} API response
   */
  deleteQuiz: async (id) => {
    try {
      const response = await api.delete(`/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to delete quiz' };
    }
  },

  /**
   * Export quiz in different formats
   * @param {number} id - Quiz ID
   * @param {string} format - Export format (gift, txt, json, csv)
   * @returns {Promise} API response
   */
  exportQuiz: async (id, format) => {
    try {
      const response = await api.get(`/quizzes/${id}/export/${format}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to export quiz' };
    }
  },

  /**
   * Share a quiz
   * @param {number} id - Quiz ID
   * @param {Object} shareData - Share data (emails, permissions)
   * @returns {Promise} API response
   */
  shareQuiz: async (id, shareData) => {
    try {
      const response = await api.post(`/quizzes/${id}/share`, shareData);
      return response.data;
    } catch (error) {
      console.error('Error sharing quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to share quiz' };
    }
  },

  /**
   * Get quiz statistics
   * @param {number} id - Quiz ID
   * @returns {Promise} API response
   */
  getQuizStats: async (id) => {
    try {
      const response = await api.get(`/quizzes/${id}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz stats:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch quiz statistics' };
    }
  }
};

// User Service
export const userService = {
  /**
   * Get current user profile
   * @returns {Promise} API response
   */
  getCurrentUser: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch user profile' };
    }
  },

  /**
   * Update user profile
   * @param {Object} profileData - User profile data to update
   * @returns {Promise} API response
   */
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update profile' };
    }
  },

  /**
   * Update user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} API response
   */
  updatePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/users/password', { currentPassword, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update password' };
    }
  },

  /**
   * Upload profile image
   * @param {File} imageFile - Image file to upload
   * @returns {Promise} API response
   */
  uploadProfileImage: async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('profileImage', imageFile);

      const response = await api.post('/users/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to upload profile image' };
    }
  },

  /**
   * Update user settings
   * @param {Object} settingsData - Settings data
   * @returns {Promise} API response
   */
  updateSettings: async (settingsData) => {
    try {
      const response = await api.put('/users/settings', settingsData);
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error.response?.data || { success: false, message: 'Failed to update settings' };
    }
  },

  /**
   * Get user activity history
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} API response
   */
  getUserActivity: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/users/activity?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch user activity' };
    }
  },

  /**
   * Close user account
   * @param {string} password - User password for confirmation
   * @returns {Promise} API response
   */
  closeAccount: async (password) => {
    try {
      const response = await api.post('/users/close-account', { password });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to close account' };
    }
  }
};

// Dashboard Service
export const dashboardService = {
  /**
   * Get dashboard statistics
   * @returns {Promise} API response
   */
  getStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch dashboard statistics' };
    }
  },

  /**
   * Get recent activities
   * @returns {Promise} API response
   */
  getRecentActivities: async () => {
    try {
      const response = await api.get('/dashboard/activities');
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch recent activities' };
    }
  },

  /**
   * Get system status (admin only)
   * @returns {Promise} API response
   */
  getSystemStatus: async () => {
    try {
      const response = await api.get('/dashboard/system-status');
      return response.data;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch system status' };
    }
  }
};

// School Service
export const schoolService = {
  /**
   * Create a new school
   * @param {Object} schoolData - School data
   * @returns {Promise} API response
   */
  createSchool: async (schoolData) => {
    try {
      const response = await api.post('/schools', schoolData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create school' };
    }
  },

  /**
   * Get school details
   * @param {number} schoolId - School ID
   * @returns {Promise} API response
   */
  getSchool: async (schoolId) => {
    try {
      const response = await api.get(`/schools/${schoolId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch school details' };
    }
  },

  /**
   * Update school details
   * @param {number} schoolId - School ID
   * @param {Object} schoolData - School data to update
   * @returns {Promise} API response
   */
  updateSchool: async (schoolId, schoolData) => {
    try {
      const response = await api.put(`/schools/${schoolId}`, schoolData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update school' };
    }
  },

  /**
   * Delete school
   * @param {number} schoolId - School ID
   * @returns {Promise} API response
   */
  deleteSchool: async (schoolId) => {
    try {
      const response = await api.delete(`/schools/${schoolId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete school' };
    }
  },

  /**
   * Get school departments
   * @param {number} schoolId - School ID
   * @returns {Promise} API response
   */
  getSchoolDepartments: async (schoolId) => {
    try {
      const response = await api.get(`/schools/${schoolId}/departments`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch school departments' };
    }
  }
};

// Admin Service
export const adminService = {
  /**
   * Get all users (admin only)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} API response
   */
  getAllUsers: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/admin/users?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch users' };
    }
  },

  /**
   * Create new user (admin only)
   * @param {Object} userData - User data
   * @returns {Promise} API response
   */
  createUser: async (userData) => {
    try {
      const response = await api.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create user' };
    }
  },

  /**
   * Update user (admin only)
   * @param {number} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise} API response
   */
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update user' };
    }
  },

  /**
   * Delete user (admin only)
   * @param {number} userId - User ID
   * @returns {Promise} API response
   */
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete user' };
    }
  },

  /**
   * Get system analytics (admin only)
   * @returns {Promise} API response
   */
  getSystemAnalytics: async () => {
    try {
      const response = await api.get('/admin/analytics');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch system analytics' };
    }
  },

  /**
   * Get audit logs (admin only)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} API response
   */
  getAuditLogs: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`/admin/audit-logs?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch audit logs' };
    }
  }
};

// Export the main API instance for custom requests
export { api };

// Export default object with all services
export default {
  api,
  quiz: quizService,
  auth: authService,
  user: userService,
  dashboard: dashboardService,
  school: schoolService,
  admin: adminService
};