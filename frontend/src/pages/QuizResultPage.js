// Example of how to integrate the QuizActionMenu in QuizResultPage.js

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';
import { useQuizContext } from '../context/QuizContext';
import { FaPlus, FaSave } from 'react-icons/fa';
import QuizActionMenu from '../components/QuizActionMenu'; // Import the component

const QuizResultPage = () => {
  const navigate = useNavigate();
  const { generatedQuiz, setGeneratedQuiz, clearGeneratedQuiz, loading, setLoading, error, setError } = useQuizContext();
  
  // State for modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [validated, setValidated] = useState(false);
  const [savedQuiz, setSavedQuiz] = useState(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  // State for the saved quiz to use with the action menu
  const [quizActionOptions, setQuizActionOptions] = useState({
    isVisible: false,
    quizId: null,
    quizTitle: '',
  });
  
  // Check if we have a quiz to display
  useEffect(() => {
    if (!generatedQuiz) {
      navigate('/create');
    }
  }, [generatedQuiz, navigate]);
  
  // Handle save modal
  const handleShowSaveModal = () => {
    // Use the topic as default title if none is set
    if (!quizTitle && generatedQuiz?.topic) {
      setQuizTitle(generatedQuiz.topic);
    }
    setShowSaveModal(true);
  };
  
  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
  };
  
  // Handle save quiz
  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    
    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    try {
      setLoading(true);
      
      // Create quiz data object
      const quizData = {
        title: quizTitle,
        topic: generatedQuiz.topic,
        questionType: generatedQuiz.questionType,
        studentLevel: generatedQuiz.studentLevel,
        questions: generatedQuiz.questions
      };
      
      // Save quiz to API
      const response = await quizService.saveQuiz(quizData);
      
      if (response.success) {
        // Close modal
        handleCloseSaveModal();
        
        // Set success message
        setShowSuccessAlert(true);
        
        // Save the quiz data for action menu
        setQuizActionOptions({
          isVisible: true,
          quizId: response.quizId,
          quizTitle: quizTitle
        });
        
        // Create simplified saved quiz object
        setSavedQuiz({
          id: response.quizId,
          title: quizTitle,
          topic: generatedQuiz.topic,
          question_type: generatedQuiz.questionType,
          student_level: generatedQuiz.studentLevel,
          questions: generatedQuiz.questions
        });
        
        // Hide success alert after 5 seconds
        setTimeout(() => {
          setShowSuccessAlert(false);
        }, 5000);
      } else {
        setError(response.message || 'Failed to save quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Determine if Thai language based on content (simplified version)
  const isThai = generatedQuiz?.topic && /[\u0E00-\u0E7F]/.test(generatedQuiz.topic);
  
  // Handlers for action menu callbacks
  const handleRenameSuccess = (newTitle) => {
    setSavedQuiz({...savedQuiz, title: newTitle});
    setShowSuccessAlert(true);
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 5000);
  };

  const handleDeleteSuccess = () => {
    // Clear quiz data and navigate to create page
    clearGeneratedQuiz();
    navigate('/create', { state: { message: 'Quiz deleted successfully!' } });
  };

  const handleMoveSuccess = (folderId) => {
    setShowSuccessAlert(true);
    setTimeout(() => {
      setShowSuccessAlert(false);
    }, 5000);
  };
  
  // If no quiz data, show loading
  if (!generatedQuiz) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }
  
  return (
    <Container className="py-4">
      {/* Success Message */}
      {showSuccessAlert && (
        <Alert variant="success" onClose={() => setShowSuccessAlert(false)} dismissible>
          {savedQuiz ? 'Quiz updated successfully!' : 'Quiz saved successfully!'}
        </Alert>
      )}
      
      {/* Error Message */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      {/* Header with quiz title and actions */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              {isThai ? 'ข้อสอบที่สร้าง:' : 'Generated Quiz:'} {generatedQuiz.topic}
            </h2>
            
            {quizActionOptions.isVisible ? (
              <QuizActionMenu 
                quiz={savedQuiz}
                onRenameSuccess={handleRenameSuccess}
                onDeleteSuccess={handleDeleteSuccess}
                onMoveSuccess={handleMoveSuccess}
                language={isThai ? 'thai' : 'english'}
              />
            ) : (
              <Button 
                variant="primary" 
                size="lg" 
                onClick={handleShowSaveModal}
              >
                <FaSave className="me-2" />
                {isThai ? 'บันทึกข้อสอบ' : 'Save Quiz'}
              </Button>
            )}
          </div>
          <p className="text-muted">
            {generatedQuiz.questionType} | {generatedQuiz.questions.length} {isThai ? 'ข้อ' : 'questions'}
            {generatedQuiz.studentLevel && ` | ${isThai ? 'ระดับ:' : 'Level:'} ${generatedQuiz.studentLevel}`}
          </p>
        </Col>
      </Row>
      
      {/* Questions List */}
      {generatedQuiz.questions.map((question, questionIndex) => (
        <Card key={questionIndex} className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">{isThai ? `ข้อที่ ${questionIndex + 1}` : `Question ${questionIndex + 1}`}</h5>
          </Card.Header>
          <Card.Body>
            <p className="h5 mb-4">{question.questionText}</p>
            
            {/* Multiple Choice Options */}
            {generatedQuiz.questionType === 'Multiple Choice' && (
              <div className="mb-4">
                {question.options.map((option, optionIndex) => {
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
      
      {/* Action Buttons */}
      <Row className="mt-4 mb-5">
        <Col md={6} className="d-grid mb-3 mb-md-0">
          {quizActionOptions.isVisible ? (
            <Button 
              variant="outline-primary" 
              size="lg" 
              onClick={() => navigate(`/view/${savedQuiz.id}`)}
            >
              {isThai ? 'ดูข้อสอบที่บันทึกแล้ว' : 'View Saved Quiz'}
            </Button>
          ) : (
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleShowSaveModal}
            >
              <FaSave className="me-2" />
              {isThai ? 'บันทึกข้อสอบ' : 'Save Quiz'}
            </Button>
          )}
        </Col>
        <Col md={6} className="d-grid">
          <Button 
            variant="outline-primary" 
            size="lg" 
            onClick={() => navigate('/create')}
          >
            <FaPlus className="me-2" />
            {isThai ? 'สร้างข้อสอบใหม่' : 'Create New Quiz'}
          </Button>
        </Col>
      </Row>
      
      {/* Save Modal */}
      <Modal show={showSaveModal} onHide={handleCloseSaveModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isThai ? 'บันทึกข้อสอบ' : 'Save Quiz'}</Modal.Title>
        </Modal.Header>
        <Form noValidate validated={validated} onSubmit={handleSaveQuiz}>
          <Modal.Body>
            <Form.Group controlId="quizTitle">
              <Form.Label>{isThai ? 'ชื่อชุดข้อสอบ' : 'Quiz Title'}</Form.Label>
              <Form.Control
                type="text"
                placeholder={isThai ? 'กรอกชื่อชุดข้อสอบของคุณ' : 'Enter a title for your quiz'}
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                required
              />
              <Form.Control.Feedback type="invalid">
                {isThai ? 'กรุณากรอกชื่อชุดข้อสอบ' : 'Please provide a title for the quiz.'}
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseSaveModal}>
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {isThai ? 'กำลังบันทึก...' : 'Saving...'}
                </>
              ) : (
                isThai ? 'บันทึก' : 'Save'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default QuizResultPage;