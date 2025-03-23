// backend/index.js - Updated version with new routes
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import quizRoutes from './src/routes/quizRoutes.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import schoolRoutes from './src/routes/schoolRoutes.js';
import { testConnection } from './src/config/db.js';
import { logger, httpLogger } from './src/utils/logger.js';
import applySecurityMiddleware from './src/middlewares/security.js';
import { generalLimiter } from './src/middlewares/rateLimiter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeAll } from './src/utils/validator.js';

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync('uploads/profile-images')) {
  fs.mkdirSync('uploads/profile-images');
}

// Apply security middleware
applySecurityMiddleware(app);

// Apply HTTP request logging
app.use(httpLogger);

// Apply general rate limiter
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply input sanitization
app.use(sanitizeAll);

// Test database connection
testConnection()
  .then(success => {
    if (success) {
      logger.info('Database connection established successfully');
    } else {
      logger.error('Database connection failed');
    }
  })
  .catch(error => {
    logger.error('Database connection error:', error);
  });

// API Routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/auth', authRoutes); // New authentication routes
app.use('/api/users', userRoutes); // New user management routes
app.use('/api/schools', schoolRoutes); // New school management routes

// Serve static files for profile images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Home route
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to Quiz Generator API',
    version: process.env.API_VERSION || '1.0.0',
    status: 'Running'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Any route not matched by API routes will serve the React app
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  logger.warn(`Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Global error handler: ${err.message}`, { 
    url: req.originalUrl,
    method: req.method,
    stack: err.stack
  });
  
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});