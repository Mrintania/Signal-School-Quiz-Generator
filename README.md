# Signal School Quiz Generator: AI-Powered Quiz Creation Platform

## 🌟 Project Overview

Signal School Quiz Generator is an innovative web application designed to empower educators by leveraging artificial intelligence to create high-quality, customizable quizzes quickly and efficiently. The platform supports multiple question types, language options, and provides a comprehensive quiz management system.

## ✨ Key Features

- 🤖 **AI-Powered Quiz Generation**: Create professional quizzes instantly using advanced AI technology
- 🌐 **Multilingual Support**: Generate quizzes in both English and Thai
- 📝 **Multiple Question Types**: 
  - Multiple Choice Quizzes
  - Essay-style Quizzes
- 📚 **Comprehensive Quiz Management**:
  - Save and organize quizzes
  - Edit quiz titles
  - Export quizzes to various formats
- 🎛️ **Customization Options**:
  - Set difficulty levels
  - Specify student levels
  - Add custom instructions
- 🔄 **Dynamic Question Generation**: 
  - Generate additional questions for existing quizzes
  - Avoid duplicate questions
- 📤 **Export Capabilities**:
  - Export to plain text
  - Export to Moodle GIFT format

## 🖥️ Technology Stack

### Frontend
- React.js
- React Router
- Bootstrap/React-Bootstrap
- Axios for API communication

### Backend
- Bun Runtime
- Express.js
- MySQL Database
- Google Gemini AI API

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or newer)
- Bun Runtime (v1.0 or newer)
- MySQL
- Google Gemini API Key

### Installation Steps

1. Clone the repository
```bash
git clone https://github.com/yourusername/signal-school-quiz-generator.git
cd signal-school-quiz-generator
```

2. Set up Backend
```bash
cd backend
bun install
cp .env.example .env
# Configure .env with your database and API credentials
bun start
```

3. Set up Frontend
```bash
cd ../frontend
npm install
npm start
```

4. Database Setup
- Open XAMPP or your MySQL management tool
- Create a database named `quiz_generator`
- Import the database schema from `database/database.sql`

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory with the following configurations:
```
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=quiz_generator

# Google Gemini Configuration
GOOGLE_GEMINI_API_KEY=your_api_key

# Server Configuration
PORT=5000
```

## 📋 Project Structure

```
signal-school-quiz-generator/
├── backend/
│   ├── src/
│   │   ├── config/     # Database configuration
│   │   ├── controllers/# Request handlers
│   │   ├── models/     # Data models
│   │   └── routes/     # API route definitions
│   └── index.js        # Server entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/ # Reusable React components
│   │   ├── context/    # React context providers
│   │   ├── pages/      # Page components
│   │   ├── services/   # API service methods
│   │   └── translations/ # Multilingual support
│   └── public/         # Static assets
│
└── database/
    └── database.sql    # Database schema
```

## 🔮 Future Roadmap

1. User Authentication System
2. Advanced Quiz Sharing Capabilities
3. Online Exam Platform Integration
4. Comprehensive Student Performance Analytics
5. Content Import from Documents
6. Additional Language Support

## 👨‍💻 About the Developer

**Sgt. Pornsupat Vutisuwan**
- Main Developer and Creator of Signal School Quiz Generator

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🆘 Support and Feedback

Found a bug? Have a suggestion? Please open an issue on our GitHub repository.

## 💡 Powered By
- Artificial Intelligence
- Open-source Community
- Passion for Educational Technology