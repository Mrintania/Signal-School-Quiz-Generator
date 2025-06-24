# Signal School Quiz Generator 🧠📝

*โรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร | Signal School, Signal Department, Royal Thai Army*

## Project Overview

Signal School Quiz Generator is an innovative educational technology platform designed specifically for military educational institutions to revolutionize quiz creation through artificial intelligence. Developed for Signal School instructors and educators, this system empowers teaching staff to generate high-quality, customizable quizzes efficiently, enhancing the learning experience in AI, IT, and Computer Science education within military academic environments.

## 🌟 Key Features

### AI-Powered Quiz Generation
- **Instant Quiz Creation**: Generate professional-quality quizzes within seconds using Google Gemini AI
- **Multilingual Support**: Create quizzes in English and Thai languages
- **Adaptive Content**: Customize quizzes based on student levels and military educational objectives
- **Subject-Specific Templates**: Specialized templates for AI, IT, and Computer Science courses

### Comprehensive Quiz Management System
- **Multiple Question Types**
  - Multiple Choice Questions with customizable options
  - Essay-style Assessments for comprehensive evaluation
  - Technical assessments for programming and IT concepts
- **Advanced Editing Capabilities**
  - Real-time quiz title modification
  - Question editing and refinement tools
  - Hierarchical folder organization system
  - Bulk operations for efficient management

### Flexible Export and Integration Options
- **Export Formats**
  - Plain text format for easy sharing
  - Moodle GIFT format for LMS integration
  - PDF export with professional formatting
- **System Integration**
  - Compatible with military learning management systems
  - Secure data handling for educational institutions

### Administrative Features
- **Multi-level User Management**: Admin, School Admin, and Teacher roles
- **School Management**: Support for multiple educational units
- **Analytics Dashboard**: Comprehensive usage statistics and insights
- **Security Features**: Rate limiting, authentication, and audit logging

## 🚀 Technical Architecture

### Frontend Stack
- **Framework**: React.js 19.0.0 with modern hooks and context
- **UI Framework**: Bootstrap 5.3.3 with React Bootstrap 2.10.9
- **State Management**: React Context API with custom providers
- **Routing**: React Router DOM 6.30.0 for SPA navigation
- **Icons**: Bootstrap Icons and React Icons 5.5.0
- **Additional Libraries**: 
  - Axios 1.8.3 for API communication
  - jsPDF 2.5.1 for document generation
  - React Markdown 9.0.1 for content rendering
  - Lodash 4.17.21 for utility functions

### Backend Stack
- **Runtime**: Bun.js for high-performance JavaScript execution
- **Web Framework**: Express.js with comprehensive middleware
- **Database**: MySQL 8.0+ with connection pooling
- **AI Integration**: Google Gemini AI for intelligent quiz generation
- **Authentication**: JWT-based secure authentication system
- **File Handling**: Multer for profile image uploads
- **Logging**: Winston for comprehensive application logging

### DevOps and Infrastructure
- **Security Middleware**: Rate limiting, CORS, security headers
- **Caching**: Redis-based caching for improved performance
- **Email Service**: Automated email notifications for user management
- **Environment Management**: Comprehensive configuration management
- **Error Handling**: Centralized error handling and monitoring

## 🏗️ Detailed Project Structure

```
signal-school-quiz-generator/
├── backend/                              # Node.js/Bun.js Backend
│   ├── src/
│   │   ├── config/                       # Database and app configuration
│   │   │   └── db.js
│   │   ├── controllers/                  # Business logic controllers
│   │   │   ├── adminController.js        # System administration
│   │   │   ├── authController.js         # Authentication management
│   │   │   ├── dashboardController.js    # Dashboard analytics
│   │   │   ├── exportController.js       # Quiz export functionality
│   │   │   ├── quizController.js         # Quiz CRUD operations
│   │   │   ├── schoolAdminController.js  # School management
│   │   │   ├── schoolController.js       # School operations
│   │   │   └── userController.js         # User management
│   │   ├── middlewares/                  # Express middleware
│   │   │   ├── auth.js                   # JWT authentication
│   │   │   ├── cacheMiddleware.js        # Caching layer
│   │   │   ├── rateLimiter.js           # API rate limiting
│   │   │   └── security.js               # Security headers
│   │   ├── models/                       # Data models
│   │   │   └── quiz.js
│   │   ├── routes/                       # API route definitions
│   │   │   ├── adminRoutes.js
│   │   │   ├── authRoutes.js
│   │   │   ├── dashboardRoutes.js
│   │   │   ├── quizRoutes.js
│   │   │   ├── schoolRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── services/                     # Business logic services
│   │   │   ├── aiService.js              # Google Gemini integration
│   │   │   ├── authService.js            # Authentication logic
│   │   │   ├── cacheService.js           # Caching management
│   │   │   ├── dbService.js              # Database operations
│   │   │   ├── exportService.js          # Export functionality
│   │   │   └── quizService.js            # Quiz business logic
│   │   └── utils/                        # Utility functions
│   │       ├── emailService.js           # Email notifications
│   │       ├── logger.js                 # Application logging
│   │       └── validator.js              # Input validation
│   ├── logs/                             # Application logs
│   ├── uploads/                          # File upload storage
│   └── package.json
├── frontend/                             # React.js Frontend
│   ├── public/
│   │   ├── index.html
│   │   ├── logo.png
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/                    # Admin panel components
│   │   │   ├── auth/                     # Authentication components
│   │   │   ├── library/                  # Quiz library management
│   │   │   └── modals/                   # Modal components
│   │   ├── pages/                        # Page components
│   │   ├── services/                     # API service calls
│   │   └── assets/                       # Static assets
│   └── package.json
├── database.sql                          # Database schema
└── README.md
```

