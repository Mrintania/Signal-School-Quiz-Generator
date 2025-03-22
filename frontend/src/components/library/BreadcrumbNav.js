import React from 'react';
import { Button } from 'react-bootstrap';
import { useLibrary } from '../../context/LibraryContext';

const BreadcrumbNav = () => {
  const { currentFolder, folders, changeFolder } = useLibrary();
  
  // Don't show for root folder
  if (currentFolder === 'root') {
    return null;
  }
  
  // Get current folder information
  const folder = folders.find(f => f.id === currentFolder);
  
  return (
    <div className="mb-3">
      <Button
        variant="link"
        className="p-0 text-decoration-none"
        onClick={() => changeFolder('root')}
      >
        My Library
      </Button>
      <span className="mx-2">/</span>
      <span className="fw-bold">
        {folder?.name || 'Unknown folder'}
      </span>
    </div>
  );
};

export default BreadcrumbNav;