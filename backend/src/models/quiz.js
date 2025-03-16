import { pool } from '../config/db.js';

class Quiz {
  // บันทึกข้อสอบใหม่ลงในฐานข้อมูล
  static async saveQuiz(quizData) {
    const { title, topic, questionType, studentLevel, language, questions } = quizData;
    
    try {
      const connection = await pool.getConnection();
      
      // เริ่ม transaction
      await connection.beginTransaction();
      
      try {
        // เพิ่มข้อมูลเข้าตาราง quizzes
        const [quizResult] = await connection.execute(
          'INSERT INTO quizzes (title, topic, question_type, student_level, language, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [title, topic, questionType, studentLevel, language || 'english'] // ถ้าไม่มีการระบุภาษา ให้เป็นภาษาอังกฤษเป็นค่าเริ่มต้น
        );
        
        const quizId = quizResult.insertId;
        
        // เพิ่มคำถามแต่ละข้อเข้าตาราง questions
        for (const question of questions) {
          const [questionResult] = await connection.execute(
            'INSERT INTO questions (quiz_id, question_text, explanation, created_at) VALUES (?, ?, ?, NOW())',
            [quizId, question.questionText, question.explanation]
          );
          
          const questionId = questionResult.insertId;
          
          // เพิ่มตัวเลือกของแต่ละคำถามเข้าตาราง options
          if (question.options && question.options.length > 0) {
            for (const option of question.options) {
              await connection.execute(
                'INSERT INTO options (question_id, option_text, is_correct, created_at) VALUES (?, ?, ?, NOW())',
                [questionId, option.text, option.isCorrect]
              );
            }
          }
        }
        
        // Commit transaction
        await connection.commit();
        connection.release();
        
        return { success: true, quizId };
      } catch (error) {
        // Rollback transaction หากเกิดข้อผิดพลาด
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      return { success: false, error: error.message };
    }
  }
  
  // ดึงข้อมูลข้อสอบทั้งหมด
  static async getAllQuizzes() {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM quizzes ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  }
  
  // ดึงข้อมูลข้อสอบตาม ID
  static async getQuizById(quizId) {
    try {
      const connection = await pool.getConnection();
      
      // ดึงข้อมูลข้อสอบจากตาราง quizzes
      const [quizRows] = await connection.execute(
        'SELECT * FROM quizzes WHERE id = ?',
        [quizId]
      );
      
      if (quizRows.length === 0) {
        connection.release();
        return null;
      }
      
      const quiz = quizRows[0];
      
      // ดึงคำถามทั้งหมดของข้อสอบ
      const [questionRows] = await connection.execute(
        'SELECT * FROM questions WHERE quiz_id = ?',
        [quizId]
      );
      
      const questions = [];
      
      // ดึงตัวเลือกของแต่ละคำถาม
      for (const question of questionRows) {
        const [optionRows] = await connection.execute(
          'SELECT * FROM options WHERE question_id = ?',
          [question.id]
        );
        
        questions.push({
          id: question.id,
          questionText: question.question_text,
          explanation: question.explanation,
          options: optionRows.map(option => ({
            id: option.id,
            text: option.option_text,
            isCorrect: option.is_correct === 1
          }))
        });
      }
      
      connection.release();
      
      return {
        ...quiz,
        questions
      };
    } catch (error) {
      console.error('Error fetching quiz by ID:', error);
      throw error;
    }
  }
  
  // ลบข้อสอบ
  static async deleteQuiz(quizId) {
    try {
      const connection = await pool.getConnection();
      
      await connection.beginTransaction();
      
      try {
        // ดึงคำถามทั้งหมดของข้อสอบ
        const [questionRows] = await connection.execute(
          'SELECT id FROM questions WHERE quiz_id = ?',
          [quizId]
        );
        
        // ลบตัวเลือกของแต่ละคำถาม
        for (const question of questionRows) {
          await connection.execute(
            'DELETE FROM options WHERE question_id = ?',
            [question.id]
          );
        }
        
        // ลบคำถามทั้งหมดของข้อสอบ
        await connection.execute(
          'DELETE FROM questions WHERE quiz_id = ?',
          [quizId]
        );
        
        // ลบข้อสอบ
        await connection.execute(
          'DELETE FROM quizzes WHERE id = ?',
          [quizId]
        );
        
        await connection.commit();
        connection.release();
        
        return { success: true };
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      return { success: false, error: error.message };
    }
  }
  // เปลี่ยนชื่อข้อสอบ
  static async renameQuiz(quizId, newTitle) {
    try {
      const [result] = await pool.execute(
        'UPDATE quizzes SET title = ?, updated_at = NOW() WHERE id = ?',
        [newTitle, quizId]
      );
      
      if (result.affectedRows === 0) {
        return { success: false, error: 'Quiz not found' };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error renaming quiz:', error);
      return { success: false, error: error.message };
    }
  }
  
  // ตรวจสอบชื่อข้อสอบซ้ำ
  static async checkDuplicateTitle(title) {
    try {
      // ค้นหาข้อสอบที่มีชื่อเหมือนกัน หรือขึ้นต้นด้วยชื่อเดียวกันแล้วตามด้วย _ตัวเลข
      const [rows] = await pool.execute(
        'SELECT title FROM quizzes WHERE title = ? OR title LIKE ?',
        [title, `${title}\\_%`]
      );
      
      if (rows.length === 0) {
        // ถ้าไม่มีชื่อซ้ำ ให้ใช้ชื่อเดิมได้เลย
        return { 
          isDuplicate: false, 
          suggestedTitle: title 
        };
      }
      
      // สร้างรายการชื่อทั้งหมดที่มี
      const existingTitles = rows.map(row => row.title);
      
      // ถ้ามีชื่อซ้ำ ให้สร้างชื่อใหม่โดยเพิ่ม _ตัวเลขเรียงลำดับ
      let counter = 1;
      let newTitle = `${title}_${counter}`;
      
      // ตรวจสอบจนกว่าจะพบชื่อที่ไม่ซ้ำ
      while (existingTitles.includes(newTitle)) {
        counter++;
        newTitle = `${title}_${counter}`;
      }
      
      return { 
        isDuplicate: true, 
        suggestedTitle: newTitle 
      };
    } catch (error) {
      console.error('Error checking duplicate title:', error);
      // ถ้าเกิดข้อผิดพลาด ให้แนะนำชื่อเดิมไปก่อน
      return { 
        isDuplicate: false, 
        suggestedTitle: title 
      };
    }
  }
}

export default Quiz;