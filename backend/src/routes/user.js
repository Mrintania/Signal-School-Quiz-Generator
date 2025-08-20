// backend/routes/users.js
import express from 'express';

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user?.id || 1,
      email: req.user?.email || 'demo@signalschool.army',
      firstName: 'Demo',
      lastName: 'User',
      role: req.user?.role || 'teacher',
      department: req.user?.department || 'Computer Science',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  });
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', (req, res) => {
  const { firstName, lastName, department } = req.body;

  res.json({
    success: true,
    message: 'อัพเดทโปรไฟล์สำเร็จ',
    user: {
      id: req.user?.id || 1,
      email: req.user?.email || 'demo@signalschool.army',
      firstName: firstName || 'Demo',
      lastName: lastName || 'User',
      role: req.user?.role || 'teacher',
      department: department || 'Computer Science',
    },
  });
});

export default router;