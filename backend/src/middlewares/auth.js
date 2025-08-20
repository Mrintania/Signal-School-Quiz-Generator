// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

const authMiddleware = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Add user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        department: decoded.department,
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error during authentication',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

// Middleware to check if user is admin
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin rights required.',
      code: 'ADMIN_ONLY'
    });
  }
};

// Middleware to check if user is teacher or admin
export const teacherOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Teacher or admin rights required.',
      code: 'TEACHER_OR_ADMIN_ONLY'
    });
  }
};

// Middleware to check specific permissions
export const hasPermission = (permission) => {
  return (req, res, next) => {
    if (req.user && req.user.permissions && req.user.permissions.includes(permission)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        error: `Access denied. ${permission} permission required.`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
  };
};

export default authMiddleware;