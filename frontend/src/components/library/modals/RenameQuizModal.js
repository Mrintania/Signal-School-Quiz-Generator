import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useLibrary } from '../../../context/LibraryContext';

const RenameQuizModal = ({ show, onHide, quiz }) => {
  const { renameQuiz, setSuccessMessage } = useLibrary();
  const [newQuizName, setNewQuizName] = useState('');
  
  // Set initial value when quiz changes
  useEffect(() => {
    if (quiz) {
      setNewQuizName(quiz.title);
    }
  }, [quiz]);
  
  const handleSubmit = async () => {
    if (!newQuizName.trim() || !quiz) return;
    
    const result = await renameQuiz(quiz.id, newQuizName);
    
    if (result.success) {
      setSuccessMessage(`Quiz renamed to "${newQuizName}" successfully`);
    }
    
    onHide();
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Rename quiz</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Quiz name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter new name"
            value={newQuizName}
            onChange={(e) => setNewQuizName(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
        >
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RenameQuizModal;