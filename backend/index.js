import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import quizRoutes from './src/routes/quizRoutes.js';
import { testConnection } from './src/config/db.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
testConnection();

// Routes
app.use('/api/quizzes', quizRoutes);

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Quiz Generator API' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});