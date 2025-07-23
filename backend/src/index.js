// src/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import middlewares
import {
    globalErrorHandler,
    handleNotFound,
    handleUncaughtException,
    handleUnhandledRejection,
    handleSigterm
} from './middlewares/error/ErrorHandlingMiddleware.js';

// Import routes (จะสร้างในขั้นตอนถัดไป)
// import quizRoutes from './routes/quizRoutes.js';
// import authRoutes from './routes/authRoutes.js';

// Load environment variables
dotenv.config();

// Handle uncaught exceptions
handleUncaughtException();

// Create Express app
const app = express();

// Trust proxy (สำหรับ deployment)
app.set('trust proxy', 1);

// Global middlewares
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later.',
            type: 'RATE_LIMIT_ERROR'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Signal School Quiz Generator API is running!',
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '2.0.0',
            environment: process.env.NODE_ENV || 'development'
        }
    });
});

// API routes
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Signal School Quiz Generator API',
        data: {
            version: '2.0.0',
            documentation: '/api/docs',
            endpoints: {
                health: '/health',
                auth: '/api/auth',
                quiz: '/api/quiz',
                subjects: '/api/subjects'
            }
        }
    });
});

// Mount routes (uncomment เมื่อสร้างไฟล์ routes แล้ว)
// app.use('/api/auth', authRoutes);
// app.use('/api/quiz', quizRoutes);

// Handle undefined routes
app.all('*', handleNotFound);

// Global error handling middleware
app.use(globalErrorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Signal School Quiz Generator Backend started!`);
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API base URL: http://localhost:${PORT}/api`);
});

// Handle unhandled promise rejections
handleUnhandledRejection(server);

// Handle SIGTERM
handleSigterm(server);

export default app;