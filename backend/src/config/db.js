// backend/src/config/db.js
import mysql from 'mysql2/promise';
import configService from '../services/configService.js';
import { logger } from '../utils/logger.js';

/**
 * Enhanced database configuration with connection monitoring
 */
class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.connectionErrors = 0;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
    this.healthCheck = null;

    // Initialize connection
    this.initialize();
  }

  /**
   * Initialize the database connection pool
   */
  initialize() {
    try {
      const dbConfig = configService.get('database');

      // Create connection pool
      this.pool = mysql.createPool({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.name,
        waitForConnections: true,
        connectionLimit: dbConfig.connectionLimit,
        queueLimit: dbConfig.queueLimit,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000, // 10 seconds
        timezone: '+00:00' // UTC
      });

      logger.info('Database connection pool initialized');

      // Setup connection monitoring
      this.setupConnectionMonitoring();

      // Test connection
      this.testConnection();
    } catch (error) {
      logger.error('Failed to initialize database connection pool:', error);
      this.isConnected = false;

      // Schedule reconnection attempt
      this.scheduleReconnect();
    }
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    // Clear any existing health check interval
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
    }

    // Set up new health check interval
    this.healthCheck = setInterval(async () => {
      try {
        await this.testConnection(false);
      } catch (error) {
        logger.error('Database health check failed:', error);

        // If connection is lost, attempt to reconnect
        if (this.isConnected) {
          this.isConnected = false;
          this.scheduleReconnect();
        }
      }
    }, 30000); // Check every 30 seconds

    // Clean up on process exit
    process.on('exit', () => {
      this.cleanup();
    });

    // Handle process termination signals
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Test database connection
   * @param {boolean} logSuccess - Whether to log successful connection
   * @returns {Promise<boolean>} Connection success
   */
  async testConnection(logSuccess = true) {
    try {
      const connection = await this.pool.getConnection();

      // Execute a simple query to verify connection
      await connection.execute('SELECT 1 AS connection_test');

      // Release the connection back to the pool
      connection.release();

      // Update connection status
      if (!this.isConnected) {
        this.isConnected = true;
        this.connectionErrors = 0;
        this.reconnectAttempts = 0;

        if (logSuccess) {
          logger.info('Database connection established successfully');
        }
      }

      return true;
    } catch (error) {
      this.isConnected = false;
      this.connectionErrors++;

      logger.error(`Database connection test failed (Error #${this.connectionErrors}):`, error);

      throw error;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;

    // Calculate exponential backoff delay with jitter
    const delay = Math.min(
      30000, // max 30 seconds
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1) * (1 + Math.random() * 0.2)
    );

    logger.info(`Scheduling database reconnection attempt #${this.reconnectAttempts} in ${Math.round(delay / 1000)} seconds`);

    setTimeout(() => {
      this.initialize();
    }, delay);
  }

  /**
   * Clean up resources on shutdown
   */
  cleanup() {
    logger.info('Closing database connection pool');

    // Clear health check interval
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
      this.healthCheck = null;
    }

    // Close connection pool if it exists
    if (this.pool) {
      this.pool.end().catch(err => {
        logger.error('Error closing database connection pool:', err);
      });
    }
  }

  /**
   * Get the connection pool
   * @returns {Object} MySQL connection pool
   */
  getPool() {
    return this.pool;
  }

  /**
   * Execute a query using a connection from the pool
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(sql, params = []) {
    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      logger.error('Database query error:', error);
      logger.error('Query:', sql);
      logger.error('Parameters:', params);
      throw error;
    }
  }

  /**
   * Get a new connection from the pool
   * @returns {Promise<Object>} Database connection
   */
  async getConnection() {
    try {
      return await this.pool.getConnection();
    } catch (error) {
      logger.error('Error getting database connection:', error);
      throw error;
    }
  }
}

// Create singleton instance
const database = new Database();

// Export the database instance and convenience methods
export const pool = database.getPool();
export const testConnection = () => database.testConnection();
export const dbQuery = (sql, params) => database.query(sql, params);
export const getConnection = () => database.getConnection();

export default database;