// frontend/src/pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgotPasswordPage = () => {
  const { forgotPassword, clearError, error, loading } = useAuth();
  
  // Form state
  const [email, setEmail] = useState('');
  const [validated, setValidated] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Handle form input change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    clearError && clearError();
    
    // Form validation
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Call forgot password function from auth context
    const success = await forgotPassword(email);
    
    if (success) {
      setSubmitSuccess(true);
      setEmail('');
      setValidated(false);
    }
  };
  
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6} xl={5}>
          <div className="text-center mb-4">
            <img
              src="/logo.png"
              alt="Signal School Quiz Generator"
              height="60"
              className="mb-3"
            />
            <h2>ลืมรหัสผ่าน</h2>
            <p className="text-muted">กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับรีเซ็ตรหัสผ่าน</p>
          </div>
          
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              {/* Success message */}
              {submitSuccess && (
                <Alert variant="success" onClose={() => setSubmitSuccess(false)} dismissible>
                  <Alert.Heading>คำขอรีเซ็ตรหัสผ่านสำเร็จ!</Alert.Heading>
                  <p>
                    หากอีเมลของคุณมีอยู่ในระบบของเรา เราได้ส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลดังกล่าวแล้ว
                    กรุณาตรวจสอบอีเมลของคุณและทำตามคำแนะนำ
                  </p>
                  <p>
                    หากคุณไม่ได้รับอีเมล กรุณาตรวจสอบโฟลเดอร์สแปมหรือ junk ของคุณด้วย
                  </p>
                </Alert>
              )}
              
              {/* Error message */}
              {error && (
                <Alert variant="danger" onClose={clearError} dismissible>
                  {error}
                </Alert>
              )}
              
              {/* Only show form if not already submitted successfully */}
              {!submitSuccess && (
                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                  <Form.Group className="mb-3" controlId="email">
                    <Form.Label>อีเมล</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="กรอกอีเมลที่ใช้ลงทะเบียน"
                      value={email}
                      onChange={handleEmailChange}
                      required
                      disabled={loading}
                    />
                    <Form.Control.Feedback type="invalid">
                      กรุณากรอกอีเมลที่ถูกต้อง
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <div className="d-grid gap-2 mt-4">
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
                          กำลังส่งคำขอ...
                        </>
                      ) : (
                        'ส่งลิงก์รีเซ็ตรหัสผ่าน'
                      )}
                    </Button>
                  </div>
                </Form>
              )}
              
              <div className="mt-4 text-center">
                <p className="mb-0">
                  <Link to="/login" className="text-decoration-none">
                    กลับไปยังหน้าเข้าสู่ระบบ
                  </Link>
                </p>
              </div>
            </Card.Body>
          </Card>
          
          <div className="text-center mt-4">
            <p className="text-muted small">
              &copy; {new Date().getFullYear()} Signal School. All rights reserved.
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPasswordPage;