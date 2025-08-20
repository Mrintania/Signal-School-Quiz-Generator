// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

const router = express.Router();

// Temporary user storage (replace with database)
const users = [
  {
    id: 1,
    email: 'admin@signalschool.army',
    password: '$2a$10$sampleHashedPassword', // password: admin123
    role: 'admin',
    department: 'Signal School',
    firstName: 'ผู้ดูแลระบบ',
    lastName: 'โรงเรียนทหารสื่อสาร',
    isActive: true,
  },
  {
    id: 2,
    email: 'teacher@signalschool.army',
    password: '$2a$10$sampleHashedPassword', // password: teacher123
    role: 'teacher',
    department: 'Computer Science',
    firstName: 'อาจารย์',
    lastName: 'คอมพิวเตอร์',
    isActive: true,
  }
];

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, department } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกข้อมูลให้ครบถ้วน',
      });
    }

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'อีเมลนี้ถูกใช้งานแล้ว',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'teacher',
      department: department || 'General',
      isActive: true,
      createdAt: new Date(),
    };

    users.push(newUser);

    // Generate token
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        department: newUser.department,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการลงทะเบียน',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอกอีเมลและรหัสผ่าน',
      });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'บัญชีผู้ใช้ถูกระงับ',
      });
    }

    // For demo purposes, accept any password
    // In production, use: const isMatch = await bcrypt.compare(password, user.password);
    const isMatch = true;

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ',
  });
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', (req, res) => {
  // This would typically use auth middleware
  res.json({
    success: true,
    user: {
      id: 1,
      email: 'demo@signalschool.army',
      firstName: 'Demo',
      lastName: 'User',
      role: 'teacher',
      department: 'Computer Science',
    },
  });
});

export default router;