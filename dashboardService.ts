// frontend/src/services/dashboardService.ts
import { authApi } from './authApi';
import { ApiResponse } from './types';

interface SystemStatus {
    systems: Array<{
        name: string;
        status: string;
        health: number;
    }>;
    overallHealth: number;
    lastChecked: string;
}

const dashboardService = {
    /**
     * Get dashboard statistics
     */
    getStats: async (): Promise<ApiResponse> => {
        try {
            const response = await authApi.get('/dashboard/stats');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching dashboard stats:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch dashboard stats' };
        }
    },

    /**
     * Get system status
     */
    getSystemStatus: async (): Promise<ApiResponse<SystemStatus>> => {
        try {
            const response = await authApi.get('/dashboard/system-status');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching system status:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch system status' };
        }
    }
};

export default dashboardService;