import axios from 'axios';
import { API_URL } from './api';

// Get dashboard statistics
const getDashboardStats = async () => {
    try {
        const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
};

// Get pending users that need verification
const getPendingUsers = async () => {
    try {
        const response = await axios.get(`${API_URL}/auth/pending-users`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching pending users:', error);
        throw error;
    }
};

// Verify a user
const verifyUser = async (userId) => {
    try {
        const response = await axios.post(`${API_URL}/auth/verify-user/${userId}`, {}, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error verifying user:', error);
        throw error;
    }
};

// Get all users with pagination and filtering options
const getAllUsers = async (page = 1, limit = 10, search = '', filter = '') => {
    try {
        const response = await axios.get(`${API_URL}/users/admin/users`, {
            params: { page, limit, search, filter },
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching all users:', error);
        throw error;
    }
};

// Get all schools with pagination and filtering options
const getAllSchools = async (page = 1, limit = 10, search = '') => {
    try {
        const response = await axios.get(`${API_URL}/users/admin/schools`, {
            params: { page, limit, search },
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching all schools:', error);
        throw error;
    }
};

// Update user status (activate/suspend)
const updateUserStatus = async (userId, status) => {
    try {
        const response = await axios.put(`${API_URL}/users/admin/user-status`,
            { userId, status },
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error updating user status:', error);
        throw error;
    }
};

// Update user role
const updateUserRole = async (userId, role) => {
    try {
        const response = await axios.put(`${API_URL}/users/admin/user-role`,
            { userId, role },
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
};

// Create new user
const createUser = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}/admin/create-user`, 
            userData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        }
        );
        return response.data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

const adminService = {
    getDashboardStats,
    getPendingUsers,
    verifyUser,
    getAllUsers,
    getAllSchools,
    updateUserStatus,
    updateUserRole,
    createUser
};

export default adminService;