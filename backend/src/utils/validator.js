// backend/src/middleware/validation.js
const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validation Schemas สำหรับ Quiz Generator
 */

// Schema สำหรับข้อสอบ
const quizSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'ชื่อข้อสอบต้องมีอย่างน้อย 3 ตัวอักษร',
      'string.max': 'ชื่อข้อสอบต้องไม่เกิน 200 ตัวอักษร',
      'any.required': 'กรุณาระบุชื่อข้อสอบ'
    }),

  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'คำอธิบายต้องไม่เกิน 1000 ตัวอักษร'
    }),

  subject: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'วิชาต้องมีอย่างน้อย 2 ตัวอักษร',
      'string.max': 'วิชาต้องไม่เกิน 100 ตัวอักษร',
      'any.required': 'กรุณาระบุวิชา'
    }),

  grade_level: Joi.string()
    .valid('มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3',
      'มัธยมศึกษาปีที่ 4', 'มัธยมศึกษาปีที่ 5', 'มัธยมศึกษาปีที่ 6',
      'ประกาศนียบัตรวิชาชีพ', 'อนุปริญญา', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก')
    .required()
    .messages({
      'any.only': 'กรุณาเลือกระดับชั้นที่ถูกต้อง',
      'any.required': 'กรุณาระบุระดับชั้น'
    }),

  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .required()
    .messages({
      'any.only': 'ระดับความยากต้องเป็น easy, medium, หรือ hard',
      'any.required': 'กรุณาระบุระดับความยาก'
    }),

  time_limit: Joi.number()
    .integer()
    .min(5)
    .max(300)
    .allow(null)
    .messages({
      'number.base': 'เวลาจำกัดต้องเป็นตัวเลข',
      'number.integer': 'เวลาจำกัดต้องเป็นจำนวนเต็ม',
      'number.min': 'เวลาจำกัดต้องอย่างน้อย 5 นาที',
      'number.max': 'เวลาจำกัดต้องไม่เกิน 300 นาที'
    }),

  total_points: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .allow(null)
    .messages({
      'number.base': 'คะแนนรวมต้องเป็นตัวเลข',
      'number.integer': 'คะแนนรวมต้องเป็นจำนวนเต็ม',
      'number.min': 'คะแนนรวมต้องอย่างน้อย 1 คะแนน',
      'number.max': 'คะแนนรวมต้องไม่เกิน 1000 คะแนน'
    }),

  is_public: Joi.boolean()
    .default(false),

  tags: Joi.array()
    .items(Joi.string().max(50))
    .max(10)
    .messages({
      'array.max': 'สามารถมี tag ได้ไม่เกิน 10 รายการ'
    })
});

// Schema สำหรับคำถาม
const questionSchema = Joi.object({
  question_text: Joi.string()
    .min(5)
    .max(2000)
    .required()
    .messages({
      'string.min': 'คำถามต้องมีอย่างน้อย 5 ตัวอักษร',
      'string.max': 'คำถามต้องไม่เกิน 2000 ตัวอักษร',
      'any.required': 'กรุณาระบุคำถาม'
    }),

  question_type: Joi.string()
    .valid('multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank')
    .required()
    .messages({
      'any.only': 'ประเภทคำถามไม่ถูกต้อง',
      'any.required': 'กรุณาระบุประเภทคำถาม'
    }),

  points: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.base': 'คะแนนต้องเป็นตัวเลข',
      'number.integer': 'คะแนนต้องเป็นจำนวนเต็ม',
      'number.min': 'คะแนนต้องอย่างน้อย 1 คะแนน',
      'number.max': 'คะแนนต้องไม่เกิน 100 คะแนน',
      'any.required': 'กรุณาระบุคะแนน'
    }),

  choices: Joi.when('question_type', {
    is: Joi.string().valid('multiple_choice', 'true_false', 'matching'),
    then: Joi.array()
      .items(Joi.object({
        text: Joi.string().min(1).max(500).required(),
        is_correct: Joi.boolean().required()
      }))
      .min(2)
      .max(10)
      .required()
      .messages({
        'array.min': 'ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก',
        'array.max': 'ตัวเลือกต้องไม่เกิน 10 ตัวเลือก',
        'any.required': 'กรุณาระบุตัวเลือก'
      }),
    otherwise: Joi.forbidden()
  }),

  correct_answer: Joi.when('question_type', {
    is: Joi.string().valid('short_answer', 'essay', 'fill_blank'),
    then: Joi.string().min(1).max(1000).required(),
    otherwise: Joi.forbidden()
  }),

  explanation: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'คำอธิบายต้องไม่เกิน 1000 ตัวอักษร'
    }),

  order_position: Joi.number()
    .integer()
    .min(1)
    .messages({
      'number.base': 'ลำดับคำถามต้องเป็นตัวเลข',
      'number.integer': 'ลำดับคำถามต้องเป็นจำนวนเต็ม',
      'number.min': 'ลำดับคำถามต้องเริ่มจาก 1'
    })
});

