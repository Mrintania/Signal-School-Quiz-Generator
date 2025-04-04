// frontend/src/services/index.ts
import { authApi } from './authApi';
import authService from './authApi';
import userRoutes from './userRoutes';
import schoolRoutes from './schoolRoutes';
import quizService from './quizService';
import adminService from './adminService';

// Export interfaces
export type { 
  Quiz, 
  QuizQuestion, 
  QuizOption, 
  Folder, 
  ApiResponse, 
  QuizParams,
  FolderParams
} from './quizService';

/**
 * API Services - Central export for all API services
 */
const api = {
  auth: authService,
  user: userRoutes,
  school: schoolRoutes,
  quiz: quizService,
  admin: adminService,

  // Expose the axios instance for custom requests
  axios: authApi
};

export {
  authService,
  userRoutes,
  schoolRoutes,
  quizService,
  adminService,
  authApi
};

export default api;