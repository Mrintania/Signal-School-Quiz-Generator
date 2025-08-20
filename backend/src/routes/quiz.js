// backend/routes/quiz.js
import express from 'express';

const router = express.Router();

// Sample quiz data
const sampleQuizzes = [
  {
    id: 1,
    title: 'ข้อสอบ Computer Science พื้นฐาน',
    description: 'ข้อสอบทดสอบความรู้พื้นฐานด้านวิทยาการคอมพิวเตอร์',
    subject: 'Computer Science',
    difficulty: 'medium',
    questionCount: 10,
    timeLimit: 60,
    createdBy: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    questions: [
      {
        id: 1,
        question: 'Algorithm คืออะไร?',
        type: 'multiple_choice',
        options: [
          'ชุดคำสั่งที่มีลำดับขั้นตอนการทำงาน',
          'ภาษาโปรแกรม',
          'ระบบปฏิบัติการ',
          'ฐานข้อมูล'
        ],
        correctAnswer: 0,
        explanation: 'Algorithm คือ ชุดคำสั่งที่มีลำดับขั้นตอนการทำงานอย่างชัดเจน'
      }
    ]
  }
];

// @route   GET /api/quiz
// @desc    Get all quizzes
// @access  Private
router.get('/', (req, res) => {
  const { subject, difficulty, page = 1, limit = 10 } = req.query;
  
  let filteredQuizzes = [...sampleQuizzes];
  
  if (subject) {
    filteredQuizzes = filteredQuizzes.filter(quiz => 
      quiz.subject.toLowerCase().includes(subject.toLowerCase())
    );
  }
  
  if (difficulty) {
    filteredQuizzes = filteredQuizzes.filter(quiz => 
      quiz.difficulty === difficulty
    );
  }

  res.json({
    success: true,
    data: filteredQuizzes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: filteredQuizzes.length,
      pages: Math.ceil(filteredQuizzes.length / limit),
    },
  });
});

// @route   GET /api/quiz/:id
// @desc    Get quiz by ID
// @access  Private
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const quiz = sampleQuizzes.find(q => q.id === parseInt(id));

  if (!quiz) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบข้อสอบที่ต้องการ',
    });
  }

  res.json({
    success: true,
    data: quiz,
  });
});

// @route   POST /api/quiz
// @desc    Create new quiz
// @access  Private
router.post('/', (req, res) => {
  const {
    title,
    description,
    subject,
    difficulty,
    timeLimit,
    questions
  } = req.body;

  // Validation
  if (!title || !subject || !questions || questions.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน',
    });
  }

  const newQuiz = {
    id: sampleQuizzes.length + 1,
    title,
    description: description || '',
    subject,
    difficulty: difficulty || 'medium',
    questionCount: questions.length,
    timeLimit: timeLimit || 60,
    createdBy: req.user?.id || 1,
    createdAt: new Date().toISOString(),
    questions: questions.map((q, index) => ({
      id: index + 1,
      ...q
    }))
  };

  sampleQuizzes.push(newQuiz);

  res.status(201).json({
    success: true,
    message: 'สร้างข้อสอบสำเร็จ',
    data: newQuiz,
  });
});

// @route   PUT /api/quiz/:id
// @desc    Update quiz
// @access  Private
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const quizIndex = sampleQuizzes.findIndex(q => q.id === parseInt(id));

  if (quizIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบข้อสอบที่ต้องการแก้ไข',
    });
  }

  const updatedQuiz = {
    ...sampleQuizzes[quizIndex],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  sampleQuizzes[quizIndex] = updatedQuiz;

  res.json({
    success: true,
    message: 'อัพเดทข้อสอบสำเร็จ',
    data: updatedQuiz,
  });
});

// @route   DELETE /api/quiz/:id
// @desc    Delete quiz
// @access  Private
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const quizIndex = sampleQuizzes.findIndex(q => q.id === parseInt(id));

  if (quizIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'ไม่พบข้อสอบที่ต้องการลบ',
    });
  }

  sampleQuizzes.splice(quizIndex, 1);

  res.json({
    success: true,
    message: 'ลบข้อสอบสำเร็จ',
  });
});

export default router;