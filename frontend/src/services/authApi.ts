// frontend/src/services/authApi.ts
import axios, { AxiosInstance } from 'axios';

// API URL from environment variable
const API_URL: string = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create auth axios instance
export const authApi: AxiosInstance = axios.create({
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