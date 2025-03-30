// backend/src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Authentication middleware - Verifies JWT token and attaches user data to request
const authenticateToken = async (req, res, next) => {
  // For initial phases, skip auth for development if configured to do so
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    // Set a default user in development mode
    req.user = { userId: 1, email: 'admin@example.com', role: 'admin' };
    return next();
  }

  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user data from token
    req.user = decoded;
    
    // Check if user is still active in the database
    const [users] = await pool.execute(
      'SELECT id, status FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (users[0].status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Your account is not active. Please contact an administrator for account verification.'
      });
    }
    
    // Log authentication for security monitoring (optional)
    if (process.env.LOG_AUTH === 'true') {
      logger.info(`Authenticated request: User ID ${decoded.userId}, Role: ${decoded.role}, Path: ${req.originalUrl}`);
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    
    logger.error('Authentication error:', error);
    
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Skip in development mode if configured to do so
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      return next();
    }
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied: User ID ${req.user.userId} with role ${req.user.role} attempted to access ${req.originalUrl} (requires ${roles.join(' or ')})`);
      
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.'
      });
    }
    
    next();
  };
};

// Permission-based authorization middleware (more granular than role-based)
const authorizePermission = (permissionName) => {
  return async (req, res, next) => {
    // Skip in development mode if configured to do so
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      return next();
    }
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    try {
      // Check if user has the required permission
      const [permissions] = await pool.execute(
        `SELECT p.name 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role = ? AND p.name = ?`,
        [req.user.role, permissionName]
      );
      
      if (permissions.length === 0) {
        logger.warn(`Permission denied: User ID ${req.user.userId} with role ${req.user.role} attempted to use permission "${permissionName}" at ${req.originalUrl}`);
        
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to perform this action.'
        });
      }
      
      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

export { authenticateToken, authorizeRoles, authorizePermission };