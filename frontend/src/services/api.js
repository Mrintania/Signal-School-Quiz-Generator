// frontend/src/services/api.js
import axios from 'axios';
import adminService from './adminService';

// Base API URL from environment variable or default to localhost
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
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

      // ตรวจสอบว่ามีไฟล์ใน FormData
      const file = formData.get('quizFile');
      if (!file) {
        console.error('No file in FormData object');
        throw new Error('ไม่พบไฟล์ในข้อมูลฟอร์ม');
      }

      console.log('File info:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // ตรวจสอบขนาดไฟล์ก่อนอัปโหลด (เพิ่มขั้นตอนนี้)
      if (file.size > 10 * 1024 * 1024) { // 10MB
        throw new Error('ไฟล์มีขนาดใหญ่เกินไป ขนาดไฟล์สูงสุดคือ 10MB');
      }

      // ฟังก์ชันสำหรับการติดตามความคืบหน้า
      const onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
        if (onProgress && typeof onProgress === 'function') {
          onProgress(percentCompleted);
        }
      };

      // เพิ่มเวลารอ timeout
      const timeout = Math.max(120000, file.size / 1024); // อย่างน้อย 2 นาที หรือมากกว่าสำหรับไฟล์ใหญ่

      // ลองส่งคำขอสูงสุด 3 ครั้ง หากเจอ rate limit
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      while (attempts < maxAttempts) {
        try {
          attempts++;

          // ส่งคำขอไปยัง API
          const response = await api.post('/quizzes/generate-from-file', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress,
            timeout,
          });

          if (response.status >= 200 && response.status < 300) {
            console.log('File upload completed, response:', response.data);
            return response.data;
          } else {
            throw new Error(`Server responded with status: ${response.status}`);
          }
        } catch (error) {
          lastError = error;

          // ตรวจสอบว่าเป็น rate limit error หรือไม่
          if (error.response && error.response.status === 429) {
            // เวลารอแบบ exponential backoff
            const waitTime = Math.pow(2, attempts) * 1000; // 2, 4, 8 วินาที
            console.warn(`Rate limit hit, waiting ${waitTime}ms before retry. Attempt ${attempts}/${maxAttempts}`);

            // แสดงข้อความให้ผู้ใช้ทราบว่ากำลังรอ
            if (onProgress && typeof onProgress === 'function') {
              onProgress(-1, `เกินโควต้าการใช้งาน AI รอสักครู่... (${attempts}/${maxAttempts})`);
            }

            // รอตามเวลาที่กำหนด
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // ลองใหม่อีกครั้ง
            continue;
          }

          // หากไม่ใช่ rate limit error ให้โยนข้อผิดพลาดออกไปเลย
          break;
        }
      }

      // ไม่สามารถส่งคำขอได้สำเร็จหลังจากลองหลายครั้ง
      console.error('Error in file upload after', maxAttempts, 'attempts:', lastError);

      // จัดการข้อผิดพลาดตามประเภท
      if (lastError.response) {
        if (lastError.response.status === 429) {
          throw new Error('เกินโควต้าการใช้งาน AI กรุณาลองใหม่ในภายหลัง (อาจต้องรอ 1-2 นาที)');
        } else if (lastError.response.status === 413) {
          throw new Error('ไฟล์มีขนาดใหญ่เกินไป ขนาดไฟล์สูงสุดคือ 10MB');
        } else if (lastError.response.status === 415) {
          throw new Error('รูปแบบไฟล์ไม่รองรับ กรุณาอัปโหลดไฟล์ PDF, DOCX หรือ TXT');
        } else {
          const serverMessage = lastError.response.data?.message;
          throw new Error(serverMessage || `เกิดข้อผิดพลาด: รหัส ${lastError.response.status}`);
        }
      } else if (lastError.code === 'ECONNABORTED') {
        throw new Error('การอัปโหลดหมดเวลา โปรดลองใช้ไฟล์ที่มีขนาดเล็กลง');
      } else if (lastError.request) {
        throw new Error('ไม่ได้รับการตอบกลับจากเซิร์ฟเวอร์ โปรดตรวจสอบการเชื่อมต่อและลองอีกครั้ง');
      } else {
        throw lastError;
      }
    } catch (error) {
      console.error('Error in file upload:', error);
      throw error;
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