// Example of how to integrate the QuizActionMenu in ViewQuizPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';
import { FaArrowLeft } from 'react-icons/fa';
import QuizActionMenu from '../components/QuizActionMenu'; // Import the component

const ViewQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State for quiz data
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Fetch quiz function wrapped in useCallback
  const fetchQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await quizService.getQuizById(id);
      
      if (response.success) {
        setQuiz(response.data);
      } else {
        setError(response.message || 'Failed to fetch quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id]);
  
  // Fetch quiz data on component mount
  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  // Handlers for action menu callbacks
  const handleRenameSuccess = (newTitle) => {
    setQuiz({...quiz, title: newTitle});
    setSuccessMessage('Quiz renamed successfully!');
  };

  const handleDeleteSuccess = () => {
    // Redirect to library and show message
    navigate('/library', { state: { message: 'Quiz deleted successfully!' } });
  };

  const handleMoveSuccess = (folderId) => {
    setSuccessMessage('Quiz moved successfully!');
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }
  
  if (error || !quiz) {
    return (
      <Container className="py-4">
        <div className="alert alert-danger" role="alert">
          {error || 'Quiz not found'}
        </div>
        <Button variant="primary" onClick={() => navigate('/library')}>
          Back to Library
        </Button>
      </Container>
    );
  }
  
  // Determine if Thai language based on content (simplified version)
  const isThai = quiz.title && /[\u0E00-\u0E7F]/.test(quiz.title);
  
  return (
    <Container className="py-4">
      {/* Success message */}
      {successMessage && (
        <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
          {successMessage}
        </Alert>
      )}
      
      {/* Header with quiz info and actions */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <Button
              variant="outline-primary"
              onClick={() => navigate('/library')}
              className="mb-2"
            >
              <FaArrowLeft className="me-2" />
              {isThai ? 'กลับไปคลังข้อสอบ' : 'Back to Library'}
            </Button>
            
            {/* Add the QuizActionMenu component here */}
            <QuizActionMenu 
              quiz={quiz}
              onRenameSuccess={handleRenameSuccess}
              onDeleteSuccess={handleDeleteSuccess}
              onMoveSuccess={handleMoveSuccess}
              language={isThai ? 'thai' : 'english'}
            />
          </div>
        </Col>
      </Row>
      
      {/* Quiz details */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h2 className="mb-0">{quiz.title}</h2>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <p className="mb-2">
                <strong>{isThai ? 'หัวข้อ:' : 'Topic:'}</strong> {quiz.topic}
              </p>
              <p className="mb-2">
                <strong>{isThai ? 'สร้างเมื่อ:' : 'Created:'}</strong> {formatDate(quiz.created_at)}
              </p>
            </Col>
            <Col md={6}>
              <p className="mb-2">
                <Badge bg="primary" className="me-2">
                  {quiz.question_type === 'Multiple Choice' 
                    ? (isThai ? 'ปรนัย' : 'Multiple Choice') 
                    : (isThai ? 'อัตนัย' : 'Essay')}
                </Badge>
                {quiz.student_level && (
                  <Badge bg="secondary">
                    {quiz.student_level}
                  </Badge>
                )}
              </p>
              <p className="mb-2">
                <strong>{isThai ? 'จำนวนข้อ:' : 'Questions:'}</strong> {quiz.questions.length}
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Questions List */}
      {quiz.questions.map((question, questionIndex) => (
        <Card key={questionIndex} className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">{isThai ? `ข้อที่ ${questionIndex + 1}` : `Question ${questionIndex + 1}`}</h5>
          </Card.Header>
          <Card.Body>
            <p className="h5 mb-4">{question.questionText}</p>
            
            {/* Multiple Choice Options */}
            {quiz.question_type === 'Multiple Choice' && (
              <div className="mb-4">
                {question.options && question.options.map((option, optionIndex) => {
                  const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, D, ...
                  return (
                    <div key={optionIndex} className="mb-3 ps-2">
                      <span className={option.isCorrect ? 'text-success fw-bold' : ''}>
                        <strong>{optionLabel}.</strong> {option.text}
                        {option.isCorrect && ' ✓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Explanation */}
            <Card className="bg-light">
              <Card.Body>
                <h6 className="mb-2">{isThai ? 'คำอธิบาย:' : 'Explanation:'}</h6>
                <p className="mb-0">{question.explanation}</p>
              </Card.Body>
            </Card>
          </Card.Body>
        </Card>
      ))}
      
      {/* Bottom navigation */}
      <Row className="mb-5">
        <Col className="d-flex justify-content-between align-items-center flex-wrap">
          <Button
            variant="outline-primary"
            onClick={() => navigate('/library')}
          >
            <FaArrowLeft className="me-2" />
            {isThai ? 'กลับไปคลังข้อสอบ' : 'Back to Library'}
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default ViewQuizPage;