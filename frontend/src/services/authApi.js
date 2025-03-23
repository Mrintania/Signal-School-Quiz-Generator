// frontend/src/services/authApi.js
import axios from 'axios';

// API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create auth axios instance
export const authApi = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests if available
authApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle auth errors globally
authApi.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle session expiration or invalid token
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Only clear token if it's an auth issue, not on regular 403 permissions
            if (error.response.data?.message?.includes('token')) {
                localStorage.removeItem('token');
                window.location.href = '/login?session=expired';
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Auth API Service - Handles all authentication-related API requests
 */
const authService = {
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise} API response
     */
    register: async (userData) => {
        try {
            const response = await authApi.post('/auth/register', userData);
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
            const response = await authApi.post('/auth/login', { email, password });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Login failed' };
        }
    },

    /**
     * Verify user's authentication status
     * @returns {Promise} API response
     */
    checkAuthStatus: async () => {
        try {
            const response = await authApi.get('/auth/status');
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Authentication check failed' };
        }
    },

    /**
     * Verify email with token
     * @param {string} token - Email verification token
     * @returns {Promise} API response
     */
    verifyEmail: async (token) => {
        try {
            const response = await authApi.post('/auth/verify-email', { token });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Email verification failed' };
        }
    },

    /**
     * Resend verification email
     * @param {string} email - User email
     * @returns {Promise} API response
     */
    resendVerification: async (email) => {
        try {
            const response = await authApi.post('/auth/resend-verification', { email });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to resend verification email' };
        }
    },

    /**
     * Request password reset
     * @param {string} email - User email
     * @returns {Promise} API response
     */
    forgotPassword: async (email) => {
        try {
            const response = await authApi.post('/auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to process password reset request' };
        }
    },

    /**
     * Reset password with token
     * @param {string} token - Password reset token
     * @param {string} newPassword - New password
     * @returns {Promise} API response
     */
    resetPassword: async (token, newPassword) => {
        try {
            const response = await authApi.post('/auth/reset-password', { token, newPassword });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Password reset failed' };
        }
    },

    /**
     * Accept invitation
     * @param {string} token - Invitation token
     * @param {Object} userData - User data for accepting invitation
     * @returns {Promise} API response
     */
    acceptInvitation: async (token, userData) => {
        try {
            const response = await authApi.post('/auth/accept-invitation', {
                token,
                firstName: userData.firstName,
                lastName: userData.lastName,
                password: userData.password,
            });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Failed to accept invitation' };
        }
    },

    /**
     * Login with Google
     * @param {string} idToken - Google ID token
     * @returns {Promise} API response
     */
    googleAuth: async (idToken) => {
        try {
            const response = await authApi.post('/auth/google', { idToken });
            return response.data;
        } catch (error) {
            throw error.response?.data || { success: false, message: 'Google authentication failed' };
        }
    },
};

export default authService;