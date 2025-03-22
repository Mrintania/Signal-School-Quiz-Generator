import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useLibrary } from '../../../context/LibraryContext';

const DeleteQuizModal = ({ show, onHide, quiz }) => {
  const { deleteQuiz, setSuccessMessage } = useLibrary();
  
  const handleDelete = async () => {
    if (!quiz) return;
    
    const result = await deleteQuiz(quiz.id);
    
    if (result.success) {
      setSuccessMessage(`Quiz "${quiz.title}" has been deleted`);
    }
    
    onHide();
  };
  
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete quiz</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Are you sure you want to delete the quiz "{quiz?.title}"?</p>
        <p className="text-danger mb-0">This action cannot be undone.</p>
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

export default DeleteQuizModal;