// backend/src/controllers/authController.js
import { AuthService, AuthEmailService } from '../services/authService.js';
import { logger } from '../utils/logger.js';
import { validatePassword } from '../utils/validator.js';

/**
 * Controller for handling authentication-related routes
 */
class AuthController {
    /**
     * Register a new user
     */
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
            const existingUser = await AuthService.getUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'This email is already registered'
                });
            }

            // Hash password
            const passwordHash = await AuthService.hashPassword(password);

            // Create user
            const userId = await AuthService.createUser(
                { firstName, lastName, email, schoolName, status: 'pending', role: 'teacher' },
                passwordHash
            );

            // Notify admin about new user registration
            await AuthEmailService.notifyAdminsAboutNewUser(userId, email, firstName, lastName);

            // Log user registration
            logger.info(`New user registered (awaiting admin verification): ${email} (ID: ${userId})`);

            return res.status(201).json({
                success: true,
                message: 'Registration successful! Your account is pending administrator approval. You will be notified once your account is verified.'
            });
        } catch (error) {
            logger.error('Registration error:', error);

            return res.status(500).json({
                success: false,
                message: 'An error occurred during registration',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * User login
     */
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const ipAddress = req.ip || req.connection.remoteAddress;

            // Check for too many login attempts from this IP
            const failedAttempts = await AuthService.getFailedLoginAttempts(ipAddress);
            if (failedAttempts >= 5) {
                return res.status(429).json({
                    success: false,
                    message: 'Too many failed login attempts. Please try again later.'
                });
            }

            // Record login attempt (default to failed)
            await AuthService.recordLoginAttempt(email, ipAddress, false);

            // Find user by email
            const user = await AuthService.getUserByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check account status
            if (user.status === 'pending') {
                return res.status(401).json({
                    success: false,
                    message: 'Your account is pending administrator approval. You will be notified once your account is verified.',
                    requiresAdminVerification: true
                });
            } else if (user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'Your account is not active. Please contact an administrator.'
                });
            }

            // Verify password
            const passwordMatch = await AuthService.verifyPassword(password, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Update login attempt to successful
            await AuthService.recordLoginAttempt(email, ipAddress, true);

            // Update last login timestamp
            await AuthService.updateLastLogin(user.id);

            // Create JWT token
            const token = AuthService.createToken(user);

            // Get user's schools and settings
            const schools = await AuthService.getUserSchools(user.id);
            const userSettings = await AuthService.getUserSettings(user.id);

            // Log the successful login
            logger.info(`User logged in: ${email} (ID: ${user.id})`);

            // Record login activity
            await AuthService.recordActivity(
                user.id,
                'login',
                'User logged in',
                ipAddress,
                req.headers['user-agent']
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

    /**
     * Forgot password
     */
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
            const user = await AuthService.getUserByEmail(email);

            // Don't reveal if email exists or not for security
            if (!user || user.status !== 'active') {
                return res.status(200).json({
                    success: true,
                    message: 'If your email exists in our system, a password reset link will be sent.'
                });
            }

            // Generate password reset token
            const resetToken = AuthService.generateToken();

            // Set reset token
            await AuthService.setPasswordResetToken(user.id, resetToken);

            // Send reset email
            await AuthEmailService.sendPasswordResetEmail(email, user.first_name, resetToken);

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

    /**
     * Reset password with token
     */
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
            const user = await AuthService.getUserByResetToken(token);

            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }

            // Check if token has expired
            const tokenExpiry = new Date(user.reset_token_expires_at);
            if (tokenExpiry < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Reset token has expired. Please request a new one.'
                });
            }

            // Hash new password
            const passwordHash = await AuthService.hashPassword(newPassword);

            // Update user password and clear reset token
            await AuthService.updatePassword(user.id, passwordHash);

            // Log password reset
            logger.info(`Password reset completed for: ${user.email} (ID: ${user.id})`);

            // Record password reset activity
            await AuthService.recordActivity(
                user.id,
                'password_reset',
                'User reset password'
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

    /**
     * Verify user by admin
     */
    static async verifyUser(req, res) {
        try {
            const adminId = req.user.userId;
            const { userId } = req.params;

            // Get admin role
            const admin = await AuthService.getUserById(adminId);

            if (!admin || (admin.role !== 'admin' && admin.role !== 'school_admin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only administrators can verify user accounts'
                });
            }

            // Find user to verify
            const user = await AuthService.getUserById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if user is already verified
            if (user.status === 'active') {
                return res.status(400).json({
                    success: false,
                    message: 'This user account is already active'
                });
            }

            // Update user status to active
            await AuthService.updateUserStatus(userId, 'active', true);

            // Log the verification
            logger.info(`User verified by admin: ${user.email} (ID: ${userId}) - Verified by admin ID: ${adminId}`);

            // Record verification activity
            await AuthService.recordActivity(
                userId,
                'account_verified',
                `Account verified by administrator (ID: ${adminId})`
            );

            // Notify user about verification
            await AuthEmailService.sendAccountVerificationEmail(user.email, user.first_name);

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

    // Other controller methods would follow the same pattern...
}

export default AuthController;