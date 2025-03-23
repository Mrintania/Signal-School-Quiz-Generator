// frontend/src/services/index.js
import { authApi } from './authApi';
import authService from './authApi';
import userRoutes from './userRoutes';
import schoolRoutes from './schoolRoutes';
import quizService from './quizService'; // Assuming you have this from your existing code

/**
 * API Services - Central export for all API services
 */
const api = {
  auth: authService,
  user: userRoutes,
  school: schoolRoutes,
  quiz: quizService,

  // Expose the axios instance for custom requests
  axios: authApi
};

export default api;