## 🔧 System Requirements

### Development Environment
- **Node.js**: v18+ (recommended v20+)
- **Bun Runtime**: v1.0+ for backend execution
- **MySQL**: v8.0+ with InnoDB engine
- **Google Gemini API**: Valid API key for AI integration
- **Redis**: v6.0+ for caching (optional but recommended)

### Production Environment
- **Server**: Linux-based server (Ubuntu 20.04+ recommended)
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: 50GB+ SSD storage
- **Network**: Stable internet connection for AI API calls

## 📦 Installation and Setup

### Prerequisites
```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Verify installations
node --version
bun --version
mysql --version
```

### Quick Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/signal-school-quiz-generator.git
cd signal-school-quiz-generator

# Backend Setup
cd backend
bun install
cp .env.example .env

# Configure environment variables (see Configuration section)
# Start backend development server
bun run dev

# Frontend Setup (new terminal)
cd ../frontend
npm install
npm start
```

### Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE signal_quiz_generator;
USE signal_quiz_generator;
SOURCE ../database.sql;

# Create initial admin user
cd backend
node src/utils/create-admin.js
```

## 🔐 Configuration

### Environment Variables (.env)
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_database_username
DB_PASSWORD=your_secure_password
DB_NAME=signal_quiz_generator

# AI Configuration
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key
JWT_EXPIRE=7d

# Email Configuration (optional)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email_username
SMTP_PASS=your_email_password

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd ../backend
NODE_ENV=production bun start
```

### Docker Deployment (Optional)
```bash
# Build and run with Docker
docker-compose up -d
```

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm test                    # Run unit tests
npm run test:coverage      # Run with coverage report
```

### Backend Testing
```bash
cd backend
bun test                   # Run backend tests
```

## 🔮 Roadmap and Future Enhancements

### Phase 1 (Current)
- ✅ AI-powered quiz generation
- ✅ Multi-user authentication system
- ✅ Basic quiz management
- ✅ Export functionality

### Phase 2 (In Development)
- 🔄 Advanced analytics dashboard
- 🔄 Bulk quiz operations
- 🔄 Enhanced AI question types
- 🔄 Mobile responsive improvements

### Phase 3 (Planned)
- 📋 Integration with military LMS systems
- 📋 Advanced collaboration features
- 📋 Comprehensive reporting system
- 📋 Multi-language expansion beyond Thai/English
- 📋 Automated quiz scheduling
- 📋 Student performance analytics

## 👨‍💻 Development Team

**Full-Stack Developer & DevOps Engineer**
- Signal School, Signal Department, Royal Thai Army
- Specialization: AI, IT, Computer Science Education
- Focus: Educational Technology Innovation for Military Institutions

### Technical Expertise
- **Frontend**: React.js, Modern JavaScript, Responsive Design
- **Backend**: Node.js/Bun.js, Express.js, RESTful APIs
- **Database**: MySQL, Database Design and Optimization
- **DevOps**: CI/CD, Server Management, Security Implementation
- **AI Integration**: Google Gemini AI, Natural Language Processing

## 🤝 Contributing

Contributions to improve the Signal School Quiz Generator are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Standards
- Follow JavaScript ES6+ standards
- Implement comprehensive error handling
- Add appropriate logging for debugging
- Ensure security best practices
- Test all new features thoroughly

## 📄 License

This project is developed for Signal School, Signal Department, Royal Thai Army. All rights reserved. The software is intended for educational purposes within military academic institutions.

## 🛡️ Security

This application handles sensitive educational data. Security measures implemented:
- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure headers and CORS configuration
- Audit logging for administrative actions

For security concerns or vulnerabilities, please contact the development team directly.

## 📞 Support

For technical support or questions:
- **Internal Support**: Signal School IT Department
- **Development Issues**: Submit via internal ticketing system
- **Feature Requests**: Contact the development team

## 💡 Powered By

- **Artificial Intelligence**: Google Gemini AI
- **Open Source Community**: React.js, Node.js ecosystems
- **Military Educational Innovation**: Signal School initiatives
- **Modern Web Technologies**: Progressive Web App capabilities

---

**Made with 🇹🇭 for Signal School Excellence in Military Education**

*โรงเรียนทหารสื่อสาร กรมการทหารสื่อสาร*