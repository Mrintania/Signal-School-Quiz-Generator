import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add these optimizations
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10 seconds
  // Add connection timeout
  connectTimeout: 10000, // 10 seconds
  // Add retry strategy
  maxRetries: 3,
  retryDelay: 1000
});

// Implement a more robust connection testing function
const testConnection = async () => {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      const connection = await pool.getConnection();
      console.log('Database connection established successfully.');
      connection.release();
      return true;
    } catch (error) {
      attempts++;
      console.error(`Database connection attempt ${attempts} failed:`, error);
      
      if (attempts >= maxAttempts) {
        console.error('Maximum connection attempts reached. Database connection failed.');
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

export { pool, testConnection };