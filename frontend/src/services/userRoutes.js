// frontend/src/services/userRoutes.js
import { authApi } from './authApi';

/**
 * User API Service - Handles all user-related API requests
 */
const userRoutes = {
    /**
     * Get current user profile
     * @returns {Promise} API response
     */
    getCurrentUser: async () => {
        try {
            const response = await authApi.get('/users/profile');
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
            const response = await authApi.put('/users/profile', profileData);
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
            const response = await authApi.put('/users/password', { currentPassword, newPassword });
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

            const response = await authApi.post('/users/profile-image', formData, {
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
     * @param {Object} settings - User settings to update
     * @returns {Promise} API response
     */
    updateSettings: async (settings) => {
        try {
            const response = await authApi.put('/users/settings', settings);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to update settings' };
        }
    },

    /**
     * Get user activity
     * @param {number} limit - Number of activities to fetch
     * @param {number} offset - Offset for pagination
     * @returns {Promise} API response
     */
    getUserActivity: async (limit = 10, offset = 0) => {
        try {
            const response = await authApi.get(`/users/activity?limit=${limit}&offset=${offset}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to fetch user activity' };
        }
    },

    /**
     * Close user account
     * @param {string} password - User password for confirmation
     * @param {string} reason - Reason for closing account
     * @returns {Promise} API response
     */
    closeAccount: async (password, reason) => {
        try {
            const response = await authApi.post('/users/close-account', { password, reason });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to close account' };
        }
    },

    // School admin methods
    /**
     * Invite user to school
     * @param {Object} inviteData - Invitation data
     * @returns {Promise} API response
     */
    inviteUser: async (inviteData) => {
        try {
            const response = await authApi.post('/users/invite', inviteData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to send invitation' };
        }
    },

    /**
     * Get school users
     * @param {number} schoolId - School ID
     * @returns {Promise} API response
     */
    getSchoolUsers: async (schoolId) => {
        try {
            const response = await authApi.get(`/users/school/${schoolId}/users`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to fetch school users' };
        }
    },

    /**
     * Update user role in school
     * @param {Object} roleData - Role update data
     * @returns {Promise} API response
     */
    updateUserRole: async (roleData) => {
        try {
            const response = await authApi.put('/users/school/role', roleData);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to update user role' };
        }
    },

    /**
     * Remove user from school
     * @param {number} userId - User ID
     * @param {number} schoolId - School ID
     * @returns {Promise} API response
     */
    removeUserFromSchool: async (userId, schoolId) => {
        try {
            const response = await authApi.delete('/users/school/user', {
                data: { userId, schoolId },
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to remove user from school' };
        }
    },

    /**
     * Cancel invitation
     * @param {string} invitationId - Invitation ID
     * @returns {Promise} API response
     */
    cancelInvitation: async (invitationId) => {
        try {
            const response = await authApi.delete(`/users/invitation/${invitationId}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to cancel invitation' };
        }
    },

    // Admin methods
    /**
     * Get all users (admin only)
     * @param {Object} params - Query parameters
     * @returns {Promise} API response
     */
    getAllUsers: async (params = {}) => {
        try {
            const { limit = 20, offset = 0, search = '', filter = '' } = params;
            const queryParams = new URLSearchParams({
                limit,
                offset,
                ...(search && { search }),
                ...(filter && { filter }),
            }).toString();

            const response = await authApi.get(`/users/admin/users?${queryParams}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to fetch users' };
        }
    },

    /**
     * Get all schools (admin only)
     * @param {Object} params - Query parameters
     * @returns {Promise} API response
     */
    getAllSchools: async (params = {}) => {
        try {
            const { limit = 20, offset = 0, search = '' } = params;
            const queryParams = new URLSearchParams({
                limit,
                offset,
                ...(search && { search }),
            }).toString();

            const response = await authApi.get(`/users/admin/schools?${queryParams}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to fetch schools' };
        }
    },

    /**
     * Update user status (admin only)
     * @param {number} userId - User ID
     * @param {string} status - New status
     * @returns {Promise} API response
     */
    updateUserStatus: async (userId, status) => {
        try {
            const response = await authApi.put('/users/admin/user-status', { userId, status });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to update user status' };
        }
    },

    /**
     * Update user role (admin only)
     * @param {number} userId - User ID
     * @param {string} role - New role
     * @returns {Promise} API response
     */
    updateUserRoleAdmin: async (userId, role) => {
        try {
            const response = await authApi.put('/users/admin/user-role', { userId, role });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to update user role' };
        }
    },
};

export default userRoutes;