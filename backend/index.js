// backend/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configuration (fallback if config file doesn't exist)
let config;
try {
  const configModule = await import('./config/config.js');
  config = configModule.default;
} catch (error) {
  console.log('⚠️  Config file not found, using default configuration');
  config = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
    },
    app: {
      name: 'Quiz Generator - Signal School',
      version: '1.0.0',
      description: 'แอพพลิเคชั่นสร้างข้อสอบสำหรับโรงเรียนทหารสื่อสาร',
    }
  };
}

// Import routes with fallback
const importRoutes = async () => {
  const routes = {};
  
  try {
    const authModule = await import('./routes/auth.js');
    routes.auth = authModule.default;
  } catch (error) {
    console.log('⚠️  Auth routes not found, using fallback');
    routes.auth = express.Router();
    routes.auth.get('/', (req, res) => res.json({ message: 'Auth routes not implemented yet' }));
  }

  try {
    const userModule = await import('./routes/users.js');
    routes.users = userModule.default;
  } catch (error) {
    console.log('⚠️  User routes not found, using fallback');
    routes.users = express.Router();
    routes.users.get('/', (req, res) => res.json({ message: 'User routes not implemented yet' }));
  }

  try {
    const quizModule = await import('./routes/quiz.js');
    routes.quiz = quizModule.default;
  } catch (error) {
    console.log('⚠️  Quiz routes not found, using fallback');
    routes.quiz = express.Router();
    routes.quiz.get('/', (req, res) => res.json({ message: 'Quiz routes not implemented yet' }));
  }

  try {
    const geminiModule = await import('./routes/gemini.js');
    routes.gemini = geminiModule.default;
  } catch (error) {
    console.log('⚠️  Gemini routes not found, using fallback');
    routes.gemini = express.Router();
    routes.gemini.get('/', (req, res) => res.json({ message: 'Gemini routes not implemented yet' }));
  }

  try {
    const subjectModule = await import('./routes/subjects.js');
    routes.subjects = subjectModule.default;
  } catch (error) {
    console.log('⚠️  Subject routes not found, using fallback');
    routes.subjects = express.Router();
    routes.subjects.get('/', (req, res) => res.json({ message: 'Subject routes not implemented yet' }));
  }

  return routes;
};

// Import middleware with fallback
const importMiddleware = async () => {
  let errorHandler, authMiddleware;
  
  try {
    const errorModule = await import('./middleware/errorHandler.js');
    errorHandler = errorModule.default;
  } catch (error) {
    console.log('⚠️  Error handler not found, using fallback');
    errorHandler = (error, req, res, next) => {
      console.error('Error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        timestamp: new Date().toISOString(),
      });
    };
  }

  try {
    const authModule = await import('./middleware/auth.js');
    authMiddleware = authModule.default;
  } catch (error) {
    console.log('⚠️  Auth middleware not found, using fallback');
    authMiddleware = (req, res, next) => {
      req.user = { id: 1, role: 'demo' };
      next();
    };
  }

  return { errorHandler, authMiddleware };
};

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize database connection
const initDatabase = async () => {
  try {
    const dbModule = await import('./database/connection.js');
    await dbModule.connectDB();
  } catch (error) {
    console.log('⚠️  Database connection not available, continuing without database');
  }
};

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(config.cors));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: config.rateLimit.message,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Quiz Generator API is running',
    timestamp: new Date().toISOString(),
    version: config.app.version,
    environment: config.NODE_ENV,
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Quiz Generator API - Signal School',
    description: config.app.description,
    version: config.app.version,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      quiz: '/api/quiz',
      gemini: '/api/gemini',
      subjects: '/api/subjects',
    },
    documentation: '/api/docs',
  });
});

// Initialize application
const initApp = async () => {
  try {
    // Initialize database
    await initDatabase();

    // Import and setup routes
    const routes = await importRoutes();
    const { errorHandler, authMiddleware } = await importMiddleware();

    // API routes
    app.use('/api/auth', routes.auth);
    app.use('/api/users', authMiddleware, routes.users);
    app.use('/api/quiz', authMiddleware, routes.quiz);
    app.use('/api/gemini', authMiddleware, routes.gemini);
    app.use('/api/subjects', authMiddleware, routes.subjects);

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    app.use(errorHandler);

    // Start server
    const PORT = config.PORT;
    const server = app.listen(PORT, () => {
      console.log(`
🚀 Quiz Generator Server is running!
📍 Port: ${PORT}
🌍 Environment: ${config.NODE_ENV}
🏫 School: ${config.app.name}
📖 API Documentation: http://localhost:${PORT}/
🔧 Health Check: http://localhost:${PORT}/health
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start the application
initApp();

export default app;