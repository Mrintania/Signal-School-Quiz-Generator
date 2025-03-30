// backend/src/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { sendEmail } from '../utils/emailService.js';
import { logger } from '../utils/logger.js';
import { validatePassword } from '../utils/validator.js';

class AuthController {
    // User Registration
    static async register(req, res) {
        try {
            const { firstName, lastName, email, password, schoolName } = req.body;

            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide all required information'
                });
            }

            // Validate password strength
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: passwordValidation.message
                });
            }

            // Check if email already exists
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already registered'
                });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                // Insert new user with pending status (awaiting admin verification)
                const [userResult] = await connection.execute(
                    `INSERT INTO users 
                    (first_name, last_name, email, password_hash, status, role) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [firstName, lastName, email, passwordHash, 'pending', 'teacher']
                );

                const userId = userResult.insertId;

                // Create user settings
                await connection.execute(
                    'INSERT INTO user_settings (user_id) VALUES (?)',
                    [userId]
                );

                // Create user quotas
                await connection.execute(
                    'INSERT INTO user_quotas (user_id) VALUES (?)',
                    [userId]
                );

                // If school name is provided, check if it exists or create new
                if (schoolName) {
                    // Check if school exists
                    const [existingSchools] = await connection.execute(
                        'SELECT id FROM schools WHERE name = ?',
                        [schoolName]
                    );

                    let schoolId;

                    if (existingSchools.length > 0) {
                        // School exists, use existing school ID
                        schoolId = existingSchools[0].id;
                    } else {
                        // Create new school
                        const [schoolResult] = await connection.execute(
                            'INSERT INTO schools (name) VALUES (?)',
                            [schoolName]
                        );

                        schoolId = schoolResult.insertId;
                    }

                    // Associate user with school
                    await connection.execute(
                        'INSERT INTO user_schools (user_id, school_id) VALUES (?, ?)',
                        [userId, schoolId]
                    );
                }

                await connection.commit();

                // Notify admin about new user registration (optional)
                // Send notification to admin email or create admin notification in the database
                await notifyAdminAboutNewUser(userId, email, firstName, lastName);

                // Log user registration
                logger.info(`New user registered (awaiting admin verification): ${email} (ID: ${userId})`);

                return res.status(201).json({
                    success: true,
                    message: 'Registration successful! Your account is pending administrator approval. You will be notified once your account is verified.'
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Registration error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred during registration',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Email Verification
    static async verifyEmail(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification token is required'
                });
            }

            // Find user with this token
            const [users] = await pool.execute(
                'SELECT id, email, email_token_expires_at FROM users WHERE email_verification_token = ?',
                [token]
            );

            if (users.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification token'
                });
            }

            const user = users[0];

            // Check if token has expired
            const tokenExpiry = new Date(user.email_token_expires_at);
            if (tokenExpiry < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification token has expired. Please request a new one.'
                });
            }

            // Update user as verified
            await pool.execute(
                'UPDATE users SET email_verified = TRUE, status = ?, email_verification_token = NULL, email_token_expires_at = NULL WHERE id = ?',
                ['active', user.id]
            );

            logger.info(`User email verified: ${user.email} (ID: ${user.id})`);

            return res.status(200).json({
                success: true,
                message: 'Email verified successfully! You can now log in.'
            });
        } catch (error) {
            logger.error('Email verification error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred during email verification',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Resend Verification Email
    static async resendVerification(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            // Find user by email
            const [users] = await pool.execute(
                'SELECT id, first_name, email_verified, status FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                // Don't reveal if email exists or not for security
                return res.status(200).json({
                    success: true,
                    message: 'If your email exists in our system, a verification link will be sent.'
                });
            }

            const user = users[0];

            // Check if user is already verified
            if (user.email_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'This email is already verified. Please login.'
                });
            }

            // Generate new verification token
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const tokenExpires = new Date();
            tokenExpires.setHours(tokenExpires.getHours() + 24); // Token valid for 24 hours

            // Update user with new token
            await pool.execute(
                'UPDATE users SET email_verification_token = ?, email_token_expires_at = ? WHERE id = ?',
                [verificationToken, tokenExpires, user.id]
            );

            // Send verification email
            const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
            await sendEmail({
                to: email,
                subject: 'Verify Your Signal School Quiz Generator Account',
                html: `
          <h2>Welcome to Signal School Quiz Generator!</h2>
          <p>Hello ${user.first_name},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationLink}">Verify Email Address</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you did not create this account, please ignore this email.</p>
        `
            });

            logger.info(`Verification email resent to: ${email} (ID: ${user.id})`);

            return res.status(200).json({
                success: true,
                message: 'A new verification link has been sent to your email.'
            });
        } catch (error) {
            logger.error('Resend verification error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while resending verification email',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get users pending admin verification
    static async getPendingUsers(req, res) {
        try {
            const adminId = req.user.userId; // From JWT token

            // Check if requester is an admin
            const [admins] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (admins.length === 0 || (admins[0].role !== 'admin' && admins[0].role !== 'school_admin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only administrators can view pending user accounts'
                });
            }

            // Get all pending users
            const [pendingUsers] = await pool.execute(
                `SELECT u.id, u.first_name as firstName, u.last_name as lastName, 
            u.email, u.role, u.created_at as createdAt, 
            s.name as schoolName
            FROM users u
            LEFT JOIN user_schools us ON u.id = us.user_id
            LEFT JOIN schools s ON us.school_id = s.id
            WHERE u.status = ?
            ORDER BY u.created_at DESC`,
                ['pending']
            );

            return res.status(200).json({
                success: true,
                users: pendingUsers
            });
        } catch (error) {
            logger.error('Error fetching pending users:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while fetching pending user accounts',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // User Login
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress;

            // Check for too many login attempts from this IP
            const [recentAttempts] = await pool.execute(
                'SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND attempt_time > DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND success = FALSE',
                [ipAddress]
            );

            if (recentAttempts[0].count >= 5) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed login attempts. Please try again later.'
                });
            }

            // Find user by email
            const [users] = await pool.execute(
                'SELECT id, first_name, last_name, email, password_hash, role, status FROM users WHERE email = ?',
                [email]
            );

            // Record login attempt
            await pool.execute(
                'INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)',
                [email, ipAddress, false] // Default to failed, update if successful
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = users[0];

            // Check if account is pending admin verification
            if (user.status === 'pending') {
                return res.status(401).json({
                    success: false,
                    message: 'Your account is pending administrator approval. You will be notified once your account is verified.',
                    requiresAdminVerification: true
                });
            }

            // Check if user account is active
            if (user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'Your account is not active. Please contact an administrator.'
                });
            }

            // Verify password
            const passwordMatch = await bcrypt.compare(password, user.password_hash);

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Update login attempt to successful
            await pool.execute(
                'UPDATE login_attempts SET success = TRUE WHERE email = ? ORDER BY id DESC LIMIT 1',
                [email]
            );

            // Update last login timestamp
            await pool.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [user.id]
            );

            // Create JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET || 'your_jwt_secret_key_here',
                { expiresIn: '24h' }
            );

            // Get user schools/organizations
            const [schools] = await pool.execute(
                `SELECT s.id, s.name, us.position, us.department 
                FROM schools s
                INNER JOIN user_schools us ON s.id = us.school_id
                WHERE us.user_id = ?`,
                [user.id]
            );

            // Get user settings
            const [settings] = await pool.execute(
                'SELECT language, theme, default_question_count, default_quiz_type FROM user_settings WHERE user_id = ?',
                [user.id]
            );

            const userSettings = settings.length > 0 ? settings[0] : null;

            // Log the successful login
            logger.info(`User logged in: ${email} (ID: ${user.id})`);

            // Record login activity
            await pool.execute(
                'INSERT INTO user_activities (user_id, activity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                [user.id, 'login', 'User logged in', ipAddress, req.headers['user-agent']]
            );

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    role: user.role,
                    schools: schools,
                    settings: userSettings
                }
            });
        } catch (error) {
            logger.error('Login error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred during login',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Password Reset Request
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            // Find user by email
            const [users] = await pool.execute(
                'SELECT id, first_name FROM users WHERE email = ? AND status = ?',
                [email, 'active']
            );

            // Don't reveal if email exists or not for security
            if (users.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'If your email exists in our system, a password reset link will be sent.'
                });
            }

            const user = users[0];

            // Generate password reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenExpires = new Date();
            tokenExpires.setHours(tokenExpires.getHours() + 1); // Token valid for 1 hour

            // Update user with reset token
            await pool.execute(
                'UPDATE users SET reset_password_token = ?, reset_token_expires_at = ? WHERE id = ?',
                [resetToken, tokenExpires, user.id]
            );

            // Send reset email
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            await sendEmail({
                to: email,
                subject: 'Reset Your Signal School Quiz Generator Password',
                html: `
          <h2>Password Reset Request</h2>
          <p>Hello ${user.first_name},</p>
          <p>We received a request to reset your password. Click the link below to reset it:</p>
          <p><a href="${resetLink}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
        `
            });

            logger.info(`Password reset requested for: ${email} (ID: ${user.id})`);

            return res.status(200).json({
                success: true,
                message: 'If your email exists in our system, a password reset link will be sent.'
            });
        } catch (error) {
            logger.error('Forgot password error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred processing your request',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Reset Password with Token
    static async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Token and new password are required'
                });
            }

            // Validate password strength
            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: passwordValidation.message
                });
            }

            // Find user with this token
            const [users] = await pool.execute(
                'SELECT id, email, reset_token_expires_at FROM users WHERE reset_password_token = ?',
                [token]
            );

            if (users.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }

            const user = users[0];

            // Check if token has expired
            const tokenExpiry = new Date(user.reset_token_expires_at);
            if (tokenExpiry < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Reset token has expired. Please request a new one.'
                });
            }

            // Hash new password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            // Update user password and clear reset token
            await pool.execute(
                'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_token_expires_at = NULL WHERE id = ?',
                [passwordHash, user.id]
            );

            // Log password reset
            logger.info(`Password reset completed for: ${user.email} (ID: ${user.id})`);

            // Record password reset activity
            await pool.execute(
                'INSERT INTO user_activities (user_id, activity_type, description) VALUES (?, ?, ?)',
                [user.id, 'password_reset', 'User reset password']
            );

            return res.status(200).json({
                success: true,
                message: 'Your password has been successfully reset. You can now log in with your new password.'
            });
        } catch (error) {
            logger.error('Reset password error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while resetting your password',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // New function for admin to verify users
    static async verifyUser(req, res) {
        try {
            const adminId = req.user.userId; // From JWT token
            const { userId } = req.params;

            // Check if requester is an admin
            const [admins] = await pool.execute(
                'SELECT role FROM users WHERE id = ?',
                [adminId]
            );

            if (admins.length === 0 || (admins[0].role !== 'admin' && admins[0].role !== 'school_admin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only administrators can verify user accounts'
                });
            }

            // Find user to verify
            const [users] = await pool.execute(
                'SELECT id, email, status, first_name, last_name FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = users[0];

            // Check if user is already verified
            if (user.status === 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'This user account is already active'
                });
            }

            // Update user status to active
            await pool.execute(
                'UPDATE users SET status = ?, email_verified = TRUE, updated_at = NOW() WHERE id = ?',
                ['active', userId]
            );

            // Log the verification
            logger.info(`User verified by admin: ${user.email} (ID: ${userId}) - Verified by admin ID: ${adminId}`);

            // Record verification activity
            await pool.execute(
                'INSERT INTO user_activities (user_id, activity_type, description) VALUES (?, ?, ?)',
                [userId, 'account_verified', `Account verified by administrator (ID: ${adminId})`]
            );

            // Notify user about verification (optional)
            // Send email to user that their account is now verified
            await sendAccountVerificationEmail(user.email, user.first_name);

            return res.status(200).json({
                success: true,
                message: `User account for ${user.email} has been successfully verified`
            });
        } catch (error) {
            logger.error('User verification error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while verifying the user account',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Accept School Invitation
    static async acceptInvitation(req, res) {
        try {
            const { token, firstName, lastName, password } = req.body;

            if (!token || !firstName || !lastName || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }

            // Validate password strength
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: passwordValidation.message
                });
            }

            // Find invitation with this token
            const [invitations] = await pool.execute(
                `SELECT i.id, i.email, i.school_id, i.role, i.expires_at, i.invited_by, s.name as school_name 
         FROM school_invitations i
         JOIN schools s ON i.school_id = s.id
         WHERE i.invitation_token = ? AND i.status = ?`,
                [token, 'pending']
            );

            if (invitations.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired invitation'
                });
            }

            const invitation = invitations[0];

            // Check if invitation has expired
            const expiryDate = new Date(invitation.expires_at);
            if (expiryDate < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'This invitation has expired. Please ask for a new invitation.'
                });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Check if user already exists with this email
            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ?',
                [invitation.email]
            );

            const connection = await pool.getConnection();

            try {
                await connection.beginTransaction();

                let userId;

                if (existingUsers.length > 0) {
                    // User already exists, update role if school_admin
                    userId = existingUsers[0].id;

                    if (invitation.role === 'school_admin') {
                        await connection.execute(
                            'UPDATE users SET role = ? WHERE id = ?',
                            ['school_admin', userId]
                        );
                    }

                    // Check if user is already associated with this school
                    const [existingAssociations] = await connection.execute(
                        'SELECT id FROM user_schools WHERE user_id = ? AND school_id = ?',
                        [userId, invitation.school_id]
                    );

                    if (existingAssociations.length === 0) {
                        // Associate user with school
                        await connection.execute(
                            'INSERT INTO user_schools (user_id, school_id) VALUES (?, ?)',
                            [userId, invitation.school_id]
                        );
                    }
                } else {
                    // Create new user
                    const [userResult] = await connection.execute(
                        `INSERT INTO users 
             (first_name, last_name, email, password_hash, role, status, email_verified) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [firstName, lastName, invitation.email, passwordHash, invitation.role, 'active', true]
                    );

                    userId = userResult.insertId;

                    // Create user settings
                    await connection.execute(
                        'INSERT INTO user_settings (user_id) VALUES (?)',
                        [userId]
                    );

                    // Create user quotas
                    await connection.execute(
                        'INSERT INTO user_quotas (user_id) VALUES (?)',
                        [userId]
                    );

                    // Associate user with school
                    await connection.execute(
                        'INSERT INTO user_schools (user_id, school_id) VALUES (?, ?)',
                        [userId, invitation.school_id]
                    );
                }

                // Update invitation status
                await connection.execute(
                    'UPDATE school_invitations SET status = ? WHERE id = ?',
                    ['accepted', invitation.id]
                );

                await connection.commit();

                // Log invitation acceptance
                logger.info(`Invitation accepted by: ${invitation.email} (ID: ${userId}) for school ID: ${invitation.school_id}`);

                // Create JWT token for auto-login
                const token = jwt.sign(
                    {
                        userId: userId,
                        email: invitation.email,
                        role: invitation.role
                    },
                    process.env.JWT_SECRET || 'your_jwt_secret_key_here',
                    { expiresIn: '24h' }
                );

                return res.status(200).json({
                    success: true,
                    message: `Welcome to ${invitation.school_name}! Your account has been set up successfully.`,
                    token,
                    user: {
                        id: userId,
                        firstName,
                        lastName,
                        email: invitation.email,
                        role: invitation.role
                    }
                });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Accept invitation error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred while processing your invitation',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // OAuth with Google
    static async googleAuth(req, res) {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    success: false,
                    message: 'ID Token is required'
                });
            }

            // Verify Google token
            // Note: This would use the Google API to verify the token and get user info
            // For this example, we're assuming the verification is done and we have user details

            const googleUser = {
                email: req.body.email, // In a real implementation, this would come from verified token
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                picture: req.body.picture
            };

            // Check if user exists
            const [existingUsers] = await pool.execute(
                'SELECT id, first_name, last_name, email, role, status FROM users WHERE email = ?',
                [googleUser.email]
            );

            let user;

            if (existingUsers.length === 0) {
                // User doesn't exist, create a new account
                const connection = await pool.getConnection();

                try {
                    await connection.beginTransaction();

                    // Create new user
                    const [userResult] = await connection.execute(
                        `INSERT INTO users 
             (first_name, last_name, email, password_hash, profile_image, role, status, email_verified) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            googleUser.firstName,
                            googleUser.lastName,
                            googleUser.email,
                            'GOOGLE_AUTH', // Special value to indicate OAuth login
                            googleUser.picture,
                            'teacher',
                            'active',
                            true
                        ]
                    );

                    const userId = userResult.insertId;

                    // Create user settings
                    await connection.execute(
                        'INSERT INTO user_settings (user_id) VALUES (?)',
                        [userId]
                    );

                    // Create user quotas
                    await connection.execute(
                        'INSERT INTO user_quotas (user_id) VALUES (?)',
                        [userId]
                    );

                    user = {
                        id: userId,
                        firstName: googleUser.firstName,
                        lastName: googleUser.lastName,
                        email: googleUser.email,
                        role: 'teacher'
                    };

                    await connection.commit();

                    logger.info(`New Google OAuth user created: ${googleUser.email} (ID: ${userId})`);
                } catch (error) {
                    await connection.rollback();
                    throw error;
                } finally {
                    connection.release();
                }
            } else {
                // User exists
                user = {
                    id: existingUsers[0].id,
                    firstName: existingUsers[0].first_name,
                    lastName: existingUsers[0].last_name,
                    email: existingUsers[0].email,
                    role: existingUsers[0].role
                };

                // Check if user account is active
                if (existingUsers[0].status !== 'active') {
                    return res.status(401).json({
                        success: false,
                        message: 'Your account is not active. Please contact an administrator.'
                    });
                }

                // Update last login timestamp
                await pool.execute(
                    'UPDATE users SET last_login = NOW() WHERE id = ?',
                    [user.id]
                );

                logger.info(`Existing user logged in via Google OAuth: ${googleUser.email} (ID: ${user.id})`);
            }

            // Get user schools/organizations
            const [schools] = await pool.execute(
                `SELECT s.id, s.name, us.position, us.department 
         FROM schools s
         INNER JOIN user_schools us ON s.id = us.school_id
         WHERE us.user_id = ?`,
                [user.id]
            );

            // Get user settings
            const [settings] = await pool.execute(
                'SELECT language, theme, default_question_count, default_quiz_type FROM user_settings WHERE user_id = ?',
                [user.id]
            );

            const userSettings = settings.length > 0 ? settings[0] : null;

            // Create JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET || 'your_jwt_secret_key_here',
                { expiresIn: '24h' }
            );

            // Record login activity
            await pool.execute(
                'INSERT INTO user_activities (user_id, activity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
                [user.id, 'login', 'User logged in with Google', req.ip || req.connection.remoteAddress, req.headers['user-agent']]
            );

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    ...user,
                    schools,
                    settings: userSettings
                }
            });
        } catch (error) {
            logger.error('Google OAuth error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred during Google authentication',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}
// Helper function to notify admin about new user registration
async function notifyAdminAboutNewUser(userId, email, firstName, lastName) {
    try {
        // Get admin emails
        const [admins] = await pool.execute(
            'SELECT email FROM users WHERE role = ? OR role = ?',
            ['admin', 'school_admin']
        );

        if (admins.length === 0) {
            logger.warn('No administrators found to notify about new user registration');
            return;
        }

        // Get admin emails
        const adminEmails = admins.map(admin => admin.email);

        // Send notification email to admins
        await sendEmail({
            to: adminEmails.join(','),
            subject: 'New User Registration Requires Verification',
            html: `
                <h2>New User Registration</h2>
                <p>A new user has registered and requires verification:</p>
                <ul>
                    <li><strong>User ID:</strong> ${userId}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Name:</strong> ${firstName} ${lastName}</li>
                </ul>
                <p>Please log in to the admin panel to verify this user.</p>
                <a href="${process.env.FRONTEND_URL}/admin/users" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Go to Admin Panel</a>
            `
        });

        logger.info(`Admin notification sent for new user registration: ${email} (ID: ${userId})`);
    } catch (error) {
        logger.error('Error sending admin notification:', error);
    }
}

// Helper function to send verification email to user
async function sendAccountVerificationEmail(email, firstName) {
    try {
        await sendEmail({
            to: email,
            subject: 'Your Account Has Been Verified',
            html: `
                <h2>Welcome to Signal School Quiz Generator!</h2>
                <p>Hello ${firstName},</p>
                <p>We're pleased to inform you that your account has been verified by an administrator and is now active.</p>
                <p>You can now log in and start using our platform.</p>
                <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Login to Your Account</a>
                <p>If you have any questions or need assistance, please contact our support team.</p>
            `
        });

        logger.info(`Account verification email sent to: ${email}`);
    } catch (error) {
        logger.error('Error sending account verification email:', error);
    }
}

export default AuthController;