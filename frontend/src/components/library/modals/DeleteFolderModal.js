import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useLibrary } from '../../../context/LibraryContext';

const DeleteFolderModal = ({ show, onHide, folder }) => {
  const { deleteFolder, changeFolder, currentFolder } = useLibrary();
  
  const handleDelete = () => {
    if (!folder) return;
    
    const result = deleteFolder(folder.id);
    
    if (result.deleted && result.affectedFolders.includes(currentFolder)) {
      // If current folder is deleted, navigate to root
      changeFolder('root');
    }
    
    onHide();
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete folder</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Are you sure you want to delete folder "{folder?.name}"?</p>
        <p className="text-danger">This will also delete all quizzes and subfolders in this folder. This action cannot be undone.</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteFolderModal;