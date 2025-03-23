// backend/src/controllers/schoolAdminController.js
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../utils/emailService.js';

class SchoolAdminController {
    // Invite User to School
    static async inviteUser(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { email, role, schoolId, department, position, gradeLevel } = req.body;

            // Validate input
            if (!email || !schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and school ID are required'
                });
            }

            // Validate role
            if (role && !['school_admin', 'teacher'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be either "school_admin" or "teacher"'
                });
            }

            // Check if admin has permission to invite users to this school
            const [adminSchools] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminSchools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminSchools[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
                    [adminId, schoolId]
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to invite users to this school'
                    });
                }
            }

            // Check if the email is already registered with this school
            const [existingUsers] = await pool.execute(
                `SELECT u.id FROM users u
         JOIN user_schools us ON u.id = us.user_id
         WHERE u.email = ? AND us.school_id = ?`,
                [email, schoolId]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already registered with this school'
                });
            }

            // Check if there's an existing pending invitation for this email and school
            const [existingInvitations] = await pool.execute(
                'SELECT id FROM school_invitations WHERE email = ? AND school_id = ? AND status = ?',
                [email, schoolId, 'pending']
            );

            if (existingInvitations.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'There is already a pending invitation for this email'
                });
            }

            // Get school name
            const [schools] = await pool.execute(
                'SELECT name FROM schools WHERE id = ?',
                [schoolId]
            );

            if (schools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'School not found'
                });
            }

            // Generate invitation token
            const invitationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpires = new Date();
            tokenExpires.setDate(tokenExpires.getDate() + 7); // Token valid for 7 days

            // Create invitation
            await pool.execute(
                `INSERT INTO school_invitations 
         (email, school_id, role, invitation_token, expires_at, invited_by) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [email, schoolId, role || 'teacher', invitationToken, tokenExpires, adminId]
            );

            // Send invitation email
            const invitationLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
            await sendEmail({
                to: email,
                subject: `Invitation to join ${schools[0].name} on Signal School Quiz Generator`,
                html: `
          <h2>You've been invited to join ${schools[0].name}</h2>
          <p>You have been invited to join Signal School Quiz Generator as a ${role || 'teacher'} for ${schools[0].name}.</p>
          <p>Click the link below to accept the invitation:</p>
          <p><a href="${invitationLink}">Accept Invitation</a></p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you did not expect this invitation, you can ignore this email.</p>
        `
            });

            logger.info(`Invitation sent to ${email} for school ID: ${schoolId} by admin ID: ${adminId}`);

            return res.status(200).json({
                success: true,
                message: `Invitation sent to ${email}`
            });
        } catch (error) {
            logger.error('Error sending invitation:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while sending the invitation',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get School Users
    static async getSchoolUsers(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { schoolId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;

            // Check if admin has permission to view users in this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
                    [adminId, schoolId]
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to view users in this school'
                    });
                }
            }

            // Get users with pagination
            const [users] = await pool.execute(
                `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status, 
          u.profile_image, u.last_login, u.created_at,
          us.position, us.department, us.grade_level, us.subjects,
          us.join_date
         FROM users u
         JOIN user_schools us ON u.id = us.user_id
         WHERE us.school_id = ?
         ORDER BY u.last_name, u.first_name
         LIMIT ? OFFSET ?`,
                [schoolId, limit, offset]
            );

            // Get total count for pagination
            const [countResult] = await pool.execute(
                'SELECT COUNT(*) as total FROM users u JOIN user_schools us ON u.id = us.user_id WHERE us.school_id = ?',
                [schoolId]
            );

            const total = countResult[0].total;

            // Get pending invitations for this school
            const [invitations] = await pool.execute(
                `SELECT i.id, i.email, i.role, i.status, i.created_at, i.expires_at,
          u.first_name as invited_by_first_name, u.last_name as invited_by_last_name
         FROM school_invitations i
         JOIN users u ON i.invited_by = u.id
         WHERE i.school_id = ? AND i.status = ?
         ORDER BY i.created_at DESC`,
                [schoolId, 'pending']
            );

            return res.status(200).json({
                success: true,
                data: {
                    users,
                    invitations
                },
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + limit < total
                }
            });
        } catch (error) {
            logger.error('Error fetching school users:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching school users',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update User Role in School
    static async updateUserRole(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { userId, schoolId, role } = req.body;

            // Validate input
            if (!userId || !schoolId || !role) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID, school ID, and role are required'
                });
            }

            // Validate role
            if (!['school_admin', 'teacher'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be either "school_admin" or "teacher"'
                });
            }

            // Check if admin has permission to update roles in this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [adminId, schoolId, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to update user roles in this school'
                    });
                }
            }

            // Check if user exists and is part of the school
            const [userSchools] = await pool.execute(
                'SELECT id FROM user_schools WHERE user_id = ? AND school_id = ?',
                [userId, schoolId]
            );

            if (userSchools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found in this school'
                });
            }

            // Update user role
            if (role === 'school_admin') {
                // If promoting to school_admin, update user role in main users table
                await pool.execute(
                    'UPDATE users SET role = ? WHERE id = ?',
                    [role, userId]
                );
            } else {
                // If demoting to teacher, need to check if user is school_admin for other schools
                const [otherSchoolAdmin] = await pool.execute(
                    `SELECT COUNT(*) as count FROM user_schools us
           JOIN users u ON us.user_id = u.id
           WHERE us.user_id = ? AND us.school_id != ? AND u.role = ?`,
                    [userId, schoolId, 'school_admin']
                );

                // If not a school_admin for other schools, update to teacher
                if (otherSchoolAdmin[0].count === 0) {
                    await pool.execute(
                        'UPDATE users SET role = ? WHERE id = ?',
                        ['teacher', userId]
                    );
                }
            }

            logger.info(`User role updated: User ID ${userId} in School ID ${schoolId} to ${role} by Admin ID ${adminId}`);

            return res.status(200).json({
                success: true,
                message: `User role updated to ${role}`
            });
        } catch (error) {
            logger.error('Error updating user role:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating user role',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Remove User from School
    static async removeUser(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { userId, schoolId } = req.body;

            // Validate input
            if (!userId || !schoolId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and school ID are required'
                });
            }

            // Check if admin has permission to remove users from this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us JOIN users u ON us.user_id = u.id WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [adminId, schoolId, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to remove users from this school'
                    });
                }
            }

            // Check if user exists and is part of the school
            const [userSchools] = await pool.execute(
                'SELECT id FROM user_schools WHERE user_id = ? AND school_id = ?',
                [userId, schoolId]
            );

            if (userSchools.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found in this school'
                });
            }

            // Get user info for logging
            const [users] = await pool.execute(
                'SELECT email, role FROM users WHERE id = ?',
                [userId]
            );

            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // Remove user from school
                await connection.execute(
                    'DELETE FROM user_schools WHERE user_id = ? AND school_id = ?',
                    [userId, schoolId]
                );

                // Update user role if needed
                if (users[0].role === 'school_admin') {
                    // Check if user is still school_admin in other schools
                    const [otherSchoolAdmin] = await connection.execute(
                        'SELECT COUNT(*) as count FROM user_schools WHERE user_id = ? AND school_id != ?',
                        [userId, schoolId]
                    );

                    // If not associated with other schools, update to teacher
                    if (otherSchoolAdmin[0].count === 0) {
                        await connection.execute(
                            'UPDATE users SET role = ? WHERE id = ?',
                            ['teacher', userId]
                        );
                    }
                }

                await connection.commit();

                logger.info(`User removed from school: User ID ${userId} (${users[0].email}) from School ID ${schoolId} by Admin ID ${adminId}`);

                return res.status(200).json({
                    success: true,
                    message: 'User removed from school successfully'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error removing user from school:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while removing user from school',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Cancel Invitation
    static async cancelInvitation(req, res) {
        try {
            const adminId = req.user.userId; // From JWT auth middleware
            const { invitationId } = req.params;

            // Get invitation details
            const [invitations] = await pool.execute(
                'SELECT email, school_id FROM school_invitations WHERE id = ?',
                [invitationId]
            );

            if (invitations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Invitation not found'
                });
            }

            const invitation = invitations[0];

            // Check if admin has permission to cancel invitations for this school
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Administrator not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us JOIN users u ON us.user_id = u.id WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [adminId, invitation.school_id, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to cancel invitations for this school'
                    });
                }
            }

            // Delete the invitation
            await pool.execute(
                'DELETE FROM school_invitations WHERE id = ?',
                [invitationId]
            );

            logger.info(`Invitation cancelled: ID ${invitationId} for ${invitation.email} by Admin ID ${adminId}`);

            return res.status(200).json({
                success: true,
                message: 'Invitation cancelled successfully'
            });
        } catch (error) {
            logger.error('Error cancelling invitation:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while cancelling the invitation',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    // Get School Departments
    static async getSchoolDepartments(req, res) {
        try {
            const userId = req.user.userId;
            const { schoolId } = req.params;

            // ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงโรงเรียนนี้หรือไม่
            const [userSchools] = await pool.execute(
                'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
                [userId, schoolId]
            );

            // อนุญาตให้ผู้ดูแลระบบดูแผนกใด ๆ ได้
            const [userRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );

            const isSystemAdmin = userRoles.length > 0 && userRoles[0].role === 'admin';

            if (userSchools.length === 0 && !isSystemAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to view departments in this school'
                });
            }

            // ดึงข้อมูลแผนกของโรงเรียน
            const [departments] = await pool.execute(
                `SELECT sd.id, sd.name, sd.description, sd.created_at, sd.updated_at,
         COUNT(ud.user_id) as member_count
         FROM school_departments sd
         LEFT JOIN user_departments ud ON sd.id = ud.department_id
         WHERE sd.school_id = ?
         GROUP BY sd.id
         ORDER BY sd.name`,
                [schoolId]
            );

            return res.status(200).json({
                success: true,
                data: departments
            });
        } catch (error) {
            logger.error('Error fetching school departments:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching school departments',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
    // Create Department
    static async createDepartment(req, res) {
        try {
            const userId = req.user.userId;
            const { schoolId, name, description } = req.body;

            // ตรวจสอบข้อมูลที่จำเป็น
            if (!schoolId || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'School ID and department name are required'
                });
            }

            // ตรวจสอบสิทธิ์ผู้ใช้
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us JOIN users u ON us.user_id = u.id WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [userId, schoolId, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to create departments in this school'
                    });
                }
            }

            // สร้างแผนก
            const [departmentResult] = await pool.execute(
                'INSERT INTO school_departments (school_id, name, description) VALUES (?, ?, ?)',
                [schoolId, name, description || null]
            );

            const departmentId = departmentResult.insertId;

            logger.info(`Department created: ${name} (ID: ${departmentId}) in School ID: ${schoolId} by user ID: ${userId}`);

            return res.status(201).json({
                success: true,
                message: 'Department created successfully',
                departmentId: departmentId
            });
        } catch (error) {
            logger.error('Error creating department:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while creating the department',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update Department
    static async updateDepartment(req, res) {
        try {
            const userId = req.user.userId;
            const { departmentId } = req.params;
            const { name, description } = req.body;

            // ตรวจสอบว่าแผนกมีอยู่และดึง school ID
            const [departments] = await pool.execute(
                'SELECT school_id FROM school_departments WHERE id = ?',
                [departmentId]
            );

            if (departments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Department not found'
                });
            }

            const schoolId = departments[0].school_id;

            // ตรวจสอบสิทธิ์ผู้ใช้
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us JOIN users u ON us.user_id = u.id WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [userId, schoolId, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to update departments in this school'
                    });
                }
            }

            // อัปเดตแผนก
            await pool.execute(
                `UPDATE school_departments SET 
         name = COALESCE(?, name),
         description = COALESCE(?, description),
         updated_at = NOW()
         WHERE id = ?`,
                [name, description, departmentId]
            );

            logger.info(`Department updated: ID ${departmentId} in School ID: ${schoolId} by user ID: ${userId}`);

            return res.status(200).json({
                success: true,
                message: 'Department updated successfully'
            });
        } catch (error) {
            logger.error('Error updating department:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while updating the department',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Delete Department
    static async deleteDepartment(req, res) {
        try {
            const userId = req.user.userId;
            const { departmentId } = req.params;

            // ตรวจสอบว่าแผนกมีอยู่และดึง school ID
            const [departments] = await pool.execute(
                'SELECT school_id FROM school_departments WHERE id = ?',
                [departmentId]
            );

            if (departments.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Department not found'
                });
            }

            const schoolId = departments[0].school_id;

            // ตรวจสอบสิทธิ์ผู้ใช้
            const [adminRoles] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );

            if (adminRoles.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const isSystemAdmin = adminRoles[0].role === 'admin';

            if (!isSystemAdmin) {
                const [schoolPermissions] = await pool.execute(
                    'SELECT us.id FROM user_schools us JOIN users u ON us.user_id = u.id WHERE us.user_id = ? AND us.school_id = ? AND u.role = ?',
                    [userId, schoolId, 'school_admin']
                );

                if (schoolPermissions.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to delete departments in this school'
                    });
                }
            }

            // ลบแผนก
            await pool.execute(
                'DELETE FROM school_departments WHERE id = ?',
                [departmentId]
            );

            logger.info(`Department deleted: ID ${departmentId} in School ID: ${schoolId} by user ID: ${userId}`);

            return res.status(200).json({
                success: true,
                message: 'Department deleted successfully'
            });
        } catch (error) {
            logger.error('Error deleting department:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while deleting the department',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export { SchoolAdminController };