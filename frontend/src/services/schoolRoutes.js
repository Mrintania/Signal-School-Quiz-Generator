// frontend/src/services/schoolRoutes.js
import { authApi } from './authApi';

/**
 * School API Service - Handles all school-related API requests
 */
const schoolRoutes = {
  /**
   * Create a new school
   * @param {Object} schoolData - School data
   * @returns {Promise} API response
   */
  createSchool: async (schoolData) => {
    try {
      const response = await authApi.post('/schools', schoolData);
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
      const response = await authApi.get(`/schools/${schoolId}`);
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
      const response = await authApi.put(`/schools/${schoolId}`, schoolData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update school' };
    }
  },

  /**
   * Get school departments
   * @param {number} schoolId - School ID
   * @returns {Promise} API response
   */
  getSchoolDepartments: async (schoolId) => {
    try {
      const response = await authApi.get(`/schools/${schoolId}/departments`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch school departments' };
    }
  },

  /**
   * Create department
   * @param {Object} departmentData - Department data
   * @returns {Promise} API response
   */
  createDepartment: async (departmentData) => {
    try {
      const response = await authApi.post('/schools/departments', departmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to create department' };
    }
  },

  /**
   * Update department
   * @param {number} departmentId - Department ID
   * @param {Object} departmentData - Department data to update
   * @returns {Promise} API response
   */
  updateDepartment: async (departmentId, departmentData) => {
    try {
      const response = await authApi.put(`/schools/departments/${departmentId}`, departmentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update department' };
    }
  },

  /**
   * Delete department
   * @param {number} departmentId - Department ID
   * @returns {Promise} API response
   */
  deleteDepartment: async (departmentId) => {
    try {
      const response = await authApi.delete(`/schools/departments/${departmentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to delete department' };
    }
  },

  /**
   * Add user to department
   * @param {Object} memberData - Member data
   * @returns {Promise} API response
   */
  addUserToDepartment: async (memberData) => {
    try {
      const response = await authApi.post('/schools/departments/members', memberData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to add user to department' };
    }
  },

  /**
   * Remove user from department
   * @param {number} userId - User ID
   * @param {number} departmentId - Department ID
   * @returns {Promise} API response
   */
  removeUserFromDepartment: async (userId, departmentId) => {
    try {
      const response = await authApi.delete('/schools/departments/members', {
        data: { userId, departmentId },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to remove user from department' };
    }
  },

  /**
   * Get department members
   * @param {number} departmentId - Department ID
   * @returns {Promise} API response
   */
  getDepartmentMembers: async (departmentId) => {
    try {
      const response = await authApi.get(`/schools/departments/${departmentId}/members`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch department members' };
    }
  },

  /**
   * Get user's schools
   * @returns {Promise} API response with user's schools
   */
  getUserSchools: async () => {
    try {
      // This assumes the user profile includes schools information
      const response = await authApi.get('/users/profile');
      return {
        success: true,
        data: response.data.data.schools || []
      };
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch user schools' };
    }
  },
};

export default schoolRoutes;