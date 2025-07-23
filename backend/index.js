// src/index.js - Complete Working Version
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables first
dotenv.config();

console.log('🔧 Initializing Signal School Quiz Generator Backend...');

// Import database
let initDatabase, getDatabase;
try {
    const db = await import('./database/database.js');
    initDatabase = db.initDatabase;
    getDatabase = db.getDatabase;
    console.log('✅ Database module loaded');
} catch (error) {
    console.warn('⚠️  Database module not found, continuing without database...');
    console.warn('Error:', error.message);
}

// Import routes
let authRoutes;
try {
    const routes = await import('./routes/authRoutes.js');
    authRoutes = routes.default;
    console.log('✅ Auth routes loaded');
} catch (error) {
    console.warn('⚠️  Auth routes not found, continuing without auth...');
    console.warn('Error:', error.message);
}

// Create Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Basic middlewares
app.use(helmet());
app.use(compression());

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
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later.',
            type: 'RATE_LIMIT_ERROR'
        }
    }
});
app.use('/api/', limiter);

// Body parsing
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
            version: '2.0.0',
            environment: process.env.NODE_ENV || 'development',
            routes: {
                auth: authRoutes ? 'available' : 'not loaded',
                database: initDatabase ? 'available' : 'not loaded'
            }
        }
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Signal School Quiz Generator API',
        data: {
            version: '2.0.0',
            endpoints: {
                health: '/health',
                auth: authRoutes ? '/api/auth' : 'not available',
                api: '/api'
            }
        }
    });
});

// Mount auth routes if available
if (authRoutes) {
    app.use('/api/auth', authRoutes);
    console.log('🔐 Auth routes mounted at /api/auth');
} else {
    // Create minimal auth endpoint for testing
    app.post('/api/auth/login', (req, res) => {
        console.log('📨 Login attempt:', req.body);

        const { email, password } = req.body;

        // Simple hardcoded check for testing
        if (email === 'babylony@signalschool.ac.th' && password === 'password1234') {
            res.status(200).json({
                success: true,
                message: 'เข้าสู่ระบบสำเร็จ (Test Mode)',
                data: {
                    user: {
                        id: 1,
                        email: email,
                        firstName: 'Babylony',
                        lastName: 'Signal Officer',
                        role: 'admin',
                        fullName: 'Babylony Signal Officer'
                    },
                    token: 'test-token-' + Date.now(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } else {
            res.status(401).json({
                success: false,
                error: {
                    message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
                    type: 'AUTHENTICATION_ERROR'
                }
            });
        }
    });

    app.get('/api/auth/me', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Test auth endpoint',
            data: {
                user: {
                    id: 1,
                    email: 'babylony@signalschool.ac.th',
                    firstName: 'Babylony',
                    lastName: 'Signal Officer',
                    role: 'admin'
                }
            }
        });
    });

    console.log('🧪 Test auth endpoints created');
}

// Basic error handling
app.use((err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            type: err.type || 'INTERNAL_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// Handle 404
app.all('*', (req, res) => {
    console.error('404 Error:', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    res.status(404).json({
        success: false,
        error: {
            message: `Can't find ${req.originalUrl} on this server!`,
            type: 'NOT_FOUND_ERROR',
            availableEndpoints: {
                health: 'GET /health',
                api: 'GET /api',
                auth: authRoutes ? 'POST /api/auth/login' : 'POST /api/auth/login (test mode)'
            }
        }
    });
});

// Start server function
const startServer = async () => {
    try {
        const PORT = process.env.PORT || 3001;

        // Initialize database if available
        if (initDatabase) {
            try {
                await initDatabase();
                console.log('📊 Database initialized successfully');
            } catch (dbError) {
                console.warn('⚠️  Database initialization failed:', dbError.message);
                console.warn('Continuing without database...');
            }
        }

        // Start server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Signal School Quiz Generator Backend started!`);
            console.log(`📡 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 API base URL: http://localhost:${PORT}/api`);
            console.log(`🔐 Auth login: http://localhost:${PORT}/api/auth/login`);

            if (!authRoutes) {
                console.log('🧪 Running in TEST MODE - using hardcoded login');
                console.log('   Email: babylony@signalschool.ac.th');
                console.log('   Password: password1234');
            }
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
            server.close(() => {
                console.log('💥 Process terminated!');
            });
        });

        process.on('unhandledRejection', (err) => {
            console.error('UNHANDLED REJECTION! 💥 Shutting down...');
            console.error('Error:', err);
            server.close(() => {
                process.exit(1);
            });
        });

        return server;
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

export default app;