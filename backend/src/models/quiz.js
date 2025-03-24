import { pool } from '../config/db.js';

class Quiz {
  // Save a new quiz to the database
  static async saveQuiz(quizData) {
    const { title, topic, questionType, studentLevel, language, questions, userId } = quizData;
    const connection = await pool.getConnection();
  
    try {
      // Start transaction
      await connection.beginTransaction();
  
      // Insert quiz with user_id
      const [quizResult] = await connection.execute(
        'INSERT INTO quizzes (title, topic, question_type, student_level, language, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [title, topic, questionType, studentLevel, language || 'english', userId]
      );
  
      const quizId = quizResult.insertId;
  
      // Insert questions
      for (const question of questions) {
        const [questionResult] = await connection.execute(
          'INSERT INTO questions (quiz_id, question_text, explanation, created_at) VALUES (?, ?, ?, NOW())',
          [quizId, question.questionText, question.explanation]
        );
  
        const questionId = questionResult.insertId;
  
        // Insert options for multiple choice questions
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
      return { success: true, quizId };
    } catch (error) {
      // Rollback on error
      await connection.rollback();
      console.error('Error saving quiz:', error);
      console.error('Quiz data:', JSON.stringify({
        title, topic, questionType, studentLevel, language, userId,
        questionCount: questions?.length
      }));
      return { success: false, error: error.message };
    } finally {
      connection.release();
    }
  }

  // Get all quizzes with pagination
  static async getAllQuizzes(limit = 10, offset = 0) {
    try {
      // Get total count first
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as total FROM quizzes'
      );
      
      const total = countRows[0].total;
      
      // Then get paginated data
      const [rows] = await pool.execute(
        'SELECT * FROM quizzes ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      return {
        quizzes: rows,
        total
      };
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  }

  // Get a quiz by ID with all questions and options
  static async getQuizById(quizId) {
    const connection = await pool.getConnection();
    
    try {
      // Get quiz data
      const [quizRows] = await connection.execute(
        'SELECT * FROM quizzes WHERE id = ?',
        [quizId]
      );

      if (quizRows.length === 0) {
        return null;
      }

      const quiz = quizRows[0];

      // Get all questions for this quiz
      const [questionRows] = await connection.execute(
        'SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC',
        [quizId]
      );

      const questions = [];

      // Get options for each question
      for (const question of questionRows) {
        const [optionRows] = await connection.execute(
          'SELECT * FROM options WHERE question_id = ? ORDER BY id ASC',
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

      return {
        ...quiz,
        questions
      };
    } catch (error) {
      console.error('Error fetching quiz by ID:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Delete a quiz and all related data
  static async deleteQuiz(quizId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get all questions for this quiz
      const [questionRows] = await connection.execute(
        'SELECT id FROM questions WHERE quiz_id = ?',
        [quizId]
      );

      // Delete options for each question
      for (const question of questionRows) {
        await connection.execute(
          'DELETE FROM options WHERE question_id = ?',
          [question.id]
        );
      }

      // Delete all questions
      await connection.execute(
        'DELETE FROM questions WHERE quiz_id = ?',
        [quizId]
      );

      // Delete the quiz
      await connection.execute(
        'DELETE FROM quizzes WHERE id = ?',
        [quizId]
      );

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error('Error deleting quiz:', error);
      return { success: false, error: error.message };
    } finally {
      connection.release();
    }
  }

  // Rename a quiz
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

  // Check for duplicate quiz titles and suggest alternatives
  static async checkDuplicateTitle(title) {
    try {
      // Search for exact match or titles with the same base and numbering
      const [rows] = await pool.execute(
        'SELECT title FROM quizzes WHERE title = ? OR title LIKE ?',
        [title, `${title}\\_%%`]
      );

      if (rows.length === 0) {
        // No duplicates found
        return {
          isDuplicate: false,
          suggestedTitle: title
        };
      }

      // Get all existing titles
      const existingTitles = rows.map(row => row.title);

      // Find the next available number
      let counter = 1;
      let newTitle = `${title}_${counter}`;

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
      // Default to assuming no duplicate if there's an error
      return {
        isDuplicate: false,
        suggestedTitle: title
      };
    }
  }

  // Update quiz questions
  static async updateQuizQuestions(quizId, questions) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verify quiz exists
      const [quizRows] = await connection.execute(
        'SELECT * FROM quizzes WHERE id = ?',
        [quizId]
      );

      if (quizRows.length === 0) {
        await connection.rollback();
        return { success: false, error: 'Quiz not found' };
      }

      // Process only new questions (without an ID)
      for (const question of questions) {
        if (question.id) continue;

        // Insert new question
        const [questionResult] = await connection.execute(
          'INSERT INTO questions (quiz_id, question_text, explanation, created_at) VALUES (?, ?, ?, NOW())',
          [quizId, question.questionText, question.explanation]
        );

        const questionId = questionResult.insertId;

        // Insert options if this is a multiple choice question
        if (question.options && question.options.length > 0) {
          for (const option of question.options) {
            await connection.execute(
              'INSERT INTO options (question_id, option_text, is_correct, created_at) VALUES (?, ?, ?, NOW())',
              [questionId, option.text, option.isCorrect]
            );
          }
        }
      }

      // Update quiz timestamp
      await connection.execute(
        'UPDATE quizzes SET updated_at = NOW() WHERE id = ?',
        [quizId]
      );

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      console.error('Error updating quiz questions:', error);
      return { success: false, error: error.message };
    } finally {
      connection.release();
    }
  }

  // Move quiz to a folder
  static async moveQuiz(quizId, folderId) {
    try {
      const [result] = await pool.execute(
        'UPDATE quizzes SET folder_id = ?, updated_at = NOW() WHERE id = ?',
        [folderId, quizId]
      );

      if (result.affectedRows === 0) {
        return { success: false, error: 'Quiz not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error moving quiz:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Search quizzes by title or topic
  static async searchQuizzes(searchTerm, limit = 10, offset = 0) {
    try {
      // Get total count first
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as total FROM quizzes WHERE title LIKE ? OR topic LIKE ?',
        [`%${searchTerm}%`, `%${searchTerm}%`]
      );
      
      const total = countRows[0].total;
      
      // Then get paginated data
      const [rows] = await pool.execute(
        'SELECT * FROM quizzes WHERE title LIKE ? OR topic LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [`%${searchTerm}%`, `%${searchTerm}%`, limit, offset]
      );
      
      return {
        quizzes: rows,
        total
      };
    } catch (error) {
      console.error('Error searching quizzes:', error);
      throw error;
    }
  }
}

export default Quiz;