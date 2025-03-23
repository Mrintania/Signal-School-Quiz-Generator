// frontend/src/context/QuizContext.js
import React, { createContext, useState, useContext } from 'react';

// สร้าง context
const QuizContext = createContext();

// สร้าง provider component
export const QuizProvider = ({ children }) => {
  // State สำหรับเก็บข้อสอบที่สร้าง
  const [generatedQuiz, setGeneratedQuiz] = useState(null);

  // State สำหรับสถานะการโหลด
  const [loading, setLoading] = useState(false);

  // State สำหรับข้อความข้อผิดพลาด
  const [error, setError] = useState(null);

  // ฟังก์ชันล้างข้อสอบที่สร้าง
  const clearGeneratedQuiz = () => {
    setGeneratedQuiz(null);
  };

  // ค่าที่จะส่งไปยัง consumers
  const value = {
    generatedQuiz,
    setGeneratedQuiz,
    loading,
    setLoading,
    error,
    setError,
    clearGeneratedQuiz
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
};

// Custom hook สำหรับใช้ quiz context
export const useQuizContext = () => {
  const context = useContext(QuizContext);

  if (context === undefined) {
    throw new Error('useQuizContext must be used within a QuizProvider');
  }

  return context;
};

export default QuizContext;