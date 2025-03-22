import helmet from 'helmet';
import cors from 'cors';
import xss from 'xss-clean';
import hpp from 'hpp';

// Configure security middleware
const securityMiddleware = {
  // Helmet helps secure Express apps by setting HTTP response headers
  helmetConfig: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000']
      }
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }),
  
  // CORS configuration
  corsConfig: cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }),
  
  // XSS prevention middleware
  xssProtection: xss(),
  
  // HTTP Parameter Pollution protection
  hppProtection: hpp(),
  
  // Custom security middleware
  generalSecurity: (req, res, next) => {
    // Disable X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
  }
};

// Apply all security middleware to Express app
const applySecurityMiddleware = (app) => {
  app.use(securityMiddleware.helmetConfig);
  app.use(securityMiddleware.corsConfig);
  app.use(securityMiddleware.xssProtection);
  app.use(securityMiddleware.hppProtection);
  app.use(securityMiddleware.generalSecurity);
};

export default applySecurityMiddleware;