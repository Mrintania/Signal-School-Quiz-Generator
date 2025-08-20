// backend/config/config.js
import dotenv from 'dotenv';

dotenv.config();

const config = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USERNAME || 'quiz_user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'quiz_generator_db',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-for-quiz-app',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  // Gemini AI Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    model: 'gemini-pro',
    maxTokens: 4096,
    temperature: 0.7,
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  
  // File Upload Configuration
  upload: {
    maxSize: process.env.MAX_FILE_SIZE || '10mb',
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
  
  // Email Configuration (for notifications)
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'quiz-generator@signalschool.army',
  },
  
  // App-specific Configuration
  app: {
    name: 'Quiz Generator - Signal School',
    version: '1.0.0',
    description: 'แอพพลิเคชั่นสร้างข้อสอบสำหรับโรงเรียนทหารสื่อสาร',
    defaultLanguage: 'th',
    supportedLanguages: ['th', 'en'],
  },
  
  // Quiz Generation Settings
  quiz: {
    defaultQuestionCount: 10,
    maxQuestionCount: 100,
    minQuestionCount: 5,
    supportedQuestionTypes: [
      'multiple_choice',
      'true_false',
      'short_answer',
      'essay',
      'matching',
      'fill_in_blank'
    ],
    supportedDifficulties: ['easy', 'medium', 'hard'],
    supportedSubjects: [
      'computer_science',
      'artificial_intelligence',
      'information_technology',
      'signal_communication',
      'network_security',
      'programming',
      'mathematics',
      'physics',
      'english'
    ],
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
};

export default config;