import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFolders } from '../hooks/useFolders';
import { useQuizzes } from '../hooks/useQuizzes';
import { useLibrarySort } from '../hooks/useLibrarySort';
import { useAuth } from './AuthContext';

const LibraryContext = createContext();

export function LibraryProvider({ children }) {
    const { currentUser, isAuthenticated } = useAuth();
    const [searchParams] = useSearchParams();
    const [currentFolder, setCurrentFolder] = useState('root');
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState(null);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const folderTools = useFolders();
    const quizTools = useQuizzes();

    useEffect(() => {
        console.log('LibraryContext Debug:', {
            isAuthenticated,
            currentUser: currentUser?.id,
            quizzesCount: quizTools.quizzes?.length,
            loading: quizTools.loading,
            error: quizTools.error
        });
    }, [isAuthenticated, currentUser, quizTools.quizzes, quizTools.loading, quizTools.error]);

    useEffect(() => {
        if (quizTools.error) {
            setError(quizTools.error);
        }
    }, [quizTools.error]);

    const filteredFolders = folderTools.folders?.filter(folder =>
        folder.parentId === currentFolder && folder.id !== 'root'
    ) || [];

    const filteredQuizzes = quizTools.quizzes?.filter(quiz => {
        const folderMatch = quiz.folderId === currentFolder ||
            (currentFolder === 'root' && (!quiz.folderId || quiz.folderId === 'root'));

        const searchMatch = !searchTerm ||
            quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (quiz.topic && quiz.topic.toLowerCase().includes(searchTerm.toLowerCase()));

        return folderMatch && searchMatch;
    }) || [];

    const sortTools = useLibrarySort(filteredFolders, filteredQuizzes);

    useEffect(() => {
        setTotalItems(sortTools.sortedItems?.length || 0);
    }, [sortTools.sortedItems]);

    const changeFolder = (folderId) => {
        setCurrentFolder(folderId);
        setSearchTerm('');
        setCurrentPage(1);
    };

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    useEffect(() => {
        const folderParam = searchParams.get('folder');
        if (folderParam) {
            setCurrentFolder(folderParam);
        } else {
            setCurrentFolder('root');
        }
    }, [searchParams]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const refreshData = () => {
        setError(null);
        if (quizTools.refreshQuizzes) {
            quizTools.refreshQuizzes();
        }
    };

    const contextValue = {
        folders: folderTools.folders || [],
        currentFolder,
        changeFolder,
        quizzes: quizTools.quizzes || [],
        loading: quizTools.loading || folderTools.loading || false,
        error: error || quizTools.error || folderTools.error,
        setError,
        searchTerm,
        setSearchTerm,
        ...sortTools,
        currentPage,
        itemsPerPage,
        totalItems,
        paginate,
        setCurrentPage,
        setItemsPerPage,
        successMessage,
        setSuccessMessage,
        refreshData,
        fetchQuizzes: quizTools.fetchQuizzes,
        addQuiz: quizTools.addQuiz,
        updateQuiz: quizTools.updateQuiz,
        deleteQuiz: quizTools.deleteQuiz,
        selectQuiz: quizTools.selectQuiz,
        selectedQuiz: quizTools.selectedQuiz,
        clearSelection: quizTools.clearSelection,
        addFolder: folderTools.addFolder,
        updateFolder: folderTools.updateFolder,
        deleteFolder: folderTools.deleteFolder,
        selectFolder: folderTools.selectFolder,
        selectedFolder: folderTools.selectedFolder,
        currentUser,
        isAuthenticated
    };

    return (
        <LibraryContext.Provider value={contextValue}>
            {children}
        </LibraryContext.Provider>
    );
}

export function useLibrary() {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error('useLibrary must be used within a LibraryProvider');
    }
    return context;
}

export default LibraryContext;