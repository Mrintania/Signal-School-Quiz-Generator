import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Modal, Form, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { quizService } from '../services/api';
import { FaEye, FaTrashAlt, FaPlus, FaEdit } from 'react-icons/fa';

const LibraryPage = () => {
  // State for quizzes list
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // State for rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [quizToRename, setQuizToRename] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  
  // Fetch quizzes on component mount
  useEffect(() => {
    fetchQuizzes();
  }, []);
  
  // Function to fetch quizzes from API
  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await quizService.getAllQuizzes();
      
      if (response.success) {
        setQuizzes(response.data);
      } else {
        setError(response.message || 'Failed to fetch quizzes');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle delete button click
  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  };
  
  // Function to close delete modal
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setQuizToDelete(null);
  };
  
  // Function to delete quiz
  const handleDeleteQuiz = async () => {
    try {
      setDeleteLoading(true);
      
      const response = await quizService.deleteQuiz(quizToDelete.id);
      
      if (response.success) {
        // Remove the deleted quiz from the list
        setQuizzes(quizzes.filter(quiz => quiz.id !== quizToDelete.id));
        handleCloseDeleteModal();
      } else {
        setError(response.message || 'Failed to delete quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setDeleteLoading(false);
    }
  };
  
  // Function to handle rename button click
  const handleRenameClick = (quiz) => {
    setQuizToRename(quiz);
    setNewTitle(quiz.title);
    setShowRenameModal(true);
    setValidated(false);
  };
  
  // Function to close rename modal
  const handleCloseRenameModal = () => {
    setShowRenameModal(false);
    setQuizToRename(null);
    setNewTitle('');
  };
  
  // Function to rename quiz
  const handleRenameQuiz = async (e) => {
    e.preventDefault();
    
    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    try {
      setRenameLoading(true);
      
      const response = await quizService.renameQuiz(quizToRename.id, newTitle);
      
      if (response.success) {
        // Update the quiz name in the list
        setQuizzes(quizzes.map(quiz => 
          quiz.id === quizToRename.id 
            ? { ...quiz, title: newTitle } 
            : quiz
        ));
        handleCloseRenameModal();
      } else {
        setError(response.message || 'Failed to rename quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setRenameLoading(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Library</h2>
            <Link to="/create">
              <Button variant="primary">
                <FaPlus className="me-2" />
                Create New Quiz
              </Button>
            </Link>
          </div>
        </Col>
      </Row>
      
      {/* Error Message */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {/* Loading Spinner */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      
      {/* No Quizzes Message */}
      {!loading && !error && quizzes.length === 0 && (
        <Card className="text-center py-5">
          <Card.Body>
            <h4>คุณยังไม่มีข้อสอบ</h4>
            <p className="text-muted mb-4">สร้างข้อสอบแรกของคุณเพื่อเริ่มต้น</p>
            <Link to="/create">
              <Button variant="primary" size="lg">
                <FaPlus className="me-2" />
                สร้างข้อสอบใหม่
              </Button>
            </Link>
          </Card.Body>
        </Card>
      )}
      
      {/* Quizzes List */}
      {!loading && !error && quizzes.length > 0 && (
        <Row xs={1} md={2} lg={3} className="g-4">
          {quizzes.map(quiz => (
            <Col key={quiz.id}>
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title className="mb-3">{quiz.title}</Card.Title>
                  <Card.Subtitle className="mb-3 text-muted">
                    {quiz.topic}
                  </Card.Subtitle>
                  
                  <div className="mb-3">
                    <Badge bg="primary" className="me-2">
                      {quiz.question_type === 'Multiple Choice' ? 'Multiple Choice' : 'Essay'}
                    </Badge>
                    {quiz.student_level && (
                      <Badge bg="secondary">
                        {quiz.student_level}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-muted mb-0">
                    Created: {formatDate(quiz.created_at)}
                  </p>
                </Card.Body>
                <Card.Footer className="bg-white border-top-0">
                  <div className="d-flex justify-content-between">
                    <div>
                      <Link to={`/view/${quiz.id}`}>
                        <Button variant="outline-primary" size="sm" className="me-2">
                          <FaEye className="me-1" />
                          See Quiz
                        </Button>
                      </Link>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => handleRenameClick(quiz)}
                      >
                        <FaEdit className="me-1" />
                        Rename
                      </Button>
                    </div>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleDeleteClick(quiz)}
                    >
                      <FaTrashAlt className="me-1" />
                      Delete
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete quiz</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        Are you sure you want to delete the Quiz? "{quizToDelete?.title}"? This action is irreversible.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDeleteModal}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteQuiz}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Rename Modal */}
      <Modal show={showRenameModal} onHide={handleCloseRenameModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rename Quiz</Modal.Title>
        </Modal.Header>
        <Form noValidate validated={validated} onSubmit={handleRenameQuiz}>
          <Modal.Body>
            <Form.Group controlId="quizTitle">
              <Form.Label>New name Quiz</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter a new name for the quiz"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
              <Form.Control.Feedback type="invalid">
                Please enter a new name for the quiz
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseRenameModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={renameLoading}>
              {renameLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default LibraryPage;