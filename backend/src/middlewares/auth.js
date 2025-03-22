import jwt from 'jsonwebtoken';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // For initial phases, skip auth for development
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    // Set a default user in development mode
    req.user = { id: 1, name: 'Development User', role: 'admin' };
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
    const user = jwt.verify(token, JWT_SECRET);
    
    // Attach user data to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Skip in development mode if configured
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
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    next();
  };
};

export { authenticateToken, authorizeRoles };