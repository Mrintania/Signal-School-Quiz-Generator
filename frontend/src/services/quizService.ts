// frontend/src/services/quizService.ts
import { authApi } from './authApi';
import { AxiosResponse } from 'axios';

// Define interfaces for our types
export interface Quiz {
    id?: number;
    title: string;
    topic: string;
    questionType: string;
    studentLevel?: string;
    language?: string;
    userId?: number;
    questions: QuizQuestion[];
    created_at?: Date;
    updated_at?: Date;
    folder_id?: number | null;
}

export interface QuizQuestion {
    id?: number;
    questionText: string;
    explanation?: string;
    options?: QuizOption[];
}

export interface QuizOption {
    id?: number;
    text: string;
    isCorrect: boolean;
}

export interface Folder {
    id: number;
    name: string;
    user_id: number;
    parent_id: number | null;
    created_at: Date;
    updated_at?: Date;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface QuizParams {
    page?: number;
    limit?: number;
    search?: string;
    folder?: string | number | null;
    sortBy?: string;
    sortOrder?: string;
}

export interface FolderParams {
    page?: number;
    limit?: number;
}

/**
 * Quiz API Service - Handles all quiz-related API requests
 */
const quizService = {
    /**
     * Generate a quiz based on given parameters
     * @param {Object} data - Quiz generation parameters
     * @returns {Promise<ApiResponse<Quiz>>} API response
     */
    generateQuiz: async (data: {
        topic: string;
        questionType: string;
        numberOfQuestions: number;
        additionalInstructions?: string;
        studentLevel?: string;
        language?: string;
    }): Promise<ApiResponse<Quiz>> => {
        try {
            const response = await authApi.post('/quizzes/generate', data);
            return response.data;
        } catch (error: any) {
            console.error('Error generating quiz:', error);
            throw error.response?.data || { success: false, message: 'Failed to generate quiz' };
        }
    },

    /**
     * Save a quiz to the database
     * @param {Quiz} data - Quiz data
     * @returns {Promise<ApiResponse>} API response
     */
    saveQuiz: async (data: Quiz): Promise<ApiResponse> => {
        try {
            const response = await authApi.post('/quizzes/save', data);
            return response.data;
        } catch (error: any) {
            console.error('Error saving quiz:', error);
            throw error.response?.data || { success: false, message: 'Failed to save quiz' };
        }
    },

    /**
     * Get all quizzes with optional pagination and filtering
     * @param {QuizParams} params - Query parameters
     * @returns {Promise<ApiResponse<Quiz[]>>} API response
     */
    getAllQuizzes: async (params: QuizParams = {}): Promise<ApiResponse<Quiz[]>> => {
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
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search }),
                ...(folder && { folder: folder.toString() }),
                ...(sortBy && { sortBy }),
                ...(sortOrder && { sortOrder }),
            }).toString();

            const response = await authApi.get(`/quizzes?${queryParams}`);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching quizzes:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch quizzes' };
        }
    },

    /**
     * Get a specific quiz by ID
     * @param {number} id - Quiz ID
     * @returns {Promise<ApiResponse<Quiz>>} API response
     */
    getQuizById: async (id: number): Promise<ApiResponse<Quiz>> => {
        try {
            const response = await authApi.get(`/quizzes/${id}`);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching quiz:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch quiz' };
        }
    },

    /**
     * Delete a quiz
     * @param {number} id - Quiz ID
     * @returns {Promise<ApiResponse>} API response
     */
    deleteQuiz: async (id: number): Promise<ApiResponse> => {
        try {
            const response = await authApi.delete(`/quizzes/${id}`);
            return response.data;
        } catch (error: any) {
            console.error('Error deleting quiz:', error);
            throw error.response?.data || { success: false, message: 'Failed to delete quiz' };
        }
    },

    /**
     * Rename a quiz
     * @param {number} id - Quiz ID
     * @param {string} title - New title
     * @returns {Promise<ApiResponse>} API response
     */
    renameQuiz: async (id: number, title: string): Promise<ApiResponse> => {
        try {
            const response = await authApi.patch(`/quizzes/${id}/rename`, { title });
            return response.data;
        } catch (error: any) {
            console.error('Error renaming quiz:', error);
            throw error.response?.data || { success: false, message: 'Failed to rename quiz' };
        }
    },

    /**
     * Update quiz questions
     * @param {number} id - Quiz ID
     * @param {QuizQuestion[]} questions - Quiz questions
     * @returns {Promise<ApiResponse>} API response
     */
    updateQuizQuestions: async (id: number, questions: QuizQuestion[]): Promise<ApiResponse> => {
        try {
            const response = await authApi.patch(`/quizzes/${id}/questions`, { questions });
            return response.data;
        } catch (error: any) {
            console.error('Error updating quiz questions:', error);
            throw error.response?.data || { success: false, message: 'Failed to update quiz questions' };
        }
    },

    /**
     * Move a quiz to a folder
     * @param {number} id - Quiz ID
     * @param {number|string} folderId - Folder ID (or 'root')
     * @returns {Promise<ApiResponse>} API response
     */
    moveQuiz: async (id: number, folderId: number | string): Promise<ApiResponse> => {
        try {
            const response = await authApi.patch(`/quizzes/${id}/move`, { folderId });
            return response.data;
        } catch (error: any) {
            console.error('Error moving quiz:', error);
            throw error.response?.data || { success: false, message: 'Failed to move quiz' };
        }
    },

    /**
     * Check if a title is available
     * @param {string} title - Quiz title
     * @returns {Promise<ApiResponse>} API response
     */
    checkTitleAvailability: async (title: string): Promise<ApiResponse> => {
        try {
            const response = await authApi.get(`/quizzes/check-title?title=${encodeURIComponent(title)}`);
            return response.data;
        } catch (error: any) {
            console.error('Error checking title availability:', error);
            throw error.response?.data || { success: false, message: 'Failed to check title availability' };
        }
    },

    /**
     * Export a quiz to Moodle format
     * @param {number} id - Quiz ID
     * @param {string} filename - Optional filename
     * @returns {Promise<AxiosResponse>} API response
     */
    exportToMoodle: async (id: number, filename?: string): Promise<AxiosResponse> => {
        try {
            const queryParams = filename ? `?filename=${encodeURIComponent(filename)}` : '';
            const response = await authApi.get(`/quizzes/${id}/export/moodle${queryParams}`, {
                responseType: 'blob'
            });
            return response;
        } catch (error: any) {
            console.error('Error exporting quiz to Moodle:', error);
            throw error;
        }
    },

    /**
     * Export a quiz to plain text format
     * @param {number} id - Quiz ID
     * @param {string} filename - Optional filename
     * @returns {Promise<AxiosResponse>} API response
     */
    exportToText: async (id: number, filename?: string): Promise<AxiosResponse> => {
        try {
            const queryParams = filename ? `?filename=${encodeURIComponent(filename)}` : '';
            const response = await authApi.get(`/quizzes/${id}/export/text${queryParams}`, {
                responseType: 'blob'
            });
            return response;
        } catch (error: any) {
            console.error('Error exporting quiz to text:', error);
            throw error;
        }
    },

    /**
     * Create a new folder
     * @param {string} name - Folder name
     * @param {number|null} parentId - Optional parent folder ID
     * @returns {Promise<ApiResponse>} API response
     */
    createFolder: async (name: string, parentId: number | null = null): Promise<ApiResponse> => {
        try {
            const payload: { name: string; parentId?: number } = { name };
            if (parentId) payload.parentId = parentId;

            const response = await authApi.post('/quizzes/folders', payload);
            return response.data;
        } catch (error: any) {
            console.error('Error creating folder:', error);
            throw error.response?.data || { success: false, message: 'Failed to create folder' };
        }
    },

    /**
     * Get user folders
     * @returns {Promise<ApiResponse<Folder[]>>} API response
     */
    getFolders: async (): Promise<ApiResponse<Folder[]>> => {
        try {
            const response = await authApi.get('/quizzes/folders');
            return response.data;
        } catch (error: any) {
            console.error('Error fetching folders:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch folders' };
        }
    },

    /**
     * Get quizzes in a folder
     * @param {number|string} folderId - Folder ID or 'root'
     * @param {FolderParams} params - Query parameters
     * @returns {Promise<ApiResponse<Quiz[]>>} API response
     */
    getFolderQuizzes: async (folderId: number | string, params: FolderParams = {}): Promise<ApiResponse<Quiz[]>> => {
        try {
            const { page = 1, limit = 100 } = params;
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            }).toString();

            const response = await authApi.get(`/quizzes/folders/${folderId}/quizzes?${queryParams}`);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching folder quizzes:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch folder quizzes' };
        }
    },

    /**
     * Get shared quizzes
     * @param {FolderParams} params - Query parameters
     * @returns {Promise<ApiResponse<Quiz[]>>} API response
     */
    getSharedQuizzes: async (params: FolderParams = {}): Promise<ApiResponse<Quiz[]>> => {
        try {
            const { page = 1, limit = 10 } = params;
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            }).toString();

            const response = await authApi.get(`/quizzes/shared?${queryParams}`);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching shared quizzes:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch shared quizzes' };
        }
    },

    /**
     * Get recent quizzes
     * @param {number} limit - Number of quizzes to fetch
     * @returns {Promise<ApiResponse<Quiz[]>>} API response
     */
    getRecentQuizzes: async (limit: number = 5): Promise<ApiResponse<Quiz[]>> => {
        try {
            const response = await authApi.get(`/quizzes/recent?limit=${limit}`);
            return response.data;
        } catch (error: any) {
            console.error('Error fetching recent quizzes:', error);
            throw error.response?.data || { success: false, message: 'Failed to fetch recent quizzes' };
        }
    },

    /**
     * Search quizzes
     * @param {string} query - Search query
     * @param {FolderParams} params - Query parameters
     * @returns {Promise<ApiResponse<Quiz[]>>} API response
     */
    searchQuizzes: async (query: string, params: FolderParams = {}): Promise<ApiResponse<Quiz[]>> => {
        try {
            const { page = 1, limit = 10 } = params;
            const queryParams = new URLSearchParams({
                query,
                page: page.toString(),
                limit: limit.toString()
            }).toString();

            const response = await authApi.get(`/quizzes/search?${queryParams}`);
            return response.data;
        } catch (error: any) {
            console.error('Error searching quizzes:', error);
            throw error.response?.data || { success: false, message: 'Failed to search quizzes' };
        }
    }
};

export default quizService;