// Schema สำหรับการสร้างข้อสอบด้วย AI
const aiGenerationSchema = Joi.object({
  topic: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'หัวข้อต้องมีอย่างน้อย 3 ตัวอักษร',
      'string.max': 'หัวข้อต้องไม่เกิน 200 ตัวอักษร',
      'any.required': 'กรุณาระบุหัวข้อ'
    }),

  subject: Joi.string()
    .min(2)
    .max(100)
    .required(),

  grade_level: Joi.string()
    .valid('มัธยมศึกษาปีที่ 1', 'มัธยมศึกษาปีที่ 2', 'มัธยมศึกษาปีที่ 3',
      'มัธยมศึกษาปีที่ 4', 'มัธยมศึกษาปีที่ 5', 'มัธยมศึกษาปีที่ 6',
      'ประกาศนียบัตรวิชาชีพ', 'อนุปริญญา', 'ปริญญาตรี', 'ปริญญาโท', 'ปริญญาเอก')
    .required(),

  difficulty: Joi.string()
    .valid('easy', 'medium', 'hard')
    .required(),

  question_count: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .required()
    .messages({
      'number.base': 'จำนวนคำถามต้องเป็นตัวเลข',
      'number.integer': 'จำนวนคำถามต้องเป็นจำนวนเต็ม',
      'number.min': 'ต้องมีคำถามอย่างน้อย 1 ข้อ',
      'number.max': 'จำนวนคำถามต้องไม่เกิน 50 ข้อ',
      'any.required': 'กรุณาระบุจำนวนคำถาม'
    }),

  question_types: Joi.array()
    .items(Joi.string().valid('multiple_choice', 'true_false', 'short_answer', 'essay'))
    .min(1)
    .required()
    .messages({
      'array.min': 'ต้องเลือกประเภทคำถามอย่างน้อย 1 ประเภท',
      'any.required': 'กรุณาเลือกประเภทคำถาม'
    }),

  content: Joi.string()
    .max(10000)
    .allow('')
    .messages({
      'string.max': 'เนื้อหาต้องไม่เกิน 10000 ตัวอักษร'
    }),

  learning_objectives: Joi.array()
    .items(Joi.string().max(200))
    .max(10)
    .messages({
      'array.max': 'จุดประสงค์การเรียนรู้ต้องไม่เกิน 10 รายการ'
    })
});

/**
 * Validation Middleware Functions
 */

// Middleware สำหรับ validate ข้อมูลข้อสอบ
const validateQuiz = (req, res, next) => {
  const { error, value } = quizSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Quiz validation failed', {
      errors,
      body: req.body,
      userId: req.user?.id
    });

    return res.status(400).json({
      success: false,
      message: 'ข้อมูลไม่ถูกต้อง',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware สำหรับ validate ข้อมูลคำถาม
const validateQuestion = (req, res, next) => {
  const { error, value } = questionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('Question validation failed', {
      errors,
      body: req.body,
      userId: req.user?.id
    });

    return res.status(400).json({
      success: false,
      message: 'ข้อมูลคำถามไม่ถูกต้อง',
      errors
    });
  }

  // ตรวจสอบความถูกต้องของตัวเลือกสำหรับ multiple choice
  if (value.question_type === 'multiple_choice' && value.choices) {
    const correctAnswers = value.choices.filter(choice => choice.is_correct);
    if (correctAnswers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ต้องมีคำตอบที่ถูกต้องอย่างน้อย 1 ตัวเลือก',
        errors: [{ field: 'choices', message: 'ต้องมีคำตอบที่ถูกต้องอย่างน้อย 1 ตัวเลือก' }]
      });
    }
  }

  // ตรวจสอบ true/false questions
  if (value.question_type === 'true_false' && value.choices) {
    if (value.choices.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'คำถามจริง/เท็จต้องมี 2 ตัวเลือกเท่านั้น',
        errors: [{ field: 'choices', message: 'คำถามจริง/เท็จต้องมี 2 ตัวเลือกเท่านั้น' }]
      });
    }

    const correctAnswers = value.choices.filter(choice => choice.is_correct);
    if (correctAnswers.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'คำถามจริง/เท็จต้องมีคำตอบที่ถูกต้อง 1 ตัวเลือกเท่านั้น',
        errors: [{ field: 'choices', message: 'คำถามจริง/เท็จต้องมีคำตอบที่ถูกต้อง 1 ตัวเลือกเท่านั้น' }]
      });
    }
  }

  req.body = value;
  next();
};

// Middleware สำหรับ validate การสร้างข้อสอบด้วย AI
const validateAIGeneration = (req, res, next) => {
  const { error, value } = aiGenerationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn('AI generation validation failed', {
      errors,
      body: req.body,
      userId: req.user?.id
    });

    return res.status(400).json({
      success: false,
      message: 'ข้อมูลสำหรับสร้างข้อสอบด้วย AI ไม่ถูกต้อง',
      errors
    });
  }

  req.body = value;
  next();
};

// Middleware สำหรับ validate ID parameters
const validateId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: `${paramName} ไม่ถูกต้อง`,
        errors: [{ field: paramName, message: `${paramName} ต้องเป็นตัวเลข` }]
      });
    }

    req.params[paramName] = parseInt(id);
    next();
  };
};

// Middleware สำหรับ validate file uploads
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด',
      errors: [{ field: 'file', message: 'ไม่พบไฟล์ที่อัปโหลด' }]
    });
  }

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/json'
  ];

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'ประเภทไฟล์ไม่ได้รับอนุญาต',
      errors: [{
        field: 'file',
        message: 'อนุญาตเฉพาะไฟล์ PDF, Word Document, Text หรือ JSON เท่านั้น'
      }]
    });
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'ขนาดไฟล์เกินกำหนด',
      errors: [{
        field: 'file',
        message: 'ขนาดไฟล์ต้องไม่เกิน 10MB'
      }]
    });
  }

  next();
};

// Middleware สำหรับ validate pagination
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'หน้าต้องเป็นตัวเลขที่มากกว่า 0',
      errors: [{ field: 'page', message: 'หน้าต้องเป็นตัวเลขที่มากกว่า 0' }]
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'จำนวนรายการต่อหน้าต้องอยู่ระหว่าง 1-100',
      errors: [{ field: 'limit', message: 'จำนวนรายการต่อหน้าต้องอยู่ระหว่าง 1-100' }]
    });
  }

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };

  next();
};

// Middleware สำหรับ validate search queries
const validateSearch = (req, res, next) => {
  const searchSchema = Joi.object({
    q: Joi.string().min(1).max(200).allow(''),
    subject: Joi.string().max(100).allow(''),
    grade_level: Joi.string().allow(''),
    difficulty: Joi.string().valid('easy', 'medium', 'hard').allow(''),
    tags: Joi.string().allow(''),
    sort_by: Joi.string().valid('created_at', 'updated_at', 'title', 'difficulty').default('created_at'),
    sort_order: Joi.string().valid('asc', 'desc').default('desc')
  });

  const { error, value } = searchSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'พารามิเตอร์การค้นหาไม่ถูกต้อง',
      errors
    });
  }

  req.search = value;
  next();
};

module.exports = {
  validateQuiz,
  validateQuestion,
  validateAIGeneration,
  validateId,
  validateFileUpload,
  validatePagination,
  validateSearch,
  // Export schemas สำหรับใช้ในที่อื่น
  schemas: {
    quizSchema,
    questionSchema,
    aiGenerationSchema
  }
};