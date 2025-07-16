import mysql from 'mysql2/promise';
import logger from '../utils/logger.js';

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quiz_generator',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Base Repository Class
 * ใช้เป็น parent class สำหรับ repositories อื่นๆ
 * มี common database operations
 */
export class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.pool = pool;
    }

    /**
     * Execute query with error handling and logging
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async execute(query, params = []) {
        const startTime = Date.now();
        let connection;

        try {
            connection = await this.pool.getConnection();
            logger.logDatabase('EXECUTE', query, params);

            const [results] = await connection.execute(query, params);
            const duration = Date.now() - startTime;

            logger.logPerformance(`DB Query: ${query.split(' ')[0]}`, duration, {
                query: query.substring(0, 100),
                rowCount: Array.isArray(results) ? results.length : 1
            });

            return results;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Database query error:', {
                error: error.message,
                query: query.substring(0, 200),
                params,
                duration: `${duration}ms`
            });
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Find record by ID
     * @param {string|number} id - Record ID
     * @returns {Promise<Object|null>} Found record or null
     */
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = ? LIMIT 1`;
        const results = await this.execute(query, [id]);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Find all records with optional conditions
     * @param {Object} conditions - Where conditions
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>} Found records
     */
    async findAll(conditions = {}, options = {}) {
        let query = `SELECT * FROM ${this.tableName}`;
        const params = [];

        // Add WHERE conditions
        if (Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions)
                .map(key => `${key} = ?`)
                .join(' AND ');
            query += ` WHERE ${whereClause}`;
            params.push(...Object.values(conditions));
        }

        // Add ORDER BY
        if (options.orderBy) {
            query += ` ORDER BY ${options.orderBy}`;
            if (options.orderDirection) {
                query += ` ${options.orderDirection}`;
            }
        }

        // Add LIMIT and OFFSET
        if (options.limit) {
            query += ` LIMIT ?`;
            params.push(options.limit);

            if (options.offset) {
                query += ` OFFSET ?`;
                params.push(options.offset);
            }
        }

        return await this.execute(query, params);
    }

    /**
     * Create new record
     * @param {Object} data - Record data
     * @returns {Promise<Object>} Created record with ID
     */
    async create(data) {
        // Add timestamps
        const now = new Date();
        const recordData = {
            ...data,
            created_at: now,
            updated_at: now
        };

        const fields = Object.keys(recordData);
        const values = Object.values(recordData);
        const placeholders = fields.map(() => '?').join(', ');

        const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')}) 
      VALUES (${placeholders})
    `;

        const result = await this.execute(query, values);

        return {
            id: result.insertId,
            ...recordData
        };
    }

    /**
     * Update record by ID
     * @param {string|number} id - Record ID
     * @param {Object} data - Updated data
     * @returns {Promise<boolean>} Success status
     */
    async update(id, data) {
        // Add updated timestamp
        const updateData = {
            ...data,
            updated_at: new Date()
        };

        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `
      UPDATE ${this.tableName} 
      SET ${setClause}
      WHERE id = ?
    `;

        const result = await this.execute(query, [...values, id]);
        return result.affectedRows > 0;
    }

    /**
     * Soft delete record by ID (set deleted_at timestamp)
     * @param {string|number} id - Record ID
     * @returns {Promise<boolean>} Success status
     */
    async softDelete(id) {
        const query = `
      UPDATE ${this.tableName} 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND deleted_at IS NULL
    `;
        const result = await this.execute(query, [id]);
        return result.affectedRows > 0;
    }

    /**
     * Hard delete record by ID
     * @param {string|number} id - Record ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
        const result = await this.execute(query, [id]);
        return result.affectedRows > 0;
    }

    /**
     * Count records with conditions
     * @param {Object} conditions - Where conditions
     * @returns {Promise<number>} Record count
     */
    async count(conditions = {}) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = [];

        // Exclude soft deleted records by default
        const whereConditions = { ...conditions };
        if (!whereConditions.hasOwnProperty('deleted_at')) {
            whereConditions.deleted_at = null;
        }

        if (Object.keys(whereConditions).length > 0) {
            const whereClause = Object.keys(whereConditions)
                .map(key => {
                    if (whereConditions[key] === null) {
                        return `${key} IS NULL`;
                    }
                    return `${key} = ?`;
                })
                .join(' AND ');

            query += ` WHERE ${whereClause}`;
            params.push(...Object.values(whereConditions).filter(val => val !== null));
        }

        const results = await this.execute(query, params);
        return results[0].count;
    }

    /**
     * Check if record exists
     * @param {Object} conditions - Where conditions
     * @returns {Promise<boolean>} Record exists
     */
    async exists(conditions) {
        const count = await this.count(conditions);
        return count > 0;
    }

    /**
     * Begin transaction
     * @returns {Promise<Object>} Transaction connection
     */
    async beginTransaction() {
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();
        logger.debug('Transaction started');
        return connection;
    }

    /**
     * Commit transaction
     * @param {Object} connection - Transaction connection
     */
    async commitTransaction(connection) {
        await connection.commit();
        connection.release();
        logger.debug('Transaction committed');
    }

    /**
     * Rollback transaction
     * @param {Object} connection - Transaction connection
     */
    async rollbackTransaction(connection) {
        await connection.rollback();
        connection.release();
        logger.debug('Transaction rolled back');
    }

    /**
     * Execute query within transaction
     * @param {Object} connection - Transaction connection
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async executeInTransaction(connection, query, params = []) {
        const startTime = Date.now();

        try {
            logger.logDatabase('TRANSACTION_EXECUTE', query, params);

            const [results] = await connection.execute(query, params);
            const duration = Date.now() - startTime;

            logger.logPerformance(`DB Transaction Query: ${query.split(' ')[0]}`, duration);

            return results;
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Transaction query error:', {
                error: error.message,
                query: query.substring(0, 200),
                params,
                duration: `${duration}ms`
            });
            throw error;
        }
    }

    /**
     * Bulk insert records
     * @param {Array} records - Array of record objects
     * @returns {Promise<Array>} Inserted record IDs
     */
    async bulkInsert(records) {
        if (!records || records.length === 0) {
            return [];
        }

        // Add timestamps to all records
        const now = new Date();
        const recordsWithTimestamps = records.map(record => ({
            ...record,
            created_at: now,
            updated_at: now
        }));

        const fields = Object.keys(recordsWithTimestamps[0]);
        const placeholders = fields.map(() => '?').join(', ');
        const valuesPlaceholder = `(${placeholders})`;
        const allPlaceholders = records.map(() => valuesPlaceholder).join(', ');

        const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')}) 
      VALUES ${allPlaceholders}
    `;

        const allValues = recordsWithTimestamps.flatMap(record =>
            fields.map(field => record[field])
        );

        const result = await this.execute(query, allValues);

        // Generate array of inserted IDs
        const insertedIds = [];
        for (let i = 0; i < records.length; i++) {
            insertedIds.push(result.insertId + i);
        }

        return insertedIds;
    }

    /**
     * Search records with LIKE condition
     * @param {string} column - Column to search
     * @param {string} searchTerm - Search term
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Found records
     */
    async search(column, searchTerm, options = {}) {
        let query = `SELECT * FROM ${this.tableName} WHERE ${column} LIKE ?`;
        const params = [`%${searchTerm}%`];

        // Add additional conditions
        if (options.conditions) {
            const additionalWhere = Object.keys(options.conditions)
                .map(key => `${key} = ?`)
                .join(' AND ');
            query += ` AND ${additionalWhere}`;
            params.push(...Object.values(options.conditions));
        }

        // Add ORDER BY
        if (options.orderBy) {
            query += ` ORDER BY ${options.orderBy}`;
            if (options.orderDirection) {
                query += ` ${options.orderDirection}`;
            }
        }

        // Add LIMIT and OFFSET
        if (options.limit) {
            query += ` LIMIT ?`;
            params.push(options.limit);

            if (options.offset) {
                query += ` OFFSET ?`;
                params.push(options.offset);
            }
        }

        return await this.execute(query, params);
    }

    /**
     * Get database connection for custom queries
     * @returns {Promise<Object>} Database connection
     */
    async getConnection() {
        return await this.pool.getConnection();
    }

    /**
     * Close all connections in pool
     */
    async close() {
        await this.pool.end();
        logger.info('Database connection pool closed');
    }

    /**
     * Health check for database connection
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        try {
            const startTime = Date.now();
            await this.execute('SELECT 1');
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default BaseRepository;

// Export the connection pool for direct use if needed
export { pool as dbPool };