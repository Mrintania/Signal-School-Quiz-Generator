import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';
import { useQuizContext } from '../context/QuizContext';

const CreateQuizPage = () => {
  const navigate = useNavigate();
  const { setGeneratedQuiz, setLoading, loading, setError } = useQuizContext();
  
  // Form state
  const [formData, setFormData] = useState({
    topic: '',
    questionType: 'Multiple Choice',
    numberOfQuestions: '10',
    additionalInstructions: '',
    studentLevel: ''
  });
  
  // Form validation state
  const [validated, setValidated] = useState(false);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
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
      setError(null);
      
      // Call API to generate quiz
      const response = await quizService.generateQuiz(formData);
      
      if (response.success) {
        // Store generated quiz in context
        setGeneratedQuiz({
          ...response.data,
          formData
        });
        
        // Navigate to the result page
        navigate('/result');
      } else {
        setError(response.message || 'Failed to generate quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">Create New Quiz</h4>
            </Card.Header>
            <Card.Body>
              <Form noValidate validated={validated} onSubmit={handleSubmit}>
                {/* Topic Input */}
                <Form.Group className="mb-3" controlId="quizTopic">
                  <Form.Label>Your Topic</Form.Label>
                  <Form.Control
                    type="text"
                    name="topic"
                    value={formData.topic}
                    onChange={handleChange}
                    placeholder="Enter quiz topic or subject"
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide a topic.
                  </Form.Control.Feedback>
                </Form.Group>
                
                {/* Question Type Dropdown */}
                <Form.Group className="mb-3" controlId="questionType">
                  <Form.Label>Question Type</Form.Label>
                  <Form.Select
                    name="questionType"
                    value={formData.questionType}
                    onChange={handleChange}
                    required
                  >
                    <option value="Multiple Choice">Multiple Choice</option>
                    <option value="Essay">Essay</option>
                  </Form.Select>
                </Form.Group>
                
                {/* Number of Questions Dropdown */}
                <Form.Group className="mb-3" controlId="numberOfQuestions">
                  <Form.Label>Number of Questions</Form.Label>
                  <Form.Select
                    name="numberOfQuestions"
                    value={formData.numberOfQuestions}
                    onChange={handleChange}
                    required
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                  </Form.Select>
                </Form.Group>
                
                {/* Student Level Input */}
                <Form.Group className="mb-3" controlId="studentLevel">
                  <Form.Label>Student Level (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    name="studentLevel"
                    value={formData.studentLevel}
                    onChange={handleChange}
                    placeholder="e.g., High School, University, Beginner"
                  />
                </Form.Group>
                
                {/* Additional Instructions Textarea */}
                <Form.Group className="mb-4" controlId="additionalInstructions">
                  <Form.Label>Additional Instructions (optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="additionalInstructions"
                    value={formData.additionalInstructions}
                    onChange={handleChange}
                    placeholder="Enter any specific instructions or details about the quiz content"
                    rows={3}
                  />
                </Form.Group>
                
                {/* Submit Button */}
                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    disabled={loading}
                  >
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
                        Generating Quiz...
                      </>
                    ) : (
                      'Generate Quiz'
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CreateQuizPage;