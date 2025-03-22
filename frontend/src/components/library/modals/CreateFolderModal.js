import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useLibrary } from '../../../context/LibraryContext';

const CreateFolderModal = ({ show, onHide }) => {
  const { folders, createFolder } = useLibrary();
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLocation, setNewFolderLocation] = useState('root');
  const [newFolderColor, setNewFolderColor] = useState('#F9E852');
  
  const handleSubmit = () => {
    if (!newFolderName.trim()) return;
    
    createFolder({
      name: newFolderName,
      color: newFolderColor,
      parentId: newFolderLocation
    });
    
    // Reset form
    setNewFolderName('');
    setNewFolderColor('#F9E852');
    setNewFolderLocation('root');
    
    // Close modal
    onHide();
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create folder</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Folder name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Folder location</Form.Label>
          <Form.Select
            value={newFolderLocation}
            onChange={(e) => setNewFolderLocation(e.target.value)}
          >
            <option value="root">My Library (root)</option>
            {folders.filter(folder => folder.id !== 'root').map(folder => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </Form.Select>
        </Form.Group>

        <div className="mb-3">
          <Form.Label>Color</Form.Label>
          <div className="d-flex justify-content-between">
            {['#F9E852', '#FA8072', '#FFA07A', '#90EE90', '#87CEFA', '#9370DB', '#DDA0DD', '#D3D3D3'].map(color => (
              <div
                key={color}
                className={`rounded-circle ${newFolderColor === color ? 'border border-2 border-dark' : ''}`}
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: color,
                  cursor: 'pointer'
                }}
                onClick={() => setNewFolderColor(color)}
              />
            ))}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="warning"
          style={{ backgroundColor: '#D7FC70', color: '#000', borderColor: '#D7FC70' }}
          onClick={handleSubmit}
        >
          Create folder
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateFolderModal;