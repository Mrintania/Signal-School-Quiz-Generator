import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFolders } from '../hooks/useFolders';
import { useQuizzes } from '../hooks/useQuizzes';
import { useLibrarySort } from '../hooks/useLibrarySort';

// Create context
const LibraryContext = createContext();

// Provider component
export function LibraryProvider({ children }) {
    const [searchParams] = useSearchParams();
    const [currentFolder, setCurrentFolder] = useState('root');
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // Initialize hooks
    const folderTools = useFolders();
    const quizTools = useQuizzes();

    // Get filtered items based on current folder and search term
    const filteredFolders = folderTools.folders.filter(folder =>
        folder.parentId === currentFolder && folder.id !== 'root'
    );

    const filteredQuizzes = quizTools.quizzes.filter(quiz => {
        // Filter by current folder
        const folderMatch = quiz.folderId === currentFolder ||
            (currentFolder === 'root' && (!quiz.folderId || quiz.folderId === 'root'));

        // Filter by search term if provided
        const searchMatch = !searchTerm ||
            quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (quiz.topic && quiz.topic.toLowerCase().includes(searchTerm.toLowerCase()));

        return folderMatch && searchMatch;
    });

    // Use sort hook
    const sortTools = useLibrarySort(filteredFolders, filteredQuizzes);

    // Set total items count
    useEffect(() => {
        setTotalItems(sortTools.sortedItems.length);
    }, [sortTools.sortedItems]);

    // Function to change current folder
    const changeFolder = (folderId) => {
        setCurrentFolder(folderId);
        setSearchTerm('');
        setCurrentPage(1);
    };

    // Pagination function
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Update current folder based on URL parameter
    useEffect(() => {
        const folderParam = searchParams.get('folder');
        if (folderParam) {
            setCurrentFolder(folderParam);
        } else {
            setCurrentFolder('root');
        }
    }, [searchParams]);

    // Clear success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Combine success messages from different hooks
    useEffect(() => {
        if (folderTools.successMessage) {
            setSuccessMessage(folderTools.successMessage);
            folderTools.setSuccessMessage(null);
        }
    }, [folderTools.successMessage]);

    // Context value
    const contextValue = {
        currentFolder,
        changeFolder,
        searchTerm,
        setSearchTerm,
        successMessage,
        setSuccessMessage,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        totalItems,
        paginate,
        ...folderTools,
        ...quizTools,
        ...sortTools
    };

    return (
        <LibraryContext.Provider value={contextValue}>
            {children}
        </LibraryContext.Provider>
    );
}

// Custom hook to use the library context
export function useLibrary() {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error('useLibrary must be used within a LibraryProvider');
    }
    return context;
}