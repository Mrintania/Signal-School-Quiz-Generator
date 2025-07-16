// backend/src/repositories/base/BaseRepository.js
import db from '../../config/db.js';
import logger from '../../utils/common/Logger.js';
import { DatabaseError, NotFoundError, ValidationError } from '../../errors/CustomErrors.js';

/**
 * Base Repository Class
 * ใช้เป็น parent class สำหรับ repository ทั้งหมด
 * จัดการ common database operations และ error handling
 */
export default class BaseRepository {
    constructor(tableName, primaryKey = 'id') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
        this.db = db;
    }

    /**
     * Execute query with error handling
     */
    async executeQuery(query, params = []) {
        const timer = logger.startTimer(`db-query-${this.tableName}`);

        try {
            logger.database('execute', this.tableName, {
                query: query.substring(0, 100) + '...',
                paramCount: params.length
            });

            const [results] = await this.db.execute(query, params);

            logger.database('success', this.tableName, {
                rowCount: Array.isArray(results) ? results.length : 1,
                duration: timer.end()
            });

            return results;
        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'executeQuery',
                table: this.tableName,
                query: query.substring(0, 200),
                params: params.slice(0, 5) // Limit params for security
            });

            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find record by ID
     */
    async findById(id) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
            const results = await this.executeQuery(query, [id]);

            return results.length > 0 ? results[0] : null;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find multiple records by IDs
     */
    async findByIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return [];
        }

        try {
            const placeholders = ids.map(() => '?').join(',');
            const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} IN (${placeholders})`;

            return await this.executeQuery(query, ids);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find records with conditions
     */
    async findWhere(conditions = {}, options = {}) {
        try {
            const {
                orderBy = this.primaryKey,
                orderDirection = 'DESC',
                limit = null,
                offset = 0
            } = options;

            let query = `SELECT * FROM ${this.tableName}`;
            const params = [];

            // Build WHERE clause
            if (Object.keys(conditions).length > 0) {
                const whereClause = this.buildWhereClause(conditions, params);
                query += ` WHERE ${whereClause}`;
            }

            // Add ORDER BY
            query += ` ORDER BY ${orderBy} ${orderDirection}`;

            // Add LIMIT and OFFSET
            if (limit) {
                query += ` LIMIT ${limit}`;
                if (offset > 0) {
                    query += ` OFFSET ${offset}`;
                }
            }

            return await this.executeQuery(query, params);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Count records with conditions
     */
    async count(conditions = {}) {
        try {
            let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
            const params = [];

            if (Object.keys(conditions).length > 0) {
                const whereClause = this.buildWhereClause(conditions, params);
                query += ` WHERE ${whereClause}`;
            }

            const results = await this.executeQuery(query, params);
            return results[0].total;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Create new record
     */
    async create(data) {
        try {
            const fields = Object.keys(data);
            const values = Object.values(data);
            const placeholders = fields.map(() => '?').join(',');

            const query = `
                INSERT INTO ${this.tableName} (${fields.join(',')})
                VALUES (${placeholders})
            `;

            const result = await this.executeQuery(query, values);

            // Return created record
            return await this.findById(result.insertId);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Update record by ID
     */
    async update(id, data) {
        try {
            const fields = Object.keys(data);
            const values = Object.values(data);

            if (fields.length === 0) {
                throw new ValidationError('No data provided for update');
            }

            const setClause = fields.map(field => `${field} = ?`).join(',');
            const query = `
                UPDATE ${this.tableName} 
                SET ${setClause}, updated_at = NOW()
                WHERE ${this.primaryKey} = ?
            `;

            const result = await this.executeQuery(query, [...values, id]);

            if (result.affectedRows === 0) {
                throw new NotFoundError(`Record with ${this.primaryKey} ${id} not found`);
            }

            // Return updated record
            return await this.findById(id);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Delete record by ID
     */
    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
            const result = await this.executeQuery(query, [id]);

            if (result.affectedRows === 0) {
                throw new NotFoundError(`Record with ${this.primaryKey} ${id} not found`);
            }

            return { deleted: true, id };
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Soft delete (if table has deleted_at column)
     */
    async softDelete(id) {
        try {
            const query = `
                UPDATE ${this.tableName} 
                SET deleted_at = NOW(), updated_at = NOW()
                WHERE ${this.primaryKey} = ? AND deleted_at IS NULL
            `;

            const result = await this.executeQuery(query, [id]);

            if (result.affectedRows === 0) {
                throw new NotFoundError(`Record with ${this.primaryKey} ${id} not found or already deleted`);
            }

            return { deleted: true, id };
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Bulk insert
     */
    async bulkCreate(records) {
        if (!Array.isArray(records) || records.length === 0) {
            return [];
        }

        try {
            const fields = Object.keys(records[0]);
            const placeholders = fields.map(() => '?').join(',');
            const valueClause = records.map(() => `(${placeholders})`).join(',');

            const query = `
                INSERT INTO ${this.tableName} (${fields.join(',')})
                VALUES ${valueClause}
            `;

            const flatValues = records.flatMap(record => Object.values(record));

            const result = await this.executeQuery(query, flatValues);

            // Return inserted record IDs
            const insertedIds = [];
            for (let i = 0; i < records.length; i++) {
                insertedIds.push(result.insertId + i);
            }

            return insertedIds;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Begin transaction
     */
    async beginTransaction() {
        try {
            await this.db.execute('START TRANSACTION');
            logger.database('transaction-started', this.tableName);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Commit transaction
     */
    async commit() {
        try {
            await this.db.execute('COMMIT');
            logger.database('transaction-committed', this.tableName);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Rollback transaction
     */
    async rollback() {
        try {
            await this.db.execute('ROLLBACK');
            logger.database('transaction-rolled-back', this.tableName);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Execute within transaction
     */
    async withTransaction(callback) {
        try {
            await this.beginTransaction();

            const result = await callback(this);

            await this.commit();
            return result;
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }

    /**
     * Check if record exists
     */
    async exists(id) {
        try {
            const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = ? LIMIT 1`;
            const results = await this.executeQuery(query, [id]);

            return results.length > 0;
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get paginated results
     */
    async paginate(conditions = {}, pagination = {}) {
        try {
            const { page = 1, limit = 20 } = pagination;
            const offset = (page - 1) * limit;

            // Get total count
            const total = await this.count(conditions);

            // Get records
            const records = await this.findWhere(conditions, {
                ...pagination,
                limit,
                offset
            });

            return {
                data: records,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Search records with LIKE query
     */
    async search(searchFields, searchTerm, options = {}) {
        try {
            if (!searchTerm || searchTerm.trim() === '') {
                return await this.findWhere({}, options);
            }

            let query = `SELECT * FROM ${this.tableName}`;
            const params = [];

            // Build search WHERE clause
            const searchConditions = searchFields.map(field => {
                params.push(`%${searchTerm}%`);
                return `${field} LIKE ?`;
            });

            query += ` WHERE (${searchConditions.join(' OR ')})`;

            // Add additional conditions if provided
            if (options.conditions && Object.keys(options.conditions).length > 0) {
                const additionalWhere = this.buildWhereClause(options.conditions, params);
                query += ` AND (${additionalWhere})`;
            }

            // Add ordering
            const { orderBy = this.primaryKey, orderDirection = 'DESC' } = options;
            query += ` ORDER BY ${orderBy} ${orderDirection}`;

            // Add pagination
            if (options.limit) {
                query += ` LIMIT ${options.limit}`;
                if (options.offset) {
                    query += ` OFFSET ${options.offset}`;
                }
            }

            return await this.executeQuery(query, params);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Build WHERE clause from conditions object
     */
    buildWhereClause(conditions, params) {
        const clauses = [];

        for (const [field, value] of Object.entries(conditions)) {
            if (value === null) {
                clauses.push(`${field} IS NULL`);
            } else if (Array.isArray(value)) {
                const placeholders = value.map(() => '?').join(',');
                clauses.push(`${field} IN (${placeholders})`);
                params.push(...value);
            } else {
                clauses.push(`${field} = ?`);
                params.push(value);
            }
        }

        return clauses.join(' AND ');
    }

    /**
     * Handle database errors
     */
    handleDatabaseError(error) {
        logger.errorWithContext(error, {
            table: this.tableName,
            operation: 'database'
        });

        // Map MySQL errors to custom errors
        switch (error.code) {
            case 'ER_DUP_ENTRY':
                return new ValidationError('Duplicate entry found');
            case 'ER_NO_REFERENCED_ROW':
            case 'ER_ROW_IS_REFERENCED':
                return new ValidationError('Foreign key constraint violation');
            case 'ER_ACCESS_DENIED_ERROR':
                return new DatabaseError('Database access denied');
            case 'ER_TABLE_DOESNT_EXIST':
                return new DatabaseError(`Table ${this.tableName} does not exist`);
            case 'ER_UNKNOWN_COLUMN':
                return new ValidationError('Unknown column in query');
            default:
                return new DatabaseError(error.message || 'Database operation failed');
        }
    }

    /**
     * Raw query execution (use with caution)
     */
    async rawQuery(query, params = []) {
        try {
            logger.database('raw-query', this.tableName, {
                query: query.substring(0, 100) + '...'
            });

            return await this.executeQuery(query, params);
        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }
}