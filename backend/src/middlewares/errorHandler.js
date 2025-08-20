// backend/middleware/errorHandler.js
import config from '../config/config.js';

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Mongoose/Sequelize validation error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map(val => val.message).join(', ');
  }

  // Mongoose/Sequelize duplicate key error
  if (error.code === 11000 || error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    const field = Object.keys(error.keyValue || error.fields || {})[0];
    message = `${field} already exists`;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Sequelize errors
  if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = error.errors.map(err => err.message).join(', ');
  }

  if (error.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    message = 'Database error';
  }

  // Log error in development
  if (config.NODE_ENV === 'development') {
    console.error('Error Stack:', error.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};

export default errorHandler;