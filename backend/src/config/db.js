// backend/src/config/db.js
import mysql from 'mysql2/promise';
import configService from '../services/configService.js';
import logger from '../utils/common/Logger.js'; // ใช้ default import แทน

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
   */
  async testConnection(logSuccess = true) {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      if (!this.isConnected || logSuccess) {
        logger.info('Database connection successful');
        this.isConnected = true;
        this.connectionErrors = 0;
        this.reconnectAttempts = 0;
      }

      return true;
    } catch (error) {
      this.isConnected = false;
      this.connectionErrors++;
      logger.error(`Database connection failed (attempt ${this.connectionErrors}):`, error);
      throw error;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    logger.info(`Scheduling database reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        logger.info(`Attempting database reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        await this.testConnection();
        logger.info('Database reconnection successful');
      } catch (error) {
        logger.error('Database reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Get a connection from the pool
   * @returns {Promise<Connection>} Database connection
   */
  async getConnection() {
    if (!this.isConnected) {
      throw new Error('Database is not connected');
    }

    try {
      return await this.pool.getConnection();
    } catch (error) {
      logger.error('Failed to get database connection:', error);
      this.isConnected = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Execute a query directly on the pool
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database is not connected');
    }

    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      logger.error('Database query error:', error);
      logger.error('SQL:', sql);
      logger.error('Parameters:', params);
      throw error;
    }
  }

  /**
   * Close the database connection pool
   */
  async close() {
    try {
      if (this.healthCheck) {
        clearInterval(this.healthCheck);
        this.healthCheck = null;
      }

      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      this.isConnected = false;
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection pool:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.healthCheck) {
      clearInterval(this.healthCheck);
      this.healthCheck = null;
    }

    if (this.pool) {
      this.pool.end().catch(error => {
        logger.error('Error during database cleanup:', error);
      });
    }
  }

  /**
   * Get connection pool statistics
   * @returns {Object} Pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        queuedRequests: 0
      };
    }

    return {
      totalConnections: this.pool.pool.allConnections.length,
      activeConnections: this.pool.pool.busyConnections.length,
      idleConnections: this.pool.pool.freeConnections.length,
      queuedRequests: this.pool.pool.acquiringConnections.length
    };
  }

  /**
   * Get database connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      connectionErrors: this.connectionErrors,
      reconnectAttempts: this.reconnectAttempts,
      poolStats: this.getPoolStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Force reconnection
   */
  async forceReconnect() {
    logger.info('Forcing database reconnection...');

    try {
      await this.close();
      this.reconnectAttempts = 0;
      this.connectionErrors = 0;
      this.initialize();
      await this.testConnection();
      logger.info('Forced database reconnection successful');
    } catch (error) {
      logger.error('Forced database reconnection failed:', error);
      throw error;
    }
  }

  /**
   * Connect to database (alias for initialize for compatibility)
   */
  async connect() {
    if (!this.isConnected) {
      this.initialize();
      await this.testConnection();
    }
    return this;
  }

  /**
   * Disconnect from database (alias for close for compatibility)
   */
  async disconnect() {
    return this.close();
  }
}

// Create singleton instance
const database = new Database();

// Export both the instance methods and the pool for backward compatibility
export default database;
export { database };

// Export getConnection function for direct use
export const getConnection = () => database.getConnection();

// Export pool for direct queries (backward compatibility)
export const pool = database.pool;