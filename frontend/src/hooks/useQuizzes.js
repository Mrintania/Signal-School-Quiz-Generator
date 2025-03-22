import { useState, useEffect, useCallback } from 'react';
import { quizService } from '../services/api';

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await quizService.getAllQuizzes();
      
      if (response.success) {
        // Add folderId if not exists
        const quizzesWithFolder = response.data.map(quiz => ({
          ...quiz,
          folderId: quiz.folderId || 'root'
        }));
        
        setQuizzes(quizzesWithFolder);
      } else {
        setError(response.message || 'Failed to fetch quizzes');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching quizzes');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const deleteQuiz = useCallback(async (quizId) => {
    if (!quizId) return { success: false };
    
    try {
      setLoading(true);
      const response = await quizService.deleteQuiz(quizId);
      
      if (response.success) {
        // Update local state
        setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.id !== quizId));
        return { success: true };
      } else {
        setError(response.message || 'Failed to delete quiz');
        return { success: false, message: response.message };
      }
    } catch (err) {
      setError(err.message || 'An error occurred while deleting quiz');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);
  
  const renameQuiz = useCallback(async (quizId, newTitle) => {
    if (!quizId || !newTitle.trim()) return { success: false };
    
    try {
      setLoading(true);
      const response = await quizService.renameQuiz(quizId, newTitle);
      
      if (response.success) {
        // Update local state
        setQuizzes(prevQuizzes => 
          prevQuizzes.map(quiz => 
            quiz.id === quizId ? { ...quiz, title: newTitle } : quiz
          )
        );
        return { success: true };
      } else {
        setError(response.message || 'Failed to rename quiz');
        return { success: false, message: response.message };
      }
    } catch (err) {
      setError(err.message || 'An error occurred while renaming quiz');
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);
  
  const moveQuiz = useCallback((quizId, folderId) => {
    try {
      // Instead of API request, use localStorage
      const quizFolders = JSON.parse(localStorage.getItem('quizFolders') || '{}');
      
      // Save information about which quiz is in which folder
      quizFolders[quizId] = folderId;
      localStorage.setItem('quizFolders', JSON.stringify(quizFolders));
      
      // Update UI
      setQuizzes(prevQuizzes =>
        prevQuizzes.map(quiz =>
          quiz.id === quizId ? { ...quiz, folderId: folderId } : quiz
        )
      );
      
      window.dispatchEvent(new Event('storage'));
      
      return { success: true };
    } catch (err) {
      setError(err.message || 'An error occurred while moving quiz');
      return { success: false, message: err.message };
    }
  }, []);
  
  // Initialize quizzes on component mount
  useEffect(() => {
    fetchQuizzes().then(() => {
      // After fetching quizzes, check localStorage for folder assignments
      const quizFolders = JSON.parse(localStorage.getItem('quizFolders') || '{}');
      
      // Update folder IDs based on localStorage
      setQuizzes(prevQuizzes => prevQuizzes.map(quiz => {
        if (quizFolders[quiz.id]) {
          return { ...quiz, folderId: quizFolders[quiz.id] };
        }
        return quiz;
      }));
    });
    
    // Listen for changes in localStorage
    const handleStorageChange = () => {
      const quizFolders = JSON.parse(localStorage.getItem('quizFolders') || '{}');
      
      setQuizzes(prevQuizzes => prevQuizzes.map(quiz => {
        if (quizFolders[quiz.id]) {
          return { ...quiz, folderId: quizFolders[quiz.id] };
        }
        return quiz;
      }));
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchQuizzes]);
  
  return {
    quizzes,
    selectedQuiz,
    setSelectedQuiz,
    loading,
    error,
    setError,
    fetchQuizzes,
    deleteQuiz,
    renameQuiz,
    moveQuiz
  };
}