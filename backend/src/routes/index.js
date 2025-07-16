/**
 * Routes Index File
 * รวม exports ของ routes ทั้งหมด
 */

// New Quiz Routes (Refactored)
export { default as newQuizRoutes } from './quiz/newQuizRoutes.js';

// Legacy Routes
export { default as quizRoutes } from './quizRoutes.js';
export { default as authRoutes } from './authRoutes.js';
export { default as userRoutes } from './userRoutes.js';
export { default as adminRoutes } from './adminRoutes.js';
export { default as dashboardRoutes } from './dashboardRoutes.js';
export { default as schoolRoutes } from './schoolRoutes.js';