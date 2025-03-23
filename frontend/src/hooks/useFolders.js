import { useState, useEffect, useCallback } from 'react';

export function useFolders() {
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const fetchFolders = useCallback(() => {
        const storedFolders = JSON.parse(localStorage.getItem('folders') || '[]');

        if (!storedFolders.find(folder => folder.id === 'root')) {
            storedFolders.push({
                id: 'root',
                name: 'My Library',
                color: '#F9E852',
                parentId: null
            });
            localStorage.setItem('folders', JSON.stringify(storedFolders));
        }

        setFolders(storedFolders);
    }, []);

    const createFolder = useCallback((folderData) => {
        const folderId = `folder_${Date.now()}`;
        const newFolder = {
            id: folderId,
            name: folderData.name,
            color: folderData.color,
            parentId: folderData.parentId || 'root'
        };

        setFolders(prevFolders => [...prevFolders, newFolder]);

        const storedFolders = JSON.parse(localStorage.getItem('folders') || '[]');
        const updatedFolders = [...storedFolders, newFolder];
        localStorage.setItem('folders', JSON.stringify(updatedFolders));

        window.dispatchEvent(new Event('storage'));
        setSuccessMessage(`Folder "${folderData.name}" created successfully`);

        return newFolder;
    }, []);

    const renameFolder = useCallback((folderId, newName) => {
        if (!newName.trim()) return false;

        const updatedFolders = folders.map(folder =>
            folder.id === folderId ? { ...folder, name: newName } : folder
        );

        setFolders(updatedFolders);
        localStorage.setItem('folders', JSON.stringify(updatedFolders));

        window.dispatchEvent(new Event('storage'));
        setSuccessMessage(`Folder renamed to "${newName}" successfully`);

        return true;
    }, [folders]);

    const deleteFolder = useCallback((folderId) => {
        const folderToDelete = folders.find(f => f.id === folderId);
        if (!folderToDelete) return false;

        // Find all subfolders (including nested ones)
        const findAllSubfolders = (parentId) => {
            const direct = folders.filter(f => f.parentId === parentId).map(f => f.id);
            const all = [...direct];

            direct.forEach(id => {
                all.push(...findAllSubfolders(id));
            });

            return all;
        };

        const subfolderIds = findAllSubfolders(folderId);
        const allFoldersToDelete = [folderId, ...subfolderIds];

        // Delete folders
        const updatedFolders = folders.filter(folder => !allFoldersToDelete.includes(folder.id));
        setFolders(updatedFolders);
        localStorage.setItem('folders', JSON.stringify(updatedFolders));

        window.dispatchEvent(new Event('storage'));
        setSuccessMessage(`Folder "${folderToDelete.name}" has been deleted`);

        return {
            deleted: true,
            affectedFolders: allFoldersToDelete
        };
    }, [folders]);

    // Check if a folder is a subfolder of another
    const isSubfolder = useCallback((folderId, parentId) => {
        const folder = folders.find(f => f.id === folderId);
        if (!folder) return false;
        if (folder.parentId === parentId) return true;
        if (folder.parentId === 'root') return false;
        return isSubfolder(folder.parentId, parentId);
    }, [folders]);

    useEffect(() => {
        fetchFolders();

        const handleStorageChange = () => {
            fetchFolders();
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [fetchFolders]);

    return {
        folders,
        selectedFolder,
        setSelectedFolder,
        createFolder,
        renameFolder,
        deleteFolder,
        fetchFolders,
        isSubfolder,
        successMessage,
        setSuccessMessage
    };
}