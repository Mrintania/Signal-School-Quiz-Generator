/**
 * Controllers Index File
 * รวม exports ของ controllers ทั้งหมด
 */

// Quiz Controllers
export { QuizGenerationController } from './quiz/QuizGenerationController.js';
export { QuizManagementController } from './quiz/QuizManagementController.js';

// Base Controller
export { default as BaseController } from './base/BaseController.js';

// Legacy Controllers (for backward compatibility)
export { default as QuizController } from './quizController.js';
export { default as AuthController } from './authController.js';
export { default as UserController } from './userController.js';
export { default as AdminController } from './adminController.js';
export { default as DashboardController } from './dashboardController.js';
export { default as ExportController } from './exportController.js';
export { default as SchoolController } from './schoolController.js';
export { default as SchoolAdminController } from './schoolAdminController.js';