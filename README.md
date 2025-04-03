# Signal School Quiz Generator 🧠📝

## Project Overview

Signal School Quiz Generator is an innovative educational technology platform designed to revolutionize quiz creation for educators by leveraging cutting-edge artificial intelligence. The system empowers teachers to generate high-quality, customizable quizzes instantly, saving time and enhancing the learning experience.

## 🌟 Key Features

### AI-Powered Quiz Generation
- **Instant Quiz Creation**: Generate professional-quality quizzes within seconds
- **Multilingual Support**: Create quizzes in English and Thai
- **Adaptive Content**: Customize quizzes based on student levels and learning objectives

### Comprehensive Quiz Management
- **Multiple Question Types**
  - Multiple Choice Quizzes
  - Essay-style Assessments
- **Advanced Editing Tools**
  - Modify quiz titles
  - Edit and refine questions
  - Organize quizzes into folders

### Flexible Export Options
- Export to plain text
- Moodle GIFT format compatibility
- Flexible file formats for easy sharing and integration

## 🚀 Technical Architecture

### Frontend
- **Framework**: React.js
- **State Management**: React Context
- **UI Components**: Custom components with responsive design
- **API Communication**: Axios

### Backend
- **Runtime**: Bun.js
- **Web Framework**: Express.js
- **Database**: MySQL
- **AI Integration**: Google Gemini AI

### Key Technologies
- Artificial Intelligence
- RESTful API Design
- Multilingual Support
- Secure Authentication
- Responsive Web Design

## 🔧 System Requirements

### Minimum Requirements
- Node.js v16+
- Bun Runtime v1.0+
- MySQL 8.0+
- Google Gemini API Key

## 📦 Installation

### Quick Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/signal-school-quiz-generator.git

# Setup Backend
cd backend
bun install
cp .env.example .env
# Configure environment variables
bun start

# Setup Frontend
cd ../frontend
npm install
npm start
```

## 🔐 Configuration

### Environment Variables
```
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_database_password
DB_NAME=quiz_generator

# AI Configuration
GOOGLE_GEMINI_API_KEY=your_gemini_api_key

# Server Settings
PORT=5000
```

## 🗂️ Project Structure
```
signal-school-quiz-generator/
├── backend/          # Server-side application
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── routes/
├── frontend/         # Client-side application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
└── database/         # Database schema
```

## 🔮 Roadmap

### Upcoming Features
1. Advanced User Collaboration
2. Comprehensive Learning Analytics
3. Enhanced AI Question Generation
4. Multi-language Expansion
5. Integration with Learning Management Systems

## 👨‍💻 About the Developer

**Sgt. Pornsupat Vutisuwan**
- Lead Developer
- Educational Technology Innovator
- Passionate about AI-driven Learning Solutions

## 📄 Licensing

This project is licensed under the MIT License. See the LICENSE file for complete details.

## 🤝 Contributing

Contributions are welcome! Please check our GitHub repository for guidelines on how to contribute to the Signal School Quiz Generator.

## 💡 Powered By
- Cutting-edge Artificial Intelligence
- Open-source Community
- Passion for Educational Innovation

---

**Made with ❤️ for Educators Worldwide**