-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS quiz_generator;

-- Use the database
USE quiz_generator;

-- Create the quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  question_type ENUM('Multiple Choice', 'Essay') NOT NULL,
  student_level VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create the questions table
CREATE TABLE IF NOT EXISTS questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Create the options table for multiple choice questions
CREATE TABLE IF NOT EXISTS options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  question_id INT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- User Management System
-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  profile_image VARCHAR(255),
  role ENUM('admin', 'school_admin', 'teacher') DEFAULT 'teacher',
  status ENUM('active', 'pending', 'suspended', 'inactive') DEFAULT 'pending',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_token_expires_at TIMESTAMP,
  reset_password_token VARCHAR(255),
  reset_token_expires_at TIMESTAMP,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Schools/Organizations Table
CREATE TABLE schools (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  subscription_plan ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'free',
  subscription_status ENUM('active', 'inactive', 'trial') DEFAULT 'trial',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User-School Relationship
CREATE TABLE user_schools (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  school_id INT NOT NULL,
  position VARCHAR(255),
  department VARCHAR(255),
  grade_level VARCHAR(255),
  subjects TEXT,
  join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE (user_id, school_id)
);

-- School Invitations
CREATE TABLE school_invitations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  school_id INT NOT NULL,
  role ENUM('school_admin', 'teacher') DEFAULT 'teacher',
  invitation_token VARCHAR(255) NOT NULL,
  status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  invited_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Permissions Table
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Table
CREATE TABLE role_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role ENUM('admin', 'school_admin', 'teacher') NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (role, permission_id)
);

-- Quiz Permissions Table
CREATE TABLE quiz_permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  permission_type ENUM('owner', 'edit', 'view') DEFAULT 'view',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (quiz_id, user_id)
);

-- User Settings
CREATE TABLE user_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  language VARCHAR(10) DEFAULT 'thai',
  theme VARCHAR(20) DEFAULT 'light',
  default_question_count INT DEFAULT 10,
  default_quiz_type VARCHAR(50) DEFAULT 'Multiple Choice',
  notification_preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User Activity Logs
CREATE TABLE user_activities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Login Attempts Tracking
CREATE TABLE login_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT FALSE
);

-- Quota Management
CREATE TABLE user_quotas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  quiz_limit INT DEFAULT 100,
  quiz_count INT DEFAULT 0,
  ai_generation_limit INT DEFAULT 50,
  ai_generation_count INT DEFAULT 0,
  storage_limit BIGINT DEFAULT 104857600, -- 100MB in bytes
  storage_used BIGINT DEFAULT 0,
  reset_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- School Department/Groups
CREATE TABLE school_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  school_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- User-Department Relationship
CREATE TABLE user_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  department_id INT NOT NULL,
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES school_departments(id) ON DELETE CASCADE,
  UNIQUE (user_id, department_id)
);

-- Shared Quizzes (Between Users)
CREATE TABLE shared_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  shared_by INT NOT NULL,
  shared_with INT NOT NULL,
  permission_type ENUM('edit', 'view') DEFAULT 'view',
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (quiz_id, shared_by, shared_with)
);

-- Insert Default Permissions
INSERT INTO permissions (name, description) VALUES
('create_quiz', 'Create new quizzes using AI'),
('edit_quiz', 'Edit existing quizzes'),
('delete_quiz', 'Delete quizzes'),
('share_quiz', 'Share quizzes with other users'),
('export_quiz', 'Export quizzes in different formats'),
('import_quiz', 'Import quizzes from external sources'),
('manage_users', 'Add, edit, or delete users'),
('manage_school', 'Manage school settings and information'),
('invite_users', 'Send invitations to join the school'),
('view_analytics', 'View analytics and reports'),
('manage_departments', 'Create and manage departments'),
('manage_permissions', 'Assign and modify permissions');

-- Assign Default Role Permissions
-- Admin role permissions
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions;

-- School Admin permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'school_admin', id FROM permissions 
WHERE name IN ('create_quiz', 'edit_quiz', 'delete_quiz', 'share_quiz', 'export_quiz', 
               'import_quiz', 'manage_users', 'invite_users', 'view_analytics', 
               'manage_departments');

-- Teacher permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'teacher', id FROM permissions 
WHERE name IN ('create_quiz', 'edit_quiz', 'delete_quiz', 'share_quiz', 'export_quiz', 
               'import_quiz', 'view_analytics');

-- Add PDF quiz tracking table
CREATE TABLE pdf_quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  pages_count INT,
  processing_time_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Add index for performance
CREATE INDEX idx_pdf_quizzes_quiz_id ON pdf_quizzes(quiz_id);
CREATE INDEX idx_pdf_quizzes_created_at ON pdf_quizzes(created_at);

-- Add foreign key to link quizzes with users
ALTER TABLE quizzes ADD COLUMN user_id INT NOT NULL AFTER id;
ALTER TABLE quizzes ADD COLUMN school_id INT AFTER user_id;
ALTER TABLE quizzes ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE quizzes ADD FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;