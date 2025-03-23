// frontend/src/pages/ViewQuizPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';
import QuizStatistics from '../components/QuizStatistics';
import PrintableQuiz from '../components/PrintableQuiz';
import QuizActionMenu from '../components/QuizActionMenu';

const ViewQuizPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // โหลดข้อมูลข้อสอบ
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const response = await quizService.getQuizById(id);
        
        if (response.success) {
          setQuiz(response.data);
        } else {
          setError(response.message || 'ไม่สามารถโหลดข้อสอบได้');
        }
      } catch (err) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อสอบ');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuiz();
  }, [id]);
  
  // แสดงสถานะกำลังโหลด
  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">กำลังโหลด...</span>
        </div>
        <p className="mt-3">กำลังโหลดข้อสอบ...</p>
      </Container>
    );
  }
  
  // แสดงข้อผิดพลาดหากไม่สามารถโหลดข้อสอบได้
  if (error || !quiz) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>ไม่สามารถโหลดข้อสอบได้</Alert.Heading>
          <p>{error || 'ข้อสอบไม่พบในระบบ'}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => navigate('/library')}>
              กลับไปยังคลังข้อสอบ
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container className="py-4">
      {/* ส่วนหัวของหน้า - แสดงชื่อข้อสอบและปุ่มต่างๆ */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">{quiz.title}</h2>
          <p className="text-muted mb-0">
            {quiz.question_type} | {quiz.questions.length} คำถาม
            {quiz.student_level && ` | ระดับ: ${quiz.student_level}`}
          </p>
        </Col>
        <Col xs="auto">
          <QuizActionMenu 
            quiz={quiz}
            onRenameSuccess={(newTitle) => setQuiz({...quiz, title: newTitle})}
            onDeleteSuccess={() => navigate('/library')}
          />
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col md={8}>
          {/* รายละเอียดข้อสอบ - ครอบด้วย ErrorBoundary ค่าเริ่มต้น */}
          <ErrorBoundary>
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">รายละเอียดข้อสอบ</h5>
              </Card.Header>
              <Card.Body>
                <p><strong>หัวข้อ:</strong> {quiz.topic}</p>
                <p><strong>วันที่สร้าง:</strong> {new Date(quiz.created_at).toLocaleDateString()}</p>
                <p><strong>ประเภท:</strong> {quiz.question_type}</p>
                <p><strong>จำนวนข้อ:</strong> {quiz.questions.length}</p>
                {quiz.student_level && (
                  <p><strong>ระดับ:</strong> {quiz.student_level}</p>
                )}
              </Card.Body>
            </Card>
          
            {/* รายการคำถาม - ไม่ครอบด้วย ErrorBoundary เพราะเป็นข้อมูลสำคัญที่ควรแสดงผลเสมอ */}
            <h3 className="mb-3">คำถามทั้งหมด</h3>
            {quiz.questions.map((question, index) => (
              <Card key={index} className="mb-3 shadow-sm">
                <Card.Header className="bg-light">
                  <h5 className="mb-0">ข้อที่ {index + 1}</h5>
                </Card.Header>
                <Card.Body>
                  <p className="h6 mb-3">{question.questionText}</p>
                  
                  {quiz.question_type === 'Multiple Choice' && question.options && (
                    <ul className="list-group mb-3">
                      {question.options.map((option, optIndex) => (
                        <li 
                          key={optIndex} 
                          className={`list-group-item ${option.isCorrect ? 'list-group-item-success' : ''}`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option.text}
                          {option.isCorrect && ' ✓'}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {question.explanation && (
                    <div className="mt-3 bg-light p-3 rounded">
                      <h6 className="mb-2">คำอธิบาย:</h6>
                      <p className="mb-0">{question.explanation}</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ))}
          </ErrorBoundary>
        </Col>
        
        <Col md={4}>
          {/* สถิติข้อสอบ - ครอบด้วย ErrorBoundary พร้อม fallback UI เฉพาะ */}
          <ErrorBoundary 
            fallback={
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0">ไม่สามารถแสดงสถิติ</h5>
                </Card.Header>
                <Card.Body>
                  <p className="mb-0">เกิดข้อผิดพลาดในการแสดงสถิติข้อสอบ ลองโหลดหน้านี้ใหม่อีกครั้ง</p>
                </Card.Body>
              </Card>
            }
          >
            <QuizStatistics quizId={id} />
          </ErrorBoundary>
          
          {/* ข้อสอบที่พร้อมพิมพ์ - ครอบด้วย ErrorBoundary อีก instance หนึ่ง */}
          <ErrorBoundary 
            fallback={
              <Alert variant="warning">
                ไม่สามารถแสดงตัวเลือกการพิมพ์ได้ กรุณาลองโหลดหน้าใหม่
              </Alert>
            }
          >
            <PrintableQuiz quiz={quiz} />
          </ErrorBoundary>
        </Col>
      </Row>
    </Container>
  );
};

export default ViewQuizPage;