// backend/routes/subjects.js
import express from 'express';

const router = express.Router();

// Sample subjects data specific to Signal School
const subjects = [
  {
    id: 1,
    name: 'วิทยาการคอมพิวเตอร์',
    nameEn: 'Computer Science',
    code: 'CS',
    description: 'พื้นฐานวิทยาการคอมพิวเตอร์ การเขียนโปรแกรม และเทคโนโลยีสารสนเทศ',
    department: 'กรมการทหารสื่อสาร',
    topics: [
      'การเขียนโปรแกรม',
      'โครงสร้างข้อมูล',
      'อัลกอริทึม',
      'ฐานข้อมูล',
      'เครือข่ายคอมพิวเตอร์'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'ปัญญาประดิษฐ์',
    nameEn: 'Artificial Intelligence',
    code: 'AI',
    description: 'หลักการและการประยุกต์ใช้ปัญญาประดิษฐ์ในงานทหารสื่อสาร',
    department: 'กรมการทหารสื่อสาร',
    topics: [
      'Machine Learning',
      'Deep Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Neural Networks'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 3,
    name: 'เทคโนโลยีสารสนเทศ',
    nameEn: 'Information Technology',
    code: 'IT',
    description: 'ระบบสารสนเทศ การจัดการข้อมูล และเทคโนโลยีสำหรับงานทหาร',
    department: 'กรมการทหารสื่อสาร',
    topics: [
      'ระบบสารสนเทศ',
      'การจัดการข้อมูล',
      'ความปลอดภัยทางไซเบอร์',
      'ระบบเครือข่าย',
      'การพัฒนาซอฟต์แวร์'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 4,
    name: 'การสื่อสารทหาร',
    nameEn: 'Military Communications',
    code: 'MC',
    description: 'ระบบการสื่อสารทางทหาร เทคโนโลยีสื่อสาร และการรักษาความปลอดภัย',
    department: 'กรมการทหารสื่อสาร',
    topics: [
      'ระบบสื่อสารวิทยุ',
      'การเข้ารหัส',
      'เครือข่ายทหาร',
      'ระบบดาวเทียม',
      'การรักษาความปลอดภัยการสื่อสาร'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 5,
    name: 'ความปลอดภัยเครือข่าย',
    nameEn: 'Network Security',
    code: 'NS',
    description: 'หลักการรักษาความปลอดภัยเครือข่าย การป้องกันภัยไซเบอร์',
    department: 'กรมการทหารสื่อสาร',
    topics: [
      'Cybersecurity',
      'Firewall',
      'Intrusion Detection',
      'Cryptography',
      'Security Protocols'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 6,
    name: 'คณิตศาสตร์ประยุกต์',
    nameEn: 'Applied Mathematics',
    code: 'MATH',
    description: 'คณิตศาสตร์สำหรับงานด้านวิศวกรรมและเทคโนโลยี',
    department: 'กรมการทหารสื่อสาร',
    topics: [
      'สถิติและความน่าจะเป็น',
      'แคลคูลัส',
      'พีชคณิตเชิงเส้น',
      'คณิตศาสตร์ดีสครีต',
      'การวิเคราะห์เชิงตัวเลข'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 7,
    name: 'ภาษาอังกฤษเทคนิค',
    nameEn: 'Technical English',
    code: 'ENG',
    description: 'ภาษาอังกฤษสำหรับงานด้านเทคนิคและเทคโนโลยี',
    department: 'กรมการทหารสื่อสาร',
    topics: [
      'Technical Writing',
      'Technical Vocabulary',
      'Documentation',
      'Presentation Skills',
      'Communication Skills'
    ],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  }
];

// @route   GET /api/subjects
// @desc    Get all subjects
// @access  Private
router.get('/', (req, res) => {
  const { department, isActive, search } = req.query;
  
  let filteredSubjects = [...subjects];
  
  if (department) {
    filteredSubjects = filteredSubjects.filter(subject => 
      subject.department.includes(department)
    );
  }
  
  if (isActive !== undefined) {
    filteredSubjects = filteredSubjects.filter(subject => 
      subject.isActive === (isActive === 'true')
    );
  }
  
  if (search) {
    filteredSubjects = filteredSubjects.filter(subject => 
      subject.name.toLowerCase().includes(search.toLowerCase()) ||
      subject.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      subject.code.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json({
    success: true,
    data: filteredSubjects,
    count: filteredSubjects.length,
  });
});

// @route   GET /api/subjects/:id
// @desc    Get subject by ID
// @access  Private
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const subject = subjects.find(s => s.id === parseInt(id));

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบวิชาที่ต้องการ',
    });
  }

  res.json({
    success: true,
    data: subject,
  });
});

// @route   GET /api/subjects/:id/topics
// @desc    Get topics for a specific subject
// @access  Private
router.get('/:id/topics', (req, res) => {
  const { id } = req.params;
  const subject = subjects.find(s => s.id === parseInt(id));

  if (!subject) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบวิชาที่ต้องการ',
    });
  }

  res.json({
    success: true,
    data: {
      subjectId: subject.id,
      subjectName: subject.name,
      topics: subject.topics,
    },
  });
});

// @route   POST /api/subjects
// @desc    Create new subject
// @access  Private (Admin only)
router.post('/', (req, res) => {
  const { name, nameEn, code, description, department, topics } = req.body;

  // Validation
  if (!name || !nameEn || !code) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน',
    });
  }

  // Check if subject code already exists
  const existingSubject = subjects.find(s => s.code === code);
  if (existingSubject) {
    return res.status(400).json({
      success: false,
      error: 'รหัสวิชานี้มีอยู่ในระบบแล้ว',
    });
  }

  const newSubject = {
    id: subjects.length + 1,
    name,
    nameEn,
    code,
    description: description || '',
    department: department || 'กรมการทหารสื่อสาร',
    topics: topics || [],
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  subjects.push(newSubject);

  res.status(201).json({
    success: true,
    message: 'สร้างวิชาใหม่สำเร็จ',
    data: newSubject,
  });
});

// @route   PUT /api/subjects/:id
// @desc    Update subject
// @access  Private (Admin only)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const subjectIndex = subjects.findIndex(s => s.id === parseInt(id));

  if (subjectIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบวิชาที่ต้องการแก้ไข',
    });
  }

  const updatedSubject = {
    ...subjects[subjectIndex],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  subjects[subjectIndex] = updatedSubject;

  res.json({
    success: true,
    message: 'อัพเดทวิชาสำเร็จ',
    data: updatedSubject,
  });
});

// @route   DELETE /api/subjects/:id
// @desc    Delete subject
// @access  Private (Admin only)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const subjectIndex = subjects.findIndex(s => s.id === parseInt(id));

  if (subjectIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบวิชาที่ต้องการลบ',
    });
  }

  subjects.splice(subjectIndex, 1);

  res.json({
    success: true,
    message: 'ลบวิชาสำเร็จ',
  });
});

// @route   GET /api/subjects/departments
// @desc    Get all departments
// @access  Private
router.get('/meta/departments', (req, res) => {
  const departments = [...new Set(subjects.map(s => s.department))];
  
  res.json({
    success: true,
    data: departments,
  });
});

export default router;