import { useState, useEffect, useCallback, useMemo } from 'react';
import { quizService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useQuizzes() {
    const { currentUser } = useAuth();
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchQuizzes = useCallback(async (page = 1, limit = 100, search = '') => {
        if (!currentUser?.id) {
            setQuizzes([]);
            setTotalItems(0);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await quizService.getAllQuizzes(page, limit, {
                search,
                userId: currentUser.id
            });

            if (response.success) {
                const allQuizzes = response.data || [];
                setTotalItems(response.pagination?.total || allQuizzes.length);
                
                const quizzesWithFolder = allQuizzes.map(quiz => ({
                    ...quiz,
                    folderId: quiz.folderId || 'root'
                }));

                setQuizzes(quizzesWithFolder);
            } else {
                setError(response.message || 'Failed to fetch quizzes');
                setQuizzes([]);
            }
        } catch (err) {
            console.error('Error fetching quizzes:', err);
            setError(err.message || 'An error occurred while fetching quizzes');
            setQuizzes([]);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        if (currentUser?.id) {
            fetchQuizzes(1, 100, '');
        } else {
            setQuizzes([]);
            setTotalItems(0);
        }
    }, [currentUser?.id, fetchQuizzes]);

    const paginatedQuizzes = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;

        const filteredQuizzes = searchQuery
            ? quizzes.filter(quiz =>
                quiz.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                quiz.topic?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : quizzes;

        return filteredQuizzes.slice(indexOfFirstItem, indexOfLastItem);
    }, [quizzes, currentPage, itemsPerPage, searchQuery]);

    const addQuiz = useCallback((newQuiz) => {
        setQuizzes(prev => [newQuiz, ...prev]);
        setTotalItems(prev => prev + 1);
    }, []);

    const updateQuiz = useCallback((quizId, updatedData) => {
        setQuizzes(prev => prev.map(quiz => 
            quiz.id === quizId ? { ...quiz, ...updatedData } : quiz
        ));
    }, []);

    const deleteQuiz = useCallback((quizId) => {
        setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
        setTotalItems(prev => prev - 1);
    }, []);

    const selectQuiz = useCallback((quiz) => {
        setSelectedQuiz(quiz);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedQuiz(null);
    }, []);

    const searchQuizzes = useCallback((query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    }, []);

    const goToPage = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const goToPreviousPage = useCallback(() => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    }, []);

    const goToNextPage = useCallback(() => {
        const maxPage = Math.ceil(totalItems / itemsPerPage);
        setCurrentPage(prev => Math.min(prev + 1, maxPage));
    }, [totalItems, itemsPerPage]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    const refreshQuizzes = useCallback(() => {
        if (currentUser?.id) {
            fetchQuizzes(currentPage, itemsPerPage, searchQuery);
        }
    }, [currentUser?.id, currentPage, itemsPerPage, searchQuery, fetchQuizzes]);

    return {
        quizzes,
        paginatedQuizzes,
        selectedQuiz,
        loading,
        error,
        currentPage,
        itemsPerPage,
        totalItems,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        searchQuery,
        fetchQuizzes,
        addQuiz,
        updateQuiz,
        deleteQuiz,
        selectQuiz,
        clearSelection,
        searchQuizzes,
        goToPage,
        goToPreviousPage,
        goToNextPage,
        setItemsPerPage,
        refreshQuizzes
    };
}
