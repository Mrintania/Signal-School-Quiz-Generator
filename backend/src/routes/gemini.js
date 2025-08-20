// backend/routes/gemini.js
import express from 'express';
import config from '../config/config.js';

const router = express.Router();

// Mock Gemini AI response for demo
const generateMockQuestions = (topic, count, difficulty, questionType) => {
  const questions = [];
  
  for (let i = 1; i <= count; i++) {
    if (questionType === 'multiple_choice') {
      questions.push({
        id: i,
        question: `คำถาม ${questionType} เกี่ยวกับ ${topic} ข้อที่ ${i}`,
        type: 'multiple_choice',
        options: [
          `ตัวเลือกที่ 1 สำหรับ ${topic}`,
          `ตัวเลือกที่ 2 สำหรับ ${topic}`,
          `ตัวเลือกที่ 3 สำหรับ ${topic}`,
          `ตัวเลือกที่ 4 สำหรับ ${topic}`
        ],
        correctAnswer: 0,
        explanation: `คำอธิบายสำหรับคำถามเกี่ยวกับ ${topic}`,
        difficulty: difficulty
      });
    } else if (questionType === 'true_false') {
      questions.push({
        id: i,
        question: `คำถาม จริง/เท็จ เกี่ยวกับ ${topic} ข้อที่ ${i}`,
        type: 'true_false',
        options: ['จริง', 'เท็จ'],
        correctAnswer: 0,
        explanation: `คำอธิบายสำหรับคำถามเกี่ยวกับ ${topic}`,
        difficulty: difficulty
      });
    } else if (questionType === 'short_answer') {
      questions.push({
        id: i,
        question: `คำถาม คำตอบสั้น เกี่ยวกับ ${topic} ข้อที่ ${i}`,
        type: 'short_answer',
        correctAnswer: `คำตอบสำหรับ ${topic}`,
        explanation: `คำอธิบายสำหรับคำถามเกี่ยวกับ ${topic}`,
        difficulty: difficulty
      });
    }
  }
  
  return questions;
};

// @route   POST /api/gemini/generate-questions
// @desc    Generate questions using Gemini AI
// @access  Private
router.post('/generate-questions', async (req, res) => {
  try {
    const {
      topic,
      count = 5,
      difficulty = 'medium',
      questionType = 'multiple_choice',
      language = 'th',
      additionalInstructions = ''
    } = req.body;

    // Validation
    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุหัวข้อที่ต้องการสร้างข้อสอบ',
      });
    }

    if (count < 1 || count > 50) {
      return res.status(400).json({
        success: false,
        error: 'จำนวนข้อสอบต้องอยู่ระหว่าง 1-50 ข้อ',
      });
    }

    // For demo purposes, return mock data
    // In production, this would call the actual Gemini AI API
    const questions = generateMockQuestions(topic, count, difficulty, questionType);

    res.json({
      success: true,
      message: 'สร้างข้อสอบด้วย AI สำเร็จ',
      data: {
        topic,
        count,
        difficulty,
        questionType,
        language,
        questions,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Gemini AI error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างข้อสอบด้วย AI',
    });
  }
});

// @route   POST /api/gemini/improve-question
// @desc    Improve existing question using Gemini AI
// @access  Private
router.post('/improve-question', async (req, res) => {
  try {
    const { question, improvementType = 'clarity' } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุคำถามที่ต้องการปรับปรุง',
      });
    }

    // Mock improved question
    const improvedQuestion = {
      ...question,
      question: `[ปรับปรุงแล้ว] ${question.question}`,
      explanation: `[คำอธิบายที่ปรับปรุงแล้ว] ${question.explanation || 'คำอธิบายที่ชัดเจนมากขึ้น'}`,
      improvedAt: new Date().toISOString(),
      improvementType,
    };

    res.json({
      success: true,
      message: 'ปรับปรุงคำถามสำเร็จ',
      data: {
        original: question,
        improved: improvedQuestion,
      },
    });

  } catch (error) {
    console.error('Question improvement error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการปรับปรุงคำถาม',
    });
  }
});

// @route   POST /api/gemini/analyze-content
// @desc    Analyze content and suggest quiz topics
// @access  Private
router.post('/analyze-content', async (req, res) => {
  try {
    const { content, contentType = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุเนื้อหาที่ต้องการวิเคราะห์',
      });
    }

    // Mock analysis results
    const analysis = {
      suggestedTopics: [
        'พื้นฐานการเขียนโปรแกรม',
        'โครงสร้างข้อมูล',
        'อัลกอริทึม',
        'ระบบฐานข้อมูล'
      ],
      keyTerms: [
        'Algorithm',
        'Data Structure',
        'Programming',
        'Database'
      ],
      suggestedDifficulties: ['easy', 'medium'],
      estimatedQuestionCount: Math.floor(content.length / 100),
      contentType,
      analyzedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      message: 'วิเคราะห์เนื้อหาสำเร็จ',
      data: analysis,
    });

  } catch (error) {
    console.error('Content analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการวิเคราะห์เนื้อหา',
    });
  }
});

// @route   GET /api/gemini/usage
// @desc    Get AI usage statistics
// @access  Private
router.get('/usage', (req, res) => {
  // Mock usage data
  const usage = {
    questionsGenerated: 245,
    questionsImproved: 67,
    contentAnalyzed: 23,
    remainingQuota: 1000,
    usageThisMonth: {
      questionsGenerated: 45,
      questionsImproved: 12,
      contentAnalyzed: 5,
    },
    lastUsed: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: usage,
  });
});

export default router;