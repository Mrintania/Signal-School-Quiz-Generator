// backend/src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';
import configService from '../services/configService.js';
import { AuthRequest, UserRole } from '../types/index.js';

// JWT secret from environment variable
const JWT_SECRET = configService.get<string>('jwt.secret', 'your_jwt_secret_key_here');

// Define JWT payload interface
interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

// Authentication middleware - Verifies JWT token and attaches user data to request
const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  // For initial phases, skip auth for development if configured to do so
  if (configService.isDevelopment() && configService.get<boolean>('server.skipAuth', false)) {
    // Set a default user in development mode
    (req as AuthRequest).user = { userId: 1, email: 'admin@example.com', role: 'admin' };
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
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Set user data from token
    (req as AuthRequest).user = decoded;

    // Check if user is still active in the database
    if (!pool) {
      throw new Error('Database connection not available');
    }

    const [users] = await pool.execute(
      'SELECT id, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if ((users as any[]).length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if ((users as any[])[0].status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Your account is not active. Please contact an administrator for account verification.'
      });
    }

    // Log authentication for security monitoring (optional)
    if (configService.get<boolean>('server.logAuth', false)) {
      logger.info(`Authenticated request: User ID ${decoded.userId}, Role: ${decoded.role}, Path: ${req.originalUrl}`);
    }

    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
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
const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    // Skip in development mode if configured to do so
    if (configService.isDevelopment() && configService.get<boolean>('server.skipAuth', false)) {
      return next();
    }

    if (!(req as AuthRequest).user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(((req as AuthRequest).user?.role ?? '') as UserRole)) {
      logger.warn(`Access denied: User ID ${(req as AuthRequest).user?.userId ?? 'unknown'} with role ${(req as AuthRequest).user?.role ?? 'unknown'} attempted to access ${req.originalUrl} (requires ${roles.join(' or ')})`);

      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to perform this action.'
      });
    }

    next();
  };
};

// Permission-based authorization middleware (more granular than role-based)
const authorizePermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    // Skip in development mode if configured to do so
    if (configService.isDevelopment() && configService.get<boolean>('server.skipAuth', false)) {
      return next();
    }

    if (!(req as AuthRequest).user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      // Check if user has the required permission
      if (!pool) {
        throw new Error('Database connection not available');
      }

      const [permissions] = await pool.execute(
        `SELECT p.name 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role = ? AND p.name = ?`,
        [((req as AuthRequest).user?.role ?? ''), permissionName]
      );

      if ((permissions as any[]).length === 0) {
        logger.warn(`Permission denied: User ID ${(req as AuthRequest).user?.userId ?? 'unknown'} with role ${(req as AuthRequest).user?.role ?? 'unknown'} attempted to use permission "${permissionName}" at ${req.originalUrl}`);
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