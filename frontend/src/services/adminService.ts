// frontend/src/services/adminService.ts
import { authApi } from './authApi';
import {
    ApiResponse,
    User,
    School,
    UserParams
} from './types';

const adminService = {
    /**
     * Get dashboard statistics
     */
    getDashboardStats: async (): Promise<ApiResponse> => {
        try {
            const response = await authApi.get('/dashboard/stats');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching dashboard stats:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch dashboard stats' };
        }
    },

    /**
     * Get pending users
     */
    getPendingUsers: async (): Promise<ApiResponse<User[]>> => {
        try {
            const response = await authApi.get('/auth/pending-users');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching pending users:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch pending users' };
        }
    },

    /**
     * Verify a user
     */
    verifyUser: async (userId: number): Promise<ApiResponse> => {
        try {
            const response = await authApi.post(`/auth/verify-user/${userId}`, {});
            return response.data;
        } catch (error: any) {
            console.error('Error verifying user:', error);
            throw error.response?.data || { success: false, message: 'Failed to verify user' };
        }
    },

    /**
     * Get all users with optional pagination and filtering
     */
    getAllUsers: async (params: UserParams = {}): Promise<ApiResponse<User[]>> => {
        try {
            const {
                page = 1,
                limit = 10,
                search = '',
                filter = ''
            } = params;

            const response = await authApi.get('/users/admin/users', {
                params: { page, limit, search, filter }
            });
            return response.data;
        } catch (error: any) {
            console.error('Error fetching all users:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch users' };
        }
    },

    /**
     * Get all schools with optional pagination
     */
    getAllSchools: async (params: UserParams = {}): Promise<ApiResponse<School[]>> => {
        try {
            const {
                page = 1,
                limit = 10,
                search = ''
            } = params;

            const response = await authApi.get('/users/admin/schools', {
                params: { page, limit, search }
            });
            return response.data;
        } catch (error: any) {
            console.error('Error fetching all schools:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch schools' };
        }
    },

    /**
     * Update user status
     */
    updateUserStatus: async (userId: number, status: string): Promise<ApiResponse> => {
        try {
            const response = await authApi.put('/users/admin/user-status', { userId, status });
            return response.data;
        } catch (error: any) {
            console.error('Error updating user status:', error);
            throw error.response?.data || { success: false, message: 'Failed to update user status' };
        }
    },

    /**
     * Update user role
     */
    updateUserRole: async (userId: number, role: string): Promise<ApiResponse> => {
        try {
            const response = await authApi.put('/users/admin/user-role', { userId, role });
            return response.data;
        } catch (error: any) {
            console.error('Error updating user role:', error);
            throw error.response?.data || { success: false, message: 'Failed to update user role' };
        }
    },

    /**
     * Create a new user
     */
    createUser: async (userData: any): Promise<ApiResponse<User>> => {
        try {
            const response = await authApi.post('/admin/create-user', userData);
            return response.data;
        } catch (error: any) {
            console.error('Error creating user:', error);
            throw error.response?.data || { success: false, message: 'Failed to create user' };
        }
    }
};

export default adminService;

