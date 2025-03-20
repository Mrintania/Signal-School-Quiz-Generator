// ปรับปรุงไฟล์ frontend/src/pages/QuizResultPage.js

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';
import { useQuizContext } from '../context/QuizContext';
import { FaPlus, FaSave } from 'react-icons/fa';

const QuizResultPage = () => {
  const navigate = useNavigate();
  const { generatedQuiz, setGeneratedQuiz, clearGeneratedQuiz, setLoading, loading, setError, error } = useQuizContext();
  
  // State สำหรับ modal บันทึกข้อสอบ
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [validated, setValidated] = useState(false);
  
  // State สำหรับการสร้างข้อสอบเพิ่ม
  const [generatingAdditional, setGeneratingAdditional] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  
  // State สำหรับการตรวจสอบชื่อซ้ำ
  const [checkingTitle, setCheckingTitle] = useState(false);
  const [titleCheckResult, setTitleCheckResult] = useState(null);
  
  // Redirect หากไม่มีข้อมูลข้อสอบ
  useEffect(() => {
    if (!generatedQuiz) {
      navigate('/create');
    }
  }, [generatedQuiz, navigate]);
  
  // จัดการการแสดง/ซ่อน modal
  const handleShowSaveModal = async () => {
    // ถ้ายังไม่มีการตั้งชื่อ ให้ใช้ Topic เป็นชื่อเริ่มต้น
    if (!quizTitle && generatedQuiz?.topic) {
      setCheckingTitle(true);
      try {
        // เรียกใช้ API เพื่อตรวจสอบว่าชื่อซ้ำหรือไม่
        const response = await quizService.checkTitleAvailability(generatedQuiz.topic);
        if (response.success) {
          setQuizTitle(response.data.suggestedTitle);
          setTitleCheckResult(response.data);
        }
      } catch (error) {
        console.error("Error checking title:", error);
        // กรณีเกิดข้อผิดพลาด ใช้ชื่อ topic เดิมไปก่อน
        setQuizTitle(generatedQuiz.topic);
      } finally {
        setCheckingTitle(false);
      }
    }
    
    setShowSaveModal(true);
  };
  
  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
  };
  
  // ฟังก์ชันตรวจสอบชื่อข้อสอบซ้ำเมื่อมีการแก้ไขชื่อด้วยตนเอง
  const handleTitleChange = async (e) => {
    const newTitle = e.target.value;
    setQuizTitle(newTitle);
    
    if (newTitle.trim() !== '') {
      setCheckingTitle(true);
      try {
        const response = await quizService.checkTitleAvailability(newTitle);
        if (response.success) {
          setTitleCheckResult(response.data);
        }
      } catch (error) {
        console.error("Error checking title:", error);
        setTitleCheckResult(null);
      } finally {
        setCheckingTitle(false);
      }
    } else {
      setTitleCheckResult(null);
    }
  };
  
  // จัดการการบันทึกข้อสอบ
  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    
    // ตรวจสอบแบบฟอร์ม
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    try {
      setLoading(true);
      
      // เตรียมข้อมูลข้อสอบสำหรับบันทึก
      const quizData = {
        title: quizTitle,
        topic: generatedQuiz.topic,
        questionType: generatedQuiz.questionType,
        studentLevel: generatedQuiz.studentLevel,
        questions: generatedQuiz.questions
      };
      
      // เรียกใช้ API เพื่อบันทึกข้อสอบ
      const response = await quizService.saveQuiz(quizData);
      
      if (response.success) {
        // ปิด modal
        handleCloseSaveModal();
        
        // ล้างข้อมูลข้อสอบจาก context
        clearGeneratedQuiz();
        
        // นำทางกลับไปหน้าหลัก
        navigate('/');
      } else {
        setError(response.message || 'Failed to save quiz');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // ฟังก์ชันสร้างข้อสอบเพิ่มเติม
  const handleGenerateAdditionalQuestions = async () => {
    try {
      setGeneratingAdditional(true);
      setError(null);
      
      // เตรียมข้อมูลสำหรับการสร้างข้อสอบเพิ่ม
      const additionalQuizData = {
        topic: generatedQuiz.topic,
        questionType: generatedQuiz.questionType,
        numberOfQuestions: "10", // กำหนดให้สร้างเพิ่ม 10 ข้อเสมอ
        additionalInstructions: generatedQuiz.formData?.additionalInstructions + 
          " Please generate different questions from the previous ones to avoid duplication.", // เพิ่มคำแนะนำไม่ให้ซ้ำกับข้อสอบเดิม
        studentLevel: generatedQuiz.studentLevel
      };
      
      // เรียกใช้ API เพื่อสร้างข้อสอบเพิ่ม
      const response = await quizService.generateQuiz(additionalQuizData);
      
      if (response.success) {
        // รวมข้อสอบเดิมกับข้อสอบใหม่
        const combinedQuestions = [
          ...generatedQuiz.questions,
          ...response.data.questions
        ];
        
        // อัปเดต generatedQuiz ด้วยข้อสอบที่รวมแล้ว
        setGeneratedQuiz({
          ...generatedQuiz,
          questions: combinedQuestions
        });
        
        // แสดงข้อความสำเร็จ
        setShowSuccessAlert(true);
        
        // ซ่อนข้อความสำเร็จหลังจาก 5 วินาที
        setTimeout(() => {
          setShowSuccessAlert(false);
        }, 5000);
        
        // เลื่อนไปด้านล่างหน้าเพื่อแสดงข้อสอบใหม่
        setTimeout(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
          });
        }, 300);
      } else {
        setError(response.message || 'Failed to generate additional questions');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setGeneratingAdditional(false);
    }
  };
  
  // หากไม่มีข้อมูลข้อสอบ แสดงการโหลด
  if (!generatedQuiz) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }
  
  return (
    <Container className="py-4">
      {/* แสดงการแจ้งเตือนเมื่อสร้างข้อสอบเพิ่มเติมสำเร็จ */}
      {showSuccessAlert && (
        <Alert variant="success" onClose={() => setShowSuccessAlert(false)} dismissible>
          Successfully added 10 more questions! Scroll down to see new questions.
        </Alert>
      )}
      
      {/* แสดงข้อผิดพลาด (ถ้ามี) */}
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>Generated Quiz: {generatedQuiz.topic}</h2>
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleShowSaveModal}
            >
              <FaSave className="me-2" />
              Save Quiz
            </Button>
          </div>
          <p className="text-muted">
            {generatedQuiz.questionType} | {generatedQuiz.questions.length} questions
            {generatedQuiz.studentLevel && ` | Level: ${generatedQuiz.studentLevel}`}
          </p>
        </Col>
      </Row>
      
      {/* รายการข้อสอบ */}
      {generatedQuiz.questions.map((question, questionIndex) => (
        <Card key={questionIndex} className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">Question {questionIndex + 1}</h5>
          </Card.Header>
          <Card.Body>
            <p className="h5 mb-4">{question.questionText}</p>
            
            {/* ตัวเลือกสำหรับข้อสอบปรนัย */}
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
            
            {/* คำอธิบาย */}
            <Card className="bg-light">
              <Card.Body>
                <h6 className="mb-2">Explanation:</h6>
                <p className="mb-0">{question.explanation}</p>
              </Card.Body>
            </Card>
          </Card.Body>
        </Card>
      ))}
      
      {/* ปุ่มด้านล่าง */}
      <Row className="mt-4 mb-3">
        <Col md={6} className="d-grid mb-3 mb-md-0">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleShowSaveModal}
          >
            <FaSave className="me-2" />
            Save Quiz
          </Button>
        </Col>
        <Col md={6} className="d-grid">
          <Button 
            variant="outline-primary" 
            size="lg" 
            onClick={handleGenerateAdditionalQuestions}
            disabled={generatingAdditional}
          >
            {generatingAdditional ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Generating additional questions...
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                Generate 10 More Questions
              </>
            )}
          </Button>
        </Col>
      </Row>
      
      {/* ข้อความอธิบายสำหรับปุ่มสร้างข้อสอบเพิ่ม */}
      <Row className="mb-5">
        <Col>
          <p className="text-muted small text-center">
            Generating additional questions will use the same topic and conditions as the first set, but will try to create non-duplicate questions.
          </p>
        </Col>
      </Row>
      
      {/* Modal บันทึกข้อสอบ */}
      <Modal show={showSaveModal} onHide={handleCloseSaveModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Save Quiz</Modal.Title>
        </Modal.Header>
        <Form noValidate validated={validated} onSubmit={handleSaveQuiz}>
          <Modal.Body>
            <Form.Group controlId="quizTitle">
              <Form.Label>Quiz Title</Form.Label>
              {checkingTitle ? (
                <div className="text-center py-2">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Checking title availability...
                </div>
              ) : (
                <>
                  <Form.Control
                    type="text"
                    placeholder="Enter a title for your quiz"
                    value={quizTitle}
                    onChange={handleTitleChange}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    Please provide a title for the quiz.
                  </Form.Control.Feedback>
                  
                  {/* แสดงข้อความเตือนเมื่อชื่อซ้ำ */}
                  {titleCheckResult?.isDuplicate && (
                    <small className="text-info">
                      A similar title already exists. We suggest using "{titleCheckResult.suggestedTitle}" instead.
                    </small>
                  )}
                </>
              )}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseSaveModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading || checkingTitle}>
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

export default QuizResultPage;