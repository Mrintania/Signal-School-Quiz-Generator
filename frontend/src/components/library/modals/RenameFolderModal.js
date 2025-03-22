import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useLibrary } from '../../../context/LibraryContext';

const RenameFolderModal = ({ show, onHide, folder }) => {
  const { renameFolder } = useLibrary();
  const [newFolderName, setNewFolderName] = useState('');
  
  // Set initial value when folder changes
  useEffect(() => {
    if (folder) {
      setNewFolderName(folder.name);
    }
  }, [folder]);
  
  const handleSubmit = () => {
    if (!newFolderName.trim() || !folder) return;
    
    renameFolder(folder.id, newFolderName);
    onHide();
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Rename folder</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Folder name</Form.Label>
          <Form.Control
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Enter folder name"
            className="mb-4"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className="border-0 d-grid">
        <Button
          variant="warning"
          onClick={handleSubmit}
          style={{ backgroundColor: '#D7FC70', color: '#000', borderColor: '#D7FC70' }}
          className="w-100"
        >
          Rename folder
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RenameFolderModal;