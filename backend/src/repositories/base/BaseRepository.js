import { connection } from '../../config/db.js';
import logger from '../../utils/logger.js';

/**
 * Base Repository Class
 * ใช้เป็น parent class สำหรับ repositories อื่นๆ
 * มี common database operations
 */
export class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
        this.db = connection;
    }

    /**
     * Execute query with error handling
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async execute(query, params = []) {
        try {
            logger.debug('Executing query:', { query, params });
            const [results] = await this.db.execute(query, params);
            return results;
        } catch (error) {
            logger.error('Database query error:', { error, query, params });
            throw error;
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
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');

        const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')}) 
      VALUES (${placeholders})
    `;

        const result = await this.execute(query, values);

        return {
            id: result.insertId,
            ...data
        };
    }

    /**
     * Update record by ID
     * @param {string|number} id - Record ID
     * @param {Object} data - Updated data
     * @returns {Promise<boolean>} Success status
     */
    async update(id, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `
      UPDATE ${this.tableName} 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

        const result = await this.execute(query, [...values, id]);
        return result.affectedRows > 0;
    }

    /**
     * Delete record by ID
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

        if (Object.keys(conditions).length > 0) {
            const whereClause = Object.keys(conditions)
                .map(key => `${key} = ?`)
                .join(' AND ');
            query += ` WHERE ${whereClause}`;
            params.push(...Object.values(conditions));
        }

        const results = await this.execute(query, params);
        return results[0].count;
    }

    /**
     * Begin transaction
     * @returns {Promise<Object>} Transaction connection
     */
    async beginTransaction() {
        const connection = await this.db.getConnection();
        await connection.beginTransaction();
        return connection;
    }

    /**
     * Commit transaction
     * @param {Object} connection - Transaction connection
     */
    async commitTransaction(connection) {
        await connection.commit();
        connection.release();
    }

    /**
     * Rollback transaction
     * @param {Object} connection - Transaction connection
     */
    async rollbackTransaction(connection) {
        await connection.rollback();
        connection.release();
    }
}