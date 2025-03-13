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
  
  // Redirect หากไม่มีข้อมูลข้อสอบ
  useEffect(() => {
    if (!generatedQuiz) {
      navigate('/create');
    }
  }, [generatedQuiz, navigate]);
  
  // จัดการการแสดง/ซ่อน modal
  const handleShowSaveModal = () => setShowSaveModal(true);
  const handleCloseSaveModal = () => setShowSaveModal(false);
  
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
        setError(response.message || 'การบันทึกข้อสอบล้มเหลว');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'เกิดข้อผิดพลาด');
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
        setError(response.message || 'การสร้างข้อสอบเพิ่มเติมล้มเหลว');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'เกิดข้อผิดพลาด');
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
          เพิ่มข้อสอบอีก 10 ข้อสำเร็จแล้ว! เลื่อนลงเพื่อดูข้อสอบใหม่
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
            <h2>ข้อสอบที่สร้าง: {generatedQuiz.topic}</h2>
            <Button 
              variant="primary" 
              size="lg" 
              onClick={handleShowSaveModal}
            >
              <FaSave className="me-2" />
              บันทึกข้อสอบ
            </Button>
          </div>
          <p className="text-muted">
            {generatedQuiz.questionType} | จำนวน {generatedQuiz.questions.length} ข้อ
            {generatedQuiz.studentLevel && ` | ระดับ: ${generatedQuiz.studentLevel}`}
          </p>
        </Col>
      </Row>
      
      {/* รายการข้อสอบ */}
      {generatedQuiz.questions.map((question, questionIndex) => (
        <Card key={questionIndex} className="mb-4 shadow-sm">
          <Card.Header className="bg-light">
            <h5 className="mb-0">ข้อที่ {questionIndex + 1}</h5>
          </Card.Header>
          <Card.Body>
            <p className="h5 mb-4">{question.questionText}</p>
            
            {/* ตัวเลือกสำหรับข้อสอบปรนัย */}
            {generatedQuiz.questionType === 'Multiple Choice' && (
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
            
            {/* คำอธิบาย */}
            <Card className="bg-light">
              <Card.Body>
                <h6 className="mb-2">คำอธิบาย:</h6>
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
            บันทึกข้อสอบ
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
                กำลังสร้างข้อสอบเพิ่มเติม...
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                สร้างข้อสอบเพิ่มอีก 10 ข้อ
              </>
            )}
          </Button>
        </Col>
      </Row>
      
      {/* ข้อความอธิบายสำหรับปุ่มสร้างข้อสอบเพิ่ม */}
      <Row className="mb-5">
        <Col>
          <p className="text-muted small text-center">
            การสร้างข้อสอบเพิ่มเติมจะใช้หัวข้อและเงื่อนไขเดียวกับข้อสอบชุดแรก แต่จะพยายามสร้างข้อสอบไม่ซ้ำกับชุดแรก
          </p>
        </Col>
      </Row>
      
      {/* Modal บันทึกข้อสอบ */}
      <Modal show={showSaveModal} onHide={handleCloseSaveModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>บันทึกข้อสอบ</Modal.Title>
        </Modal.Header>
        <Form noValidate validated={validated} onSubmit={handleSaveQuiz}>
          <Modal.Body>
            <Form.Group controlId="quizTitle">
              <Form.Label>ชื่อชุดข้อสอบ</Form.Label>
              <Form.Control
                type="text"
                placeholder="กรอกชื่อชุดข้อสอบของคุณ"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                required
              />
              <Form.Control.Feedback type="invalid">
                กรุณากรอกชื่อชุดข้อสอบ
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseSaveModal}>
              ยกเลิก
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
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default QuizResultPage;