// backend/src/services/dbService.js
import { pool, getConnection } from '../config/db.js';
import { logger } from '../utils/logger.js';
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
     * @returns {Promise<number>} Inserted ID
     */
    static async insert(table, data) {
        return this.withConnection(async (connection) => {
            const columns = Object.keys(data);
            const placeholders = columns.map(() => '?').join(', ');
            const values = Object.values(data);

            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

            const [result] = await connection.execute(sql, values);
            return result.insertId;
        });
    }

    /**
     * Insert multiple records in a transaction
     * @param {string} table - Table name
     * @param {Array<Object>} records - Array of records to insert
     * @returns {Promise<Array<number>>} Array of inserted IDs
     */
    static async batchInsert(table, records) {
        if (!records || records.length === 0) {
            return [];
        }

        return this.withTransaction(async (connection) => {
            const insertedIds = [];

            for (const record of records) {
                const columns = Object.keys(record);
                const placeholders = columns.map(() => '?').join(', ');
                const values = Object.values(record);

                const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

                const [result] = await connection.execute(sql, values);
                insertedIds.push(result.insertId);
            }

            return insertedIds;
        });
    }

    /**
     * Update a record
     * @param {string} table - Table name
     * @param {Object} data - Data to update
     * @param {Object} where - Where condition
     * @returns {Promise<number>} Number of affected rows
     */
    static async update(table, data, where) {
        return this.withConnection(async (connection) => {
            const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
            const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

            const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
            const values = [...Object.values(data), ...Object.values(where)];

            const [result] = await connection.execute(sql, values);
            return result.affectedRows;
        });
    }

    /**
     * Update multiple records with different values in a transaction
     * @param {string} table - Table name
     * @param {Array<Object>} updates - Array of {data, where} objects
     * @returns {Promise<number>} Total number of affected rows
     */
    static async batchUpdate(table, updates) {
        if (!updates || updates.length === 0) {
            return 0;
        }

        return this.withTransaction(async (connection) => {
            let totalAffectedRows = 0;

            for (const { data, where } of updates) {
                const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
                const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

                const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
                const values = [...Object.values(data), ...Object.values(where)];

                const [result] = await connection.execute(sql, values);
                totalAffectedRows += result.affectedRows;
            }

            return totalAffectedRows;
        });
    }

    /**
     * Delete records
     * @param {string} table - Table name
     * @param {Object} where - Where condition
     * @returns {Promise<number>} Number of affected rows
     */
    static async delete(table, where) {
        return this.withConnection(async (connection) => {
            const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

            const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
            const values = Object.values(where);

            const [result] = await connection.execute(sql, values);
            return result.affectedRows;
        });
    }

    /**
     * Delete multiple records in a transaction
     * @param {string} table - Table name
     * @param {Array<Object>} conditions - Array of where conditions
     * @returns {Promise<number>} Total number of affected rows
     */
    static async batchDelete(table, conditions) {
        if (!conditions || conditions.length === 0) {
            return 0;
        }

        return this.withTransaction(async (connection) => {
            let totalAffectedRows = 0;

            for (const where of conditions) {
                const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

                const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
                const values = Object.values(where);

                const [result] = await connection.execute(sql, values);
                totalAffectedRows += result.affectedRows;
            }

            return totalAffectedRows;
        });
    }

    /**
     * Execute batch operations in a single transaction
     * @param {Array<Function>} operations - Array of functions that perform database operations
     * @returns {Promise<Array>} Results of operations
     */
    static async batch(operations) {
        return this.withTransaction(async (connection) => {
            const results = [];
            for (const operation of operations) {
                results.push(await operation(connection));
            }
            return results;
        });
    }

    /**
     * Check if a record exists
     * @param {string} table - Table name
     * @param {Object} where - Where condition
     * @returns {Promise<boolean>} True if exists
     */
    static async exists(table, where) {
        return this.withConnection(async (connection) => {
            const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

            const sql = `SELECT 1 FROM ${table} WHERE ${whereClause} LIMIT 1`;
            const values = Object.values(where);

            const [results] = await connection.execute(sql, values);
            return results.length > 0;
        });
    }

    /**
     * Count records
     * @param {string} table - Table name
     * @param {Object} where - Where condition (optional)
     * @returns {Promise<number>} Count of records
     */
    static async count(table, where = null) {
        return this.withConnection(async (connection) => {
            let sql = `SELECT COUNT(*) as count FROM ${table}`;
            const values = [];

            if (where) {
                const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
                sql += ` WHERE ${whereClause}`;
                values.push(...Object.values(where));
            }

            const [results] = await connection.execute(sql, values);
            return results[0].count;
        });
    }

    /**
     * Get records with pagination
     * @param {string} table - Table name
     * @param {Object} options - Query options
     * @param {Object} options.where - Where conditions (optional)
     * @param {string} options.orderBy - Order by clause (optional)
     * @param {number} options.limit - Limit (optional)
     * @param {number} options.offset - Offset (optional)
     * @returns {Promise<Object>} Query results with pagination info
     */
    static async paginate(table, options = {}) {
        const {
            where = null,
            orderBy = 'id DESC',
            limit = 100,
            offset = 0,
            select = '*'
        } = options;

        // Build WHERE clause
        let whereClause = '';
        const values = [];

        if (where) {
            const conditions = [];

            for (const [key, value] of Object.entries(where)) {
                // Handle different operators
                if (value === null) {
                    conditions.push(`${key} IS NULL`);
                } else if (Array.isArray(value)) {
                    // Handle IN operator
                    if (value.length > 0) {
                        conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
                        values.push(...value);
                    } else {
                        // Empty array means no matches
                        conditions.push('FALSE');
                    }
                } else if (typeof value === 'object') {
                    // Handle operators like >, <, >=, <=, LIKE
                    for (const [operator, operand] of Object.entries(value)) {
                        switch (operator) {
                            case 'gt':
                                conditions.push(`${key} > ?`);
                                values.push(operand);
                                break;
                            case 'lt':
                                conditions.push(`${key} < ?`);
                                values.push(operand);
                                break;
                            case 'gte':
                                conditions.push(`${key} >= ?`);
                                values.push(operand);
                                break;
                            case 'lte':
                                conditions.push(`${key} <= ?`);
                                values.push(operand);
                                break;
                            case 'like':
                                conditions.push(`${key} LIKE ?`);
                                values.push(`%${operand}%`);
                                break;
                            case 'startsWith':
                                conditions.push(`${key} LIKE ?`);
                                values.push(`${operand}%`);
                                break;
                            case 'endsWith':
                                conditions.push(`${key} LIKE ?`);
                                values.push(`%${operand}`);
                                break;
                            case 'ne':
                                if (operand === null) {
                                    conditions.push(`${key} IS NOT NULL`);
                                } else {
                                    conditions.push(`${key} != ?`);
                                    values.push(operand);
                                }
                                break;
                            default:
                                // Unknown operator, treat as equality
                                conditions.push(`${key} = ?`);
                                values.push(operand);
                        }
                    }
                } else {
                    // Simple equality
                    conditions.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (conditions.length > 0) {
                whereClause = `WHERE ${conditions.join(' AND ')}`;
            }
        }

        // Execute count query
        const countSql = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
        const countResult = await this.queryOne(countSql, [...values]);
        const total = countResult ? countResult.total : 0;

        // Execute data query with pagination
        const dataSql = `SELECT ${select} FROM ${table} ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
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
     * Execute a join query with pagination
     * @param {Object} options - Query options
     * @param {string} options.table - Main table
     * @param {Array<Object>} options.joins - Join clauses
     * @param {string} options.select - Select statement
     * @param {Object} options.where - Where conditions (optional)
     * @param {string} options.orderBy - Order by clause (optional)
     * @param {number} options.limit - Limit (optional)
     * @param {number} options.offset - Offset (optional)
     * @returns {Promise<Object>} Query results with pagination info
     */
    static async joinWithPagination(options) {
        const {
            table,
            joins = [],
            select = '*',
            where = null,
            orderBy = `${table}.id DESC`,
            limit = 100,
            offset = 0
        } = options;

        // Build JOIN clauses
        const joinClauses = joins.map(join => {
            const { type = 'INNER', table: joinTable, on } = join;
            return `${type} JOIN ${joinTable} ON ${on}`;
        }).join(' ');

        // Build WHERE clause
        let whereClause = '';
        const values = [];

        if (where) {
            const conditions = [];

            for (const [key, value] of Object.entries(where)) {
                if (value === null) {
                    conditions.push(`${key} IS NULL`);
                } else if (Array.isArray(value)) {
                    if (value.length > 0) {
                        conditions.push(`${key} IN (${value.map(() => '?').join(', ')})`);
                        values.push(...value);
                    } else {
                        conditions.push('FALSE');
                    }
                } else if (typeof value === 'object') {
                    for (const [operator, operand] of Object.entries(value)) {
                        switch (operator) {
                            case 'gt':
                                conditions.push(`${key} > ?`);
                                values.push(operand);
                                break;
                            case 'lt':
                                conditions.push(`${key} < ?`);
                                values.push(operand);
                                break;
                            case 'gte':
                                conditions.push(`${key} >= ?`);
                                values.push(operand);
                                break;
                            case 'lte':
                                conditions.push(`${key} <= ?`);
                                values.push(operand);
                                break;
                            case 'like':
                                conditions.push(`${key} LIKE ?`);
                                values.push(`%${operand}%`);
                                break;
                            case 'ne':
                                if (operand === null) {
                                    conditions.push(`${key} IS NOT NULL`);
                                } else {
                                    conditions.push(`${key} != ?`);
                                    values.push(operand);
                                }
                                break;
                            default:
                                conditions.push(`${key} = ?`);
                                values.push(operand);
                        }
                    }
                } else {
                    conditions.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (conditions.length > 0) {
                whereClause = `WHERE ${conditions.join(' AND ')}`;
            }
        }

        // Build base query parts
        const baseFrom = `FROM ${table} ${joinClauses}`;
        const baseWhere = whereClause;

        // Execute count query
        const countSql = `SELECT COUNT(DISTINCT ${table}.id) as total ${baseFrom} ${baseWhere}`;
        const countResult = await this.queryOne(countSql, [...values]);
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
     * Get database size information
     * @returns {Promise<Object>} Database size information
     */
    static async getDatabaseSize() {
        const databaseName = configService.get('database.name');

        const sql = `
      SELECT 
        SUM(data_length) as dataSize,
        SUM(index_length) as indexSize,
        SUM(data_length + index_length) as totalSize
      FROM 
        information_schema.tables
      WHERE 
        table_schema = ?
    `;

        const result = await this.queryOne(sql, [databaseName]);

        return {
            dataSize: result.dataSize || 0,
            indexSize: result.indexSize || 0,
            totalSize: result.totalSize || 0,
            dataSizeMB: Math.round((result.dataSize || 0) / (1024 * 1024) * 100) / 100,
            indexSizeMB: Math.round((result.indexSize || 0) / (1024 * 1024) * 100) / 100,
            totalSizeMB: Math.round((result.totalSize || 0) / (1024 * 1024) * 100) / 100
        };
    }

    /**
     * Get connection pool status
     * @returns {Promise<Object>} Connection pool status
     */
    static async getPoolStatus() {
        // This is a custom implementation for MySQL2
        // The actual implementation might vary depending on the connection pool library
        try {
            // Get pool status using internal properties (might break with library updates)
            // For production use, it's better to use a monitoring solution or APM tool
            const poolStats = {
                connections: pool.pool ? pool.pool._allConnections.length : 0,
                idle: pool.pool ? pool.pool._freeConnections.length : 0,
                connectionLimit: configService.get('database.connectionLimit', 10)
            };

            poolStats.active = poolStats.connections - poolStats.idle;
            poolStats.usagePercent = Math.round((poolStats.active / poolStats.connectionLimit) * 100);

            return poolStats;
        } catch (error) {
            logger.error('Error getting pool status:', error);
            return {
                connections: -1,
                idle: -1,
                active: -1,
                connectionLimit: configService.get('database.connectionLimit', 10),
                usagePercent: -1,
                error: error.message
            };
        }
    }
}

export default DBService;