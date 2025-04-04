// frontend/src/services/quizService.js
import { authApi } from './authApi';

/**
 * Quiz API Service - Handles all quiz-related API requests
 */
const quizService = {
  /**
   * Generate a quiz based on given parameters
   * @param {Object} data - Quiz generation parameters
   * @returns {Promise} API response
   */
  generateQuiz: async (data) => {
    try {
      const response = await authApi.post('/quizzes/generate', data);
      return response.data;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to generate quiz' };
    }
  },

  /**
   * Save a quiz to the database
   * @param {Object} data - Quiz data
   * @returns {Promise} API response
   */
  saveQuiz: async (data) => {
    try {
      const response = await authApi.post('/quizzes/save', data);
      return response.data;
    } catch (error) {
      console.error('Error saving quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to save quiz' };
    }
  },

  /**
   * Get all quizzes with optional pagination and filtering
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  getAllQuizzes: async (params = {}) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        folder = null,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;

      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(folder && { folder }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder }),
      }).toString();

      const response = await authApi.get(`/quizzes?${queryParams}`);
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
      const response = await authApi.get(`/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch quiz' };
    }
  },

  /**
   * Delete a quiz
   * @param {number} id - Quiz ID
   * @returns {Promise} API response
   */
  deleteQuiz: async (id) => {
    try {
      const response = await authApi.delete(`/quizzes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to delete quiz' };
    }
  },

  /**
   * Rename a quiz
   * @param {number} id - Quiz ID
   * @param {string} title - New title
   * @returns {Promise} API response
   */
  renameQuiz: async (id, title) => {
    try {
      const response = await authApi.patch(`/quizzes/${id}/rename`, { title });
      return response.data;
    } catch (error) {
      console.error('Error renaming quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to rename quiz' };
    }
  },

  /**
   * Update quiz questions
   * @param {number} id - Quiz ID
   * @param {Array} questions - Quiz questions
   * @returns {Promise} API response
   */
  updateQuizQuestions: async (id, questions) => {
    try {
      const response = await authApi.patch(`/quizzes/${id}/questions`, { questions });
      return response.data;
    } catch (error) {
      console.error('Error updating quiz questions:', error);
      throw error.response?.data || { success: false, message: 'Failed to update quiz questions' };
    }
  },

  /**
   * Move a quiz to a folder
   * @param {number} id - Quiz ID
   * @param {number|string} folderId - Folder ID (or 'root')
   * @returns {Promise} API response
   */
  moveQuiz: async (id, folderId) => {
    try {
      const response = await authApi.patch(`/quizzes/${id}/move`, { folderId });
      return response.data;
    } catch (error) {
      console.error('Error moving quiz:', error);
      throw error.response?.data || { success: false, message: 'Failed to move quiz' };
    }
  },

  /**
   * Check if a title is available
   * @param {string} title - Quiz title
   * @returns {Promise} API response
   */
  checkTitleAvailability: async (title) => {
    try {
      const response = await authApi.get(`/quizzes/check-title?title=${encodeURIComponent(title)}`);
      return response.data;
    } catch (error) {
      console.error('Error checking title availability:', error);
      throw error.response?.data || { success: false, message: 'Failed to check title availability' };
    }
  },

  /**
   * Export a quiz to Moodle format
   * @param {number} id - Quiz ID
   * @param {string} filename - Optional filename
   * @returns {Promise} API response
   */
  exportToMoodle: async (id, filename) => {
    try {
      const queryParams = filename ? `?filename=${encodeURIComponent(filename)}` : '';
      const response = await authApi.get(`/quizzes/${id}/export/moodle${queryParams}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting quiz to Moodle:', error);
      throw error;
    }
  },

  /**
   * Export a quiz to plain text format
   * @param {number} id - Quiz ID
   * @param {string} filename - Optional filename
   * @returns {Promise} API response
   */
  exportToText: async (id, filename) => {
    try {
      const queryParams = filename ? `?filename=${encodeURIComponent(filename)}` : '';
      const response = await authApi.get(`/quizzes/${id}/export/text${queryParams}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting quiz to text:', error);
      throw error;
    }
  },

  /**
   * Create a new folder
   * @param {string} name - Folder name
   * @param {number|null} parentId - Optional parent folder ID
   * @returns {Promise} API response
   */
  createFolder: async (name, parentId = null) => {
    try {
      const payload = { name };
      if (parentId) payload.parentId = parentId;
      
      const response = await authApi.post('/quizzes/folders', payload);
      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error.response?.data || { success: false, message: 'Failed to create folder' };
    }
  },

  /**
   * Get user folders
   * @returns {Promise} API response
   */
  getFolders: async () => {
    try {
      const response = await authApi.get('/quizzes/folders');
      return response.data;
    } catch (error) {
      console.error('Error fetching folders:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch folders' };
    }
  },

  /**
   * Get quizzes in a folder
   * @param {number|string} folderId - Folder ID or 'root'
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  getFolderQuizzes: async (folderId, params = {}) => {
    try {
      const { page = 1, limit = 100 } = params;
      const queryParams = new URLSearchParams({
        page,
        limit
      }).toString();

      const response = await authApi.get(`/quizzes/folders/${folderId}/quizzes?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching folder quizzes:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch folder quizzes' };
    }
  },

  /**
   * Get shared quizzes
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  getSharedQuizzes: async (params = {}) => {
    try {
      const { page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams({
        page,
        limit
      }).toString();

      const response = await authApi.get(`/quizzes/shared?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching shared quizzes:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch shared quizzes' };
    }
  },

  /**
   * Get recent quizzes
   * @param {number} limit - Number of quizzes to fetch
   * @returns {Promise} API response
   */
  getRecentQuizzes: async (limit = 5) => {
    try {
      const response = await authApi.get(`/quizzes/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent quizzes:', error);
      throw error.response?.data || { success: false, message: 'Failed to fetch recent quizzes' };
    }
  },

  /**
   * Search quizzes
   * @param {string} query - Search query
   * @param {Object} params - Query parameters
   * @returns {Promise} API response
   */
  searchQuizzes: async (query, params = {}) => {
    try {
      const { page = 1, limit = 10 } = params;
      const queryParams = new URLSearchParams({
        query,
        page,
        limit
      }).toString();

      const response = await authApi.get(`/quizzes/search?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error searching quizzes:', error);
      throw error.response?.data || { success: false, message: 'Failed to search quizzes' };
    }
  }
};

export default quizService;