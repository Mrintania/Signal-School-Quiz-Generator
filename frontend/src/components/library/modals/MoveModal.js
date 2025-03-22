import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useLibrary } from '../../../context/LibraryContext';

const MoveModal = ({ show, onHide, quiz }) => {
  const { folders, moveQuiz, setSuccessMessage } = useLibrary();
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [destinationFolder, setDestinationFolder] = useState('root');
  const [isCopy, setIsCopy] = useState(false);
  
  const handleMoveOrCopy = () => {
    if (!quiz || !destinationFolder) return;
    
    if (isCopy) {
      // Copy functionality would be implemented here
      setSuccessMessage(`Quiz "${quiz.title}" copied successfully`);
    } else {
      // Move quiz
      moveQuiz(quiz.id, destinationFolder);
      setSuccessMessage(`Quiz "${quiz.title}" moved successfully`);
    }
    
    onHide();
  };
  
  // FolderIcon component
  const FolderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z" />
    </svg>
  );
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Move / Copy file</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>File name</Form.Label>
          <Form.Control
            type="text"
            value={quiz?.title || ''}
            disabled
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Destination folder</Form.Label>
          <div className="position-relative">
            <Form.Control
              type="text"
              value={folders.find(f => f.id === destinationFolder)?.name || ''}
              onClick={() => setShowFolderDropdown(!showFolderDropdown)}
              readOnly
              style={{ cursor: 'pointer' }}
            />
            <div className="position-absolute top-50 end-0 translate-middle-y pe-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
              </svg>
            </div>
          </div>

          {/* Folder Dropdown */}
          {showFolderDropdown && (
            <div className="border rounded mt-1 shadow-sm bg-white">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className="p-2 d-flex align-items-center border-bottom"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setDestinationFolder(folder.id);
                    setShowFolderDropdown(false);
                  }}
                >
                  <div
                    className="me-2 rounded"
                    style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: folder.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FolderIcon />
                  </div>
                  <span>{folder.name}</span>
                  {folder.id === quiz?.folderId && (
                    <span className="ms-auto text-muted">Current location</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <Button
            variant="light"
            className="px-4"
            onClick={() => {
              setIsCopy(false);
              handleMoveOrCopy();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
              <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
            </svg>
            Move file
          </Button>
          <Button
            variant="light"
            className="px-4"
            onClick={() => {
              setIsCopy(true);
              handleMoveOrCopy();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
              <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
            </svg>
            Copy file
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default MoveModal;