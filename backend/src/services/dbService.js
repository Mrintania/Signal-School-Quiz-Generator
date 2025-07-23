// backend/src/services/dbService.js
import { pool, getConnection } from '../config/db.js';
import logger from '../utils/common/Logger.js'; // ใช้ default import แทน
import configService from './configService.js';

/**
 * Service for optimized database operations
 */
class DBService {
    /**
     * Execute a database query with automatic connection handling
     * @param {Function} callback - Function that uses the connection
     * @returns {Promise<*>} Result of the callback
     */
    static async withConnection(callback) {
        const connection = await getConnection();
        try {
            return await callback(connection);
        } finally {
            connection.release();
        }
    }

    /**
     * Execute a database transaction with automatic rollback on error
     * @param {Function} callback - Function that uses the connection
     * @returns {Promise<*>} Result of the callback
     */
    static async withTransaction(callback) {
        const connection = await getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Execute a simple query
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    static async query(sql, params = []) {
        try {
            const startTime = Date.now();
            const [results] = await pool.execute(sql, params);

            // Log slow queries for performance monitoring
            const duration = Date.now() - startTime;
            const slowQueryThreshold = configService.get('database.slowQueryThreshold', 1000); // Default: 1 second

            if (duration > slowQueryThreshold) {
                logger.warn(`Slow query (${duration}ms): ${sql}`, { params });
            } else if (configService.isDevelopment() && configService.get('database.logQueries', false)) {
                logger.debug(`Query (${duration}ms): ${sql}`, { params });
            }

            return results;
        } catch (error) {
            logger.error('Database query error:', error);
            logger.error('Query:', sql);
            logger.error('Parameters:', params);
            throw error;
        }
    }

    /**
     * Execute a simple query and return the first result
     * @param {string} sql - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object|null>} First result or null if none
     */
    static async queryOne(sql, params = []) {
        const results = await this.query(sql, params);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Insert a record and return the inserted ID
     * @param {string} table - Table name
     * @param {Object} data - Data to insert
     * @returns {Promise<number>} Inserted record ID
     */
    static async insert(table, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');

        const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
        const [result] = await pool.execute(sql, values);

        return result.insertId;
    }

    /**
     * Update records
     * @param {string} table - Table name
     * @param {Object} data - Data to update
     * @param {Object} where - WHERE conditions
     * @returns {Promise<number>} Number of affected rows
     */
    static async update(table, data, where) {
        const setFields = Object.keys(data).map(field => `${field} = ?`).join(', ');
        const whereFields = Object.keys(where).map(field => `${field} = ?`).join(' AND ');

        const sql = `UPDATE ${table} SET ${setFields} WHERE ${whereFields}`;
        const params = [...Object.values(data), ...Object.values(where)];

        const [result] = await pool.execute(sql, params);
        return result.affectedRows;
    }

    /**
     * Delete records
     * @param {string} table - Table name
     * @param {Object} where - WHERE conditions
     * @returns {Promise<number>} Number of affected rows
     */
    static async delete(table, where) {
        const whereFields = Object.keys(where).map(field => `${field} = ?`).join(' AND ');
        const sql = `DELETE FROM ${table} WHERE ${whereFields}`;

        const [result] = await pool.execute(sql, Object.values(where));
        return result.affectedRows;
    }

    /**
     * Count records
     * @param {string} table - Table name
     * @param {Object} where - WHERE conditions (optional)
     * @returns {Promise<number>} Record count
     */
    static async count(table, where = {}) {
        let sql = `SELECT COUNT(*) as count FROM ${table}`;
        const params = [];

        if (Object.keys(where).length > 0) {
            const whereFields = Object.keys(where).map(field => `${field} = ?`).join(' AND ');
            sql += ` WHERE ${whereFields}`;
            params.push(...Object.values(where));
        }

        const result = await this.queryOne(sql, params);
        return result?.count || 0;
    }

    /**
     * Check if a record exists
     * @param {string} table - Table name
     * @param {Object} where - WHERE conditions
     * @returns {Promise<boolean>} True if record exists
     */
    static async exists(table, where) {
        const count = await this.count(table, where);
        return count > 0;
    }

    /**
     * Get paginated results
     * @param {string} table - Table name
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated results with metadata
     */
    static async paginate(table, options = {}) {
        const {
            select = '*',
            where = {},
            orderBy = 'id DESC',
            limit = 10,
            offset = 0
        } = options;

        // Build base query parts
        let baseWhere = '';
        const values = [];

        if (Object.keys(where).length > 0) {
            baseWhere = 'WHERE ' + Object.keys(where).map(field => `${field} = ?`).join(' AND ');
            values.push(...Object.values(where));
        }

        const baseFrom = `FROM ${table}`;

        // Count total records
        const countSql = `SELECT COUNT(*) as total ${baseFrom} ${baseWhere}`;
        const countResult = await this.queryOne(countSql, values);
        const total = countResult ? countResult.total : 0;

        // Execute data query with pagination
        const dataSql = `SELECT ${select} ${baseFrom} ${baseWhere} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
        const data = await this.query(dataSql, [...values, limit, offset]);

        // Return results with pagination info
        return {
            data,
            pagination: {
                total,
                limit,
                offset,
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Execute a raw SQL query with named parameters
     * @param {string} sql - SQL query with named parameters (e.g., :name)
     * @param {Object} params - Named parameters
     * @returns {Promise<Array>} Query results
     */
    static async rawQuery(sql, params = {}) {
        // Replace named parameters with ? and build values array
        const values = [];
        const processedSql = sql.replace(/:(\w+)/g, (match, paramName) => {
            if (params.hasOwnProperty(paramName)) {
                values.push(params[paramName]);
                return '?';
            }
            return match;
        });

        return this.query(processedSql, values);
    }

    /**
     * Get database tables and their statistics
     * @returns {Promise<Array>} Table statistics
     */
    static async getTableStats() {
        const databaseName = configService.get('database.name');

        const sql = `
      SELECT 
        table_name as tableName,
        table_rows as rowCount,
        data_length as dataSize,
        index_length as indexSize,
        (data_length + index_length) as totalSize,
        create_time as createdAt,
        update_time as updatedAt
      FROM 
        information_schema.tables
      WHERE 
        table_schema = ? 
      ORDER BY 
        table_name
    `;

        return this.query(sql, [databaseName]);
    }

    /**
     * Get table columns information
     * @param {string} tableName - Table name
     * @returns {Promise<Array>} Column information
     */
    static async getTableColumns(tableName) {
        const databaseName = configService.get('database.name');

        const sql = `
      SELECT 
        column_name as name,
        column_type as type,
        is_nullable as nullable,
        column_key as keyType,
        column_default as defaultValue,
        extra
      FROM 
        information_schema.columns
      WHERE 
        table_schema = ? 
        AND table_name = ?
      ORDER BY 
        ordinal_position
    `;

        return this.query(sql, [databaseName, tableName]);
    }

    /**
     * Check database connection health
     * @returns {Promise<Object>} Connection health status
     */
    static async checkHealth() {
        try {
            const startTime = Date.now();
            await this.query('SELECT 1 as ping');
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                responseTime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Database health check failed:', error);
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get database performance metrics
     * @returns {Promise<Object>} Performance metrics
     */
    static async getPerformanceMetrics() {
        try {
            const queries = [
                'SHOW STATUS LIKE "Threads_connected"',
                'SHOW STATUS LIKE "Questions"',
                'SHOW STATUS LIKE "Uptime"',
                'SHOW STATUS LIKE "Slow_queries"'
            ];

            const metrics = {};
            for (const query of queries) {
                const results = await this.query(query);
                results.forEach(row => {
                    metrics[row.Variable_name] = row.Value;
                });
            }

            return metrics;
        } catch (error) {
            logger.error('Failed to get database performance metrics:', error);
            return {};
        }
    }
}

export default DBService;