// backend/src/controllers/schoolController.js
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

class SchoolController {
  // Create School
  static async createSchool(req, res) {
    try {
      const userId = req.user.userId; // From JWT auth middleware
      const { name, address, city, state, postalCode, country, phone, email, website } = req.body;
      
      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'School name is required'
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Create the school
        const [schoolResult] = await connection.execute(
          `INSERT INTO schools 
           (name, address, city, state, postal_code, country, phone, email, website) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, address || null, city || null, state || null, postalCode || null, 
           country || null, phone || null, email || null, website || null]
        );
        
        const schoolId = schoolResult.insertId;
        
        // Associate user with school as admin
        await connection.execute(
          'INSERT INTO user_schools (user_id, school_id) VALUES (?, ?)',
          [userId, schoolId]
        );
        
        // Update user role to school_admin if not already an admin
        const [userRoles] = await connection.execute(
          'SELECT role FROM users WHERE id = ?',
          [userId]
        );
        
        if (userRoles.length > 0 && userRoles[0].role === 'teacher') {
          await connection.execute(
            'UPDATE users SET role = ? WHERE id = ?',
            ['school_admin', userId]
          );
        }
        
        await connection.commit();
        
        logger.info(`School created: ${name} (ID: ${schoolId}) by user ID: ${userId}`);
        
        return res.status(201).json({
          success: true,
          message: 'School created successfully',
          schoolId: schoolId
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('Error creating school:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while creating the school',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Update School
  static async updateSchool(req, res) {
    try {
      const userId = req.user.userId; // From JWT auth middleware
      const { schoolId } = req.params;
      const { name, address, city, state, postalCode, country, phone, email, website } = req.body;
      
      // Check if user has permission to update this school
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
            message: 'You do not have permission to update this school'
          });
        }
      }
      
      // Update school information
      await pool.execute(
        `UPDATE schools SET 
         name = COALESCE(?, name),
         address = COALESCE(?, address),
         city = COALESCE(?, city),
         state = COALESCE(?, state),
         postal_code = COALESCE(?, postal_code),
         country = COALESCE(?, country),
         phone = COALESCE(?, phone),
         email = COALESCE(?, email),
         website = COALESCE(?, website),
         updated_at = NOW()
         WHERE id = ?`,
        [name, address, city, state, postalCode, country, phone, email, website, schoolId]
      );
      
      logger.info(`School updated: ID ${schoolId} by user ID: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'School information updated successfully'
      });
    } catch (error) {
      logger.error('Error updating school:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while updating the school',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Get School Details
  static async getSchool(req, res) {
    try {
      const userId = req.user.userId; // From JWT auth middleware
      const { schoolId } = req.params;
      
      // Check if user is associated with this school
      const [userSchools] = await pool.execute(
        'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
        [userId, schoolId]
      );
      
      // Allow system admins to view any school
      const [userRoles] = await pool.execute(
        'SELECT role FROM users WHERE id = ?',
        [userId]
      );
      
      const isSystemAdmin = userRoles.length > 0 && userRoles[0].role === 'admin';
      
      if (userSchools.length === 0 && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this school'
        });
      }
      
      // Get school details
      const [schools] = await pool.execute(
        `SELECT id, name, address, city, state, postal_code, country, phone, email, website,
         subscription_plan, subscription_status, subscription_expires_at, created_at, updated_at
         FROM schools WHERE id = ?`,
        [schoolId]
      );
      
      if (schools.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'School not found'
        });
      }
      
      // Get user count
      const [userCounts] = await pool.execute(
        'SELECT COUNT(*) as total_users FROM user_schools WHERE school_id = ?',
        [schoolId]
      );
      
      // Get department count
      const [departmentCounts] = await pool.execute(
        'SELECT COUNT(*) as total_departments FROM school_departments WHERE school_id = ?',
        [schoolId]
      );
      
      // Get quiz count
      const [quizCounts] = await pool.execute(
        'SELECT COUNT(*) as total_quizzes FROM quizzes WHERE school_id = ?',
        [schoolId]
      );
      
      // Prepare response object
      const schoolData = {
        ...schools[0],
        stats: {
          totalUsers: userCounts[0].total_users,
          totalDepartments: departmentCounts[0].total_departments,
          totalQuizzes: quizCounts[0].total_quizzes
        }
      };
      
      return res.status(200).json({
        success: true,
        data: schoolData
      });
    } catch (error) {
      logger.error('Error fetching school details:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching school details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Get School Departments
  static async getSchoolDepartments(req, res) {
    try {
      const userId = req.user.userId; // From JWT auth middleware
      const { schoolId } = req.params;
      
      // Check if user is associated with this school
      const [userSchools] = await pool.execute(
        'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
        [userId, schoolId]
      );
      
      // Allow system admins to view any school
      const [userRoles] = await pool.execute(
        'SELECT role FROM users WHERE id = ?',
        [userId]
      );
      
      const isSystemAdmin = userRoles.length > 0 && userRoles[0].role === 'admin';
      
      if (userSchools.length === 0 && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this school'
        });
      }
      
      // Get school departments
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
      const userId = req.user.userId; // From JWT auth middleware
      const { schoolId, name, description } = req.body;
      
      // Validate required fields
      if (!schoolId || !name) {
        return res.status(400).json({
          success: false,
          message: 'School ID and department name are required'
        });
      }
      
      // Check if user has permission to create departments in this school
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
      
      // Create the department
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
      const userId = req.user.userId; // From JWT auth middleware
      const { departmentId } = req.params;
      const { name, description } = req.body;
      
      // Check if department exists and get school ID
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
      
      // Check if user has permission to update departments in this school
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
      
      // Update the department
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
      const userId = req.user.userId; // From JWT auth middleware
      const { departmentId } = req.params;
      
      // Check if department exists and get school ID
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
      
      // Check if user has permission to delete departments in this school
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
      
      // Delete the department
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
  
  // Add User to Department
  static async addUserToDepartment(req, res) {
    try {
      const adminId = req.user.userId; // From JWT auth middleware
      const { userId, departmentId, role } = req.body;
      
      // Validate required fields
      if (!userId || !departmentId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and department ID are required'
        });
      }
      
      // Check if department exists and get school ID
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
      
      // Check if admin has permission to manage this department
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
            message: 'You do not have permission to manage departments in this school'
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
      
      // Check if user is already in the department
      const [userDepartments] = await pool.execute(
        'SELECT id FROM user_departments WHERE user_id = ? AND department_id = ?',
        [userId, departmentId]
      );
      
      if (userDepartments.length > 0) {
        // If already in department, update role if provided
        if (role) {
          await pool.execute(
            'UPDATE user_departments SET role = ? WHERE user_id = ? AND department_id = ?',
            [role, userId, departmentId]
          );
          
          logger.info(`Updated user role in department: User ID ${userId} in Department ID ${departmentId} to role "${role}" by Admin ID ${adminId}`);
          
          return res.status(200).json({
            success: true,
            message: `User role updated to "${role}" in department`
          });
        } else {
          return res.status(409).json({
            success: false,
            message: 'User is already in this department'
          });
        }
      }
      
      // Add user to department
      await pool.execute(
        'INSERT INTO user_departments (user_id, department_id, role) VALUES (?, ?, ?)',
        [userId, departmentId, role || null]
      );
      
      logger.info(`User added to department: User ID ${userId} to Department ID ${departmentId} by Admin ID ${adminId}`);
      
      return res.status(200).json({
        success: true,
        message: 'User added to department successfully'
      });
    } catch (error) {
      logger.error('Error adding user to department:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while adding user to department',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Remove User from Department
  static async removeUserFromDepartment(req, res) {
    try {
      const adminId = req.user.userId; // From JWT auth middleware
      const { userId, departmentId } = req.body;
      
      // Validate required fields
      if (!userId || !departmentId) {
        return res.status(400).json({
          success: false,
          message: 'User ID and department ID are required'
        });
      }
      
      // Check if department exists and get school ID
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
      
      // Check if admin has permission to manage this department
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
            message: 'You do not have permission to manage departments in this school'
          });
        }
      }
      
      // Remove user from department
      await pool.execute(
        'DELETE FROM user_departments WHERE user_id = ? AND department_id = ?',
        [userId, departmentId]
      );
      
      logger.info(`User removed from department: User ID ${userId} from Department ID ${departmentId} by Admin ID ${adminId}`);
      
      return res.status(200).json({
        success: true,
        message: 'User removed from department successfully'
      });
    } catch (error) {
      logger.error('Error removing user from department:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while removing user from department',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Get Department Members
  static async getDepartmentMembers(req, res) {
    try {
      const userId = req.user.userId; // From JWT auth middleware
      const { departmentId } = req.params;
      
      // Check if department exists and get school ID
      const [departments] = await pool.execute(
        'SELECT school_id, name FROM school_departments WHERE id = ?',
        [departmentId]
      );
      
      if (departments.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Department not found'
        });
      }
      
      const schoolId = departments[0].school_id;
      
      // Check if user has permission to view this department
      const [userSchools] = await pool.execute(
        'SELECT us.id FROM user_schools us WHERE us.user_id = ? AND us.school_id = ?',
        [userId, schoolId]
      );
      
      // Allow system admins to view any department
      const [userRoles] = await pool.execute(
        'SELECT role FROM users WHERE id = ?',
        [userId]
      );
      
      const isSystemAdmin = userRoles.length > 0 && userRoles[0].role === 'admin';
      
      if (userSchools.length === 0 && !isSystemAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this department'
        });
      }
      
      // Get department members
      const [members] = await pool.execute(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.profile_image,
         ud.role as department_role, ud.created_at as joined_at
         FROM users u
         JOIN user_departments ud ON u.id = ud.user_id
         WHERE ud.department_id = ?
         ORDER BY u.last_name, u.first_name`,
        [departmentId]
      );
      
      return res.status(200).json({
        success: true,
        data: {
          departmentName: departments[0].name,
          members: members
        }
      });
    } catch (error) {
      logger.error('Error fetching department members:', error);
      
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching department members',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default SchoolController;