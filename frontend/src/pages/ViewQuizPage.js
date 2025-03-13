import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';
import { FaArrowLeft, FaPrint } from 'react-icons/fa';

const ViewQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State for quiz data
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch quiz function wrapped in useCallback to use as dependency in useEffect
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
  }, [fetchQuiz]); // Now includes fetchQuiz properly as a dependency
  
  // Function to handle print
  const handlePrint = () => {
    window.print();
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
  
  return (
    <Container className="py-4">
      {/* Header with quiz info and actions */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <Button
                variant="outline-primary"
                className="mb-2 me-2"
                onClick={() => navigate('/library')}
              >
                <FaArrowLeft className="me-2" />
                Back to Library
              </Button>
              
              <Button
                variant="outline-secondary"
                className="mb-2"
                onClick={handlePrint}
              >
                <FaPrint className="me-2" />
                Print Quiz
              </Button>
            </div>
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
                <strong>Topic:</strong> {quiz.topic}
              </p>
              <p className="mb-2">
                <strong>Created:</strong> {formatDate(quiz.created_at)}
              </p>
            </Col>
            <Col md={6}>
              <p className="mb-2">
                <Badge bg="primary" className="me-2">
                  {quiz.question_type}
                </Badge>
                {quiz.student_level && (
                  <Badge bg="secondary">
                    {quiz.student_level}
                  </Badge>
                )}
              </p>
              <p className="mb-2">
                <strong>Questions:</strong> {quiz.questions.length}
              </p>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {/* Questions List */}
      {quiz.questions.map((question, questionIndex) => (
        <Card key={questionIndex} className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">Question {questionIndex + 1}</h5>
          </Card.Header>
          <Card.Body>
            <p className="h5 mb-4">{question.questionText}</p>
            
            {/* Multiple Choice Options */}
            {quiz.question_type === 'Multiple Choice' && (
              <div className="mb-4">
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="mb-2">
                    <Form.Check
                      type="radio"
                      id={`q${questionIndex}-option${optionIndex}`}
                      label={option.text}
                      name={`question-${questionIndex}`}
                      checked={option.isCorrect}
                      disabled
                      className={option.isCorrect ? 'text-success fw-bold' : ''}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Explanation */}
            <Card className="bg-light">
              <Card.Body>
                <h6 className="mb-2">Explanation:</h6>
                <p className="mb-0">{question.explanation}</p>
              </Card.Body>
            </Card>
          </Card.Body>
        </Card>
      ))}
      
      {/* Bottom navigation */}
      <Row className="mb-5">
        <Col>
          <Button
            variant="outline-primary"
            onClick={() => navigate('/library')}
          >
            <FaArrowLeft className="me-2" />
            Back to Library
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default ViewQuizPage;