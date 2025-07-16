# Signal School Quiz Generator - Backend

## 🎯 Overview

Refactored backend application for Signal School Quiz Generator with improved architecture, better separation of concerns, and enhanced maintainability.

## 🏗️ New Architecture

### Controller Layer
- **QuizGenerationController**: Handles AI-powered quiz generation
- **QuizManagementController**: Manages CRUD operations for quizzes
- **BaseController**: Common functionality for all controllers

### Service Layer
- **QuizGenerationService**: Business logic for quiz generation
- **QuizManagementService**: Business logic for quiz management
- **GeminiService**: AI integration service
- **CacheService**: Caching operations
- **FileService**: File processing operations

### Repository Layer
- **BaseRepository**: Common database operations
- **QuizRepository**: Quiz-specific database operations
- **UserRepository**: User data access
- **FolderRepository**: Folder management

### Middleware Layer
- **ErrorHandlingMiddleware**: Centralized error handling
- **CacheMiddleware**: HTTP caching
- **ValidationMiddleware**: Request validation
- **SecurityMiddleware**: Authentication & authorization

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MySQL 8.0+
- Redis (optional, for advanced caching)

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd signal-school-quiz-generator/backend
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations
```bash
npm run db:migrate
```

5. Start the development server
```bash
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── quiz/            # Quiz-specific controllers
│   │   └── base/            # Base controller classes
│   ├── services/            # Business logic
│   │   ├── quiz/            # Quiz services
│   │   ├── ai/              # AI services
│   │   └── common/          # Shared services
│   ├── repositories/        # Data access layer
│   ├── middlewares/         # Express middleware
│   ├── utils/               # Utility functions
│   ├── dto/                 # Data transfer objects
│   ├── errors/              # Custom error classes
│   ├── routes/              # Route definitions
│   └── config/              # Configuration files
├── tests/                   # Test files
├── logs/                    # Application logs
├── uploads/                 # File uploads
└── scripts/                 # Utility scripts
```

## 🔧 API Endpoints

### Quiz Generation
- `POST /api/quiz/generation/text` - Generate quiz from text
- `POST /api/quiz/generation/file` - Generate quiz from file
- `POST /api/quiz/generation/:id/additional` - Add questions to existing quiz

### Quiz Management
- `GET /api/quiz/management` - List user's quizzes
- `POST /api/quiz/management` - Create new quiz
- `PUT /api/quiz/management/:id` - Update quiz
- `DELETE /api/quiz/management/:id` - Delete quiz

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔍 Development

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database
```bash
# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## 📊 Monitoring

The application includes comprehensive logging and monitoring:

- **Winston Logger**: Structured logging with multiple transports
- **Error Tracking**: Centralized error handling and reporting
- **Performance Metrics**: Request/response time tracking
- **Cache Monitoring**: Cache hit/miss statistics

## 🔒 Security

- **Helmet**: Security headers
- **Rate Limiting**: API rate limiting
- **Input Validation**: Request validation with express-validator
- **JWT Authentication**: Secure authentication
- **CORS**: Cross-origin resource sharing

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Required environment variables:
- `NODE_ENV`
- `PORT`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `FRONTEND_URL`

## 📝 Changelog

### Version 2.0.0
- Refactored architecture with better separation of concerns
- Improved error handling and logging
- Enhanced caching system
- Better validation and security
- Comprehensive testing setup
- Documentation improvements

## 🤝 Contributing

1. Follow the established architecture patterns
2. Write tests for new features
3. Update documentation as needed
4. Follow code style guidelines

## 📞 Support

For support and questions:
- Signal School Development Team
- Signal Department, Royal Thai Army

---

Built with ❤️ for Signal School, Royal Thai Army