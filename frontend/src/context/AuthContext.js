// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Create AuthContext
const AuthContext = createContext(null);

// API URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create auth axios instance
const authApi = axios.create({
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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.get('/auth/status');
        if (response.data.success) {
          const userResponse = await authApi.get('/users/profile');
          if (userResponse.data.success) {
            setCurrentUser(userResponse.data.data);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.post('/auth/register', userData);
      return response.data.success;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        
        // Get full user profile
        const userResponse = await authApi.get('/users/profile');
        
        if (userResponse.data.success) {
          setCurrentUser(userResponse.data.data);
          setIsAuthenticated(true);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      
      // Special handling for verification required
      if (error.response?.data?.requiresVerification) {
        return { requiresVerification: true, email };
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Verify email with token
  const verifyEmail = async (token) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.post('/auth/verify-email', { token });
      return response.data.success;
    } catch (error) {
      setError(error.response?.data?.message || 'Email verification failed.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Request password reset
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.post('/auth/forgot-password', { email });
      return response.data.success;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to process password reset request.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reset password with token
  const resetPassword = async (token, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.post('/auth/reset-password', { token, newPassword });
      return response.data.success;
    } catch (error) {
      setError(error.response?.data?.message || 'Password reset failed.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.put('/users/profile', profileData);
      
      if (response.data.success) {
        // Refresh user data
        const userResponse = await authApi.get('/users/profile');
        
        if (userResponse.data.success) {
          setCurrentUser(userResponse.data.data);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update user password
  const updatePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.put('/users/password', {
        currentPassword,
        newPassword
      });
      
      return response.data.success;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update password.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update user settings
  const updateSettings = async (settings) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.put('/users/settings', settings);
      
      if (response.data.success) {
        // Refresh user data
        const userResponse = await authApi.get('/users/profile');
        
        if (userResponse.data.success) {
          setCurrentUser(userResponse.data.data);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update settings.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Upload profile image
  const uploadProfileImage = async (imageFile) => {
    try {
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('profileImage', imageFile);
      
      const response = await authApi.post('/users/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        // Refresh user data
        const userResponse = await authApi.get('/users/profile');
        
        if (userResponse.data.success) {
          setCurrentUser(userResponse.data.data);
        }
        
        return response.data.imageUrl;
      }
      
      return null;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload profile image.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Accept invitation
  const acceptInvitation = async (token, userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.post('/auth/accept-invitation', {
        token,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setCurrentUser(user);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to accept invitation.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => setError(null);

  // Check if user has a specific role
  const hasRole = (role) => {
    if (!currentUser) return false;
    return currentUser.role === role;
  };

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    updateProfile,
    updatePassword,
    updateSettings,
    uploadProfileImage,
    acceptInvitation,
    clearError,
    hasRole,
    isAdmin: () => hasRole('admin'),
    isSchoolAdmin: () => hasRole('school_admin'),
    isTeacher: () => hasRole('teacher'),
    authApi
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;