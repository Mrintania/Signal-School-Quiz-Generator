// backend/src/repositories/FolderRepository.js
import BaseRepository from './base/BaseRepository.js';
import logger from '../utils/common/Logger.js';
import { NotFoundError, ValidationError, BusinessLogicError } from '../errors/CustomErrors.js';

/**
 * Folder Repository
 * จัดการ data access สำหรับ folders table
 * รองรับการจัดการโฟลเดอร์แบบ hierarchical
 */
export class FolderRepository extends BaseRepository {
    constructor() {
        super('folders', 'id');
    }

    /**
     * Find folder by ID and user ID (for ownership check)
     */
    async findByIdAndUserId(folderId, userId) {
        try {
            const query = `
                SELECT f.*, 
                       COUNT(q.id) as quiz_count,
                       COUNT(sf.id) as subfolder_count
                FROM ${this.tableName} f
                LEFT JOIN quizzes q ON f.id = q.folder_id AND q.deleted_at IS NULL
                LEFT JOIN ${this.tableName} sf ON f.id = sf.parent_id AND sf.deleted_at IS NULL
                WHERE f.id = ? AND f.user_id = ? AND f.deleted_at IS NULL
                GROUP BY f.id
            `;

            const results = await this.executeQuery(query, [folderId, userId]);
            return results.length > 0 ? results[0] : null;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Find all folders for a user
     */
    async findByUserId(userId, options = {}) {
        try {
            const {
                parentId = null,
                includeSubfolders = true,
                includeQuizCount = true,
                orderBy = 'name',
                orderDirection = 'ASC'
            } = options;

            let query = `
                SELECT f.id, f.name, f.description, f.color, f.parent_id, 
                       f.created_at, f.updated_at
            `;

            if (includeQuizCount) {
                query += `, COUNT(DISTINCT q.id) as quiz_count`;
            }

            if (includeSubfolders) {
                query += `, COUNT(DISTINCT sf.id) as subfolder_count`;
            }

            query += `
                FROM ${this.tableName} f
            `;

            if (includeQuizCount) {
                query += `
                    LEFT JOIN quizzes q ON f.id = q.folder_id AND q.deleted_at IS NULL
                `;
            }

            if (includeSubfolders) {
                query += `
                    LEFT JOIN ${this.tableName} sf ON f.id = sf.parent_id AND sf.deleted_at IS NULL
                `;
            }

            query += `
                WHERE f.user_id = ? AND f.deleted_at IS NULL
            `;
            const params = [userId];

            // Filter by parent folder
            if (parentId !== null) {
                if (parentId === 0) {
                    query += ' AND f.parent_id IS NULL';
                } else {
                    query += ' AND f.parent_id = ?';
                    params.push(parentId);
                }
            }

            query += ` GROUP BY f.id ORDER BY f.${orderBy} ${orderDirection}`;

            return await this.executeQuery(query, params);

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Create new folder
     */
    async createFolder(folderData) {
        try {
            // Validate required fields
            if (!folderData.name || folderData.name.trim().length === 0) {
                throw new ValidationError('Folder name is required');
            }

            if (!folderData.userId) {
                throw new ValidationError('User ID is required');
            }

            // Check for duplicate name in the same parent folder
            const isDuplicate = await this.checkDuplicateName(
                folderData.name,
                folderData.userId,
                folderData.parentId || null
            );

            if (isDuplicate) {
                throw new BusinessLogicError('Folder name already exists in this location');
            }

            // Validate parent folder if specified
            if (folderData.parentId) {
                const parentFolder = await this.findByIdAndUserId(folderData.parentId, folderData.userId);
                if (!parentFolder) {
                    throw new NotFoundError('Parent folder not found');
                }

                // Check folder depth (prevent infinite nesting)
                const depth = await this.getFolderDepth(folderData.parentId);
                if (depth >= 5) { // Maximum 5 levels deep
                    throw new BusinessLogicError('Maximum folder depth exceeded');
                }
            }

            // Prepare folder data
            const folderToCreate = {
                name: folderData.name.trim(),
                description: folderData.description?.trim() || '',
                color: folderData.color || '#3B82F6', // Default blue color
                parent_id: folderData.parentId || null,
                user_id: folderData.userId,
                created_at: new Date(),
                updated_at: new Date()
            };

            // Create folder
            const newFolder = await this.create(folderToCreate);

            logger.business('createFolder', {
                folderId: newFolder.id,
                name: newFolder.name,
                userId: folderData.userId,
                parentId: folderData.parentId || null
            });

            return newFolder;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'createFolder',
                name: folderData?.name,
                userId: folderData?.userId
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Update folder
     */
    async updateFolder(folderId, userId, updateData) {
        try {
            // Validate folder exists and user owns it
            const folder = await this.findByIdAndUserId(folderId, userId);
            if (!folder) {
                throw new NotFoundError('Folder not found');
            }

            // Check for duplicate name if name is being updated
            if (updateData.name && updateData.name !== folder.name) {
                const isDuplicate = await this.checkDuplicateName(
                    updateData.name,
                    userId,
                    folder.parent_id,
                    folderId
                );

                if (isDuplicate) {
                    throw new BusinessLogicError('Folder name already exists in this location');
                }
            }

            // Prepare update data
            const dataToUpdate = {};
            const allowedFields = ['name', 'description', 'color'];

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    dataToUpdate[field] = field === 'name' ?
                        updateData[field].trim() :
                        updateData[field];
                }
            });

            if (Object.keys(dataToUpdate).length === 0) {
                throw new ValidationError('No valid fields to update');
            }

            dataToUpdate.updated_at = new Date();

            // Update folder
            const updatedFolder = await this.update(folderId, dataToUpdate);

            logger.business('updateFolder', {
                folderId,
                userId,
                updatedFields: Object.keys(dataToUpdate)
            });

            return updatedFolder;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'updateFolder',
                folderId,
                userId
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Move folder to new parent
     */
    async moveFolder(folderId, newParentId, userId) {
        try {
            // Validate folder exists and user owns it
            const folder = await this.findByIdAndUserId(folderId, userId);
            if (!folder) {
                throw new NotFoundError('Folder not found');
            }

            // Validate new parent folder if specified
            if (newParentId) {
                const parentFolder = await this.findByIdAndUserId(newParentId, userId);
                if (!parentFolder) {
                    throw new NotFoundError('Parent folder not found');
                }

                // Prevent moving folder into itself or its descendants
                if (await this.isDescendantOf(newParentId, folderId)) {
                    throw new BusinessLogicError('Cannot move folder into itself or its descendants');
                }

                // Check folder depth
                const newDepth = await this.getFolderDepth(newParentId) + 1;
                const currentSubDepth = await this.getMaxSubfolderDepth(folderId);

                if (newDepth + currentSubDepth > 5) {
                    throw new BusinessLogicError('Move operation would exceed maximum folder depth');
                }
            }

            // Check for duplicate name in new location
            const isDuplicate = await this.checkDuplicateName(
                folder.name,
                userId,
                newParentId,
                folderId
            );

            if (isDuplicate) {
                throw new BusinessLogicError('Folder name already exists in destination location');
            }

            // Move folder
            const updateData = {
                parent_id: newParentId,
                updated_at: new Date()
            };

            const result = await this.update(folderId, updateData);

            logger.business('moveFolder', {
                folderId,
                userId,
                oldParentId: folder.parent_id,
                newParentId
            });

            return result;

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'moveFolder',
                folderId,
                newParentId,
                userId
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Delete folder (with cascade options)
     */
    async deleteFolder(folderId, userId, options = {}) {
        try {
            const { moveQuizzesToParent = true, moveSubfoldersToParent = true } = options;

            // Validate folder exists and user owns it
            const folder = await this.findByIdAndUserId(folderId, userId);
            if (!folder) {
                throw new NotFoundError('Folder not found');
            }

            return await this.withTransaction(async () => {
                // Handle quizzes in the folder
                if (moveQuizzesToParent) {
                    await this.moveQuizzesToParent(folderId, folder.parent_id);
                } else {
                    // Delete all quizzes in the folder
                    await this.deleteQuizzesInFolder(folderId);
                }

                // Handle subfolders
                if (moveSubfoldersToParent) {
                    await this.moveSubfoldersToParent(folderId, folder.parent_id);
                } else {
                    // Recursively delete subfolders
                    await this.deleteSubfolders(folderId, userId);
                }

                // Delete the folder
                const result = await this.softDelete(folderId);

                logger.business('deleteFolder', {
                    folderId,
                    userId,
                    name: folder.name,
                    moveQuizzesToParent,
                    moveSubfoldersToParent
                });

                return result;
            });

        } catch (error) {
            logger.errorWithContext(error, {
                operation: 'deleteFolder',
                folderId,
                userId
            });
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get folder hierarchy (breadcrumb path)
     */
    async getFolderPath(folderId) {
        try {
            const path = [];
            let currentId = folderId;

            while (currentId) {
                const query = `
                    SELECT id, name, parent_id
                    FROM ${this.tableName}
                    WHERE id = ? AND deleted_at IS NULL
                `;

                const results = await this.executeQuery(query, [currentId]);

                if (results.length === 0) {
                    break;
                }

                const folder = results[0];
                path.unshift({
                    id: folder.id,
                    name: folder.name
                });

                currentId = folder.parent_id;
            }

            return path;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get folder tree structure
     */
    async getFolderTree(userId, parentId = null) {
        try {
            const folders = await this.findByUserId(userId, {
                parentId,
                includeSubfolders: true,
                includeQuizCount: true
            });

            // Recursively build tree structure
            const tree = [];

            for (const folder of folders) {
                const folderNode = {
                    ...folder,
                    children: await this.getFolderTree(userId, folder.id)
                };
                tree.push(folderNode);
            }

            return tree;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Search folders
     */
    async searchFolders(userId, searchTerm, options = {}) {
        try {
            const { limit = 50, offset = 0 } = options;

            const query = `
                SELECT f.*, COUNT(DISTINCT q.id) as quiz_count
                FROM ${this.tableName} f
                LEFT JOIN quizzes q ON f.id = q.folder_id AND q.deleted_at IS NULL
                WHERE f.user_id = ? AND f.deleted_at IS NULL
                AND (f.name LIKE ? OR f.description LIKE ?)
                GROUP BY f.id
                ORDER BY f.name ASC
                LIMIT ? OFFSET ?
            `;

            const searchPattern = `%${searchTerm}%`;
            const params = [userId, searchPattern, searchPattern, limit, offset];

            return await this.executeQuery(query, params);

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Check if folder name is duplicate in the same parent
     */
    async checkDuplicateName(name, userId, parentId, excludeFolderId = null) {
        try {
            let query = `
                SELECT COUNT(*) as count
                FROM ${this.tableName}
                WHERE name = ? AND user_id = ? AND deleted_at IS NULL
            `;
            const params = [name.trim(), userId];

            // Check parent condition
            if (parentId === null) {
                query += ' AND parent_id IS NULL';
            } else {
                query += ' AND parent_id = ?';
                params.push(parentId);
            }

            // Exclude specific folder (for updates)
            if (excludeFolderId) {
                query += ' AND id != ?';
                params.push(excludeFolderId);
            }

            const results = await this.executeQuery(query, params);
            return results[0].count > 0;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get folder depth from root
     */
    async getFolderDepth(folderId) {
        try {
            let depth = 0;
            let currentId = folderId;

            while (currentId && depth < 10) { // Prevent infinite loop
                const query = `
                    SELECT parent_id
                    FROM ${this.tableName}
                    WHERE id = ? AND deleted_at IS NULL
                `;

                const results = await this.executeQuery(query, [currentId]);

                if (results.length === 0 || !results[0].parent_id) {
                    break;
                }

                currentId = results[0].parent_id;
                depth++;
            }

            return depth;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Get maximum depth of subfolders
     */
    async getMaxSubfolderDepth(folderId) {
        try {
            const query = `
                WITH RECURSIVE folder_tree AS (
                    SELECT id, parent_id, 0 as depth
                    FROM ${this.tableName}
                    WHERE parent_id = ? AND deleted_at IS NULL
                    
                    UNION ALL
                    
                    SELECT f.id, f.parent_id, ft.depth + 1
                    FROM ${this.tableName} f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                    WHERE f.deleted_at IS NULL AND ft.depth < 10
                )
                SELECT MAX(depth) as max_depth
                FROM folder_tree
            `;

            const results = await this.executeQuery(query, [folderId]);
            return results[0].max_depth || 0;

        } catch (error) {
            // Fallback if recursive CTE is not supported
            return 0;
        }
    }

    /**
     * Check if targetId is a descendant of sourceId
     */
    async isDescendantOf(targetId, sourceId) {
        try {
            let currentId = targetId;
            const visited = new Set();

            while (currentId && !visited.has(currentId)) {
                visited.add(currentId);

                if (currentId === sourceId) {
                    return true;
                }

                const query = `
                    SELECT parent_id
                    FROM ${this.tableName}
                    WHERE id = ? AND deleted_at IS NULL
                `;

                const results = await this.executeQuery(query, [currentId]);

                if (results.length === 0 || !results[0].parent_id) {
                    break;
                }

                currentId = results[0].parent_id;
            }

            return false;

        } catch (error) {
            throw this.handleDatabaseError(error);
        }
    }

    /**
     * Private helper methods
     */

    /**
     * Move quizzes to parent folder
     */
    async moveQuizzesToParent(folderId, parentId) {
        const query = `
            UPDATE quizzes
            SET folder_id = ?, updated_at = NOW()
            WHERE folder_id = ? AND deleted_at IS NULL
        `;

        return await this.executeQuery(query, [parentId, folderId]);
    }

    /**
     * Delete quizzes in folder
     */
    async deleteQuizzesInFolder(folderId) {
        const query = `
            UPDATE quizzes
            SET deleted_at = NOW(), updated_at = NOW()
            WHERE folder_id = ? AND deleted_at IS NULL
        `;

        return await this.executeQuery(query, [folderId]);
    }

    /**
     * Move subfolders to parent folder
     */
    async moveSubfoldersToParent(folderId, parentId) {
        const query = `
            UPDATE ${this.tableName}
            SET parent_id = ?, updated_at = NOW()
            WHERE parent_id = ? AND deleted_at IS NULL
        `;

        return await this.executeQuery(query, [parentId, folderId]);
    }

    /**
     * Recursively delete subfolders
     */
    async deleteSubfolders(folderId, userId) {
        // Get all subfolders
        const subfolders = await this.findByUserId(userId, {
            parentId: folderId,
            includeSubfolders: false,
            includeQuizCount: false
        });

        // Delete each subfolder recursively
        for (const subfolder of subfolders) {
            await this.deleteFolder(subfolder.id, userId, {
                moveQuizzesToParent: false,
                moveSubfoldersToParent: false
            });
        }
    }
}

export default FolderRepository;