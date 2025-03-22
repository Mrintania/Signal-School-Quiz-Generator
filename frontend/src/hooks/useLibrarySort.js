import { useState, useCallback, useMemo } from 'react';

export function useLibrarySort(folders, quizzes) {
  const [sortConfig, setSortConfig] = useState({
    key: 'name', // Default sorting by name
    direction: 'asc'  // Default direction is ascending
  });
  
  const requestSort = useCallback((key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);
  
  // Get sorted items based on current sort configuration
  const getSortedItems = useCallback((foldersList, quizzesList) => {
    const combinedItems = [...foldersList, ...quizzesList];
    
    return combinedItems.sort((a, b) => {
      // Variables for comparison
      let aValue, bValue;
      
      // Set values based on sort key
      if (sortConfig.key === 'name') {
        aValue = a.name || a.title || '';
        bValue = b.name || b.title || '';
      } else if (sortConfig.key === 'type') {
        // Folders always come first
        if (a.id && !b.id) return -1;
        if (!a.id && b.id) return 1;
        
        aValue = a.id ? 'Folder' : 'Quiz';
        bValue = b.id ? 'Folder' : 'Quiz';
      } else if (sortConfig.key === 'modified') {
        // Folders don't have modification dates, sort them first
        if (a.id && !b.id) return sortConfig.direction === 'asc' ? -1 : 1;
        if (!a.id && b.id) return sortConfig.direction === 'asc' ? 1 : -1;
        
        aValue = a.created_at || a.updated_at || '';
        bValue = b.created_at || b.updated_at || '';
      }
      
      // Compare and sort
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [sortConfig]);
  
  // Create sorted items using memoization
  const sortedItems = useMemo(() => {
    return getSortedItems(folders, quizzes);
  }, [folders, quizzes, getSortedItems]);
  
  return {
    sortConfig,
    requestSort,
    sortedItems
  };
}