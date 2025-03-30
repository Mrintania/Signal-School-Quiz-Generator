// frontend/src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const { login, isAuthenticated, error, clearError, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [validated, setValidated] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const passwordInputRef = React.useRef(null);

    // Extract redirect URL from location state or query params
    const from = location.state?.from?.pathname || new URLSearchParams(location.search).get('redirect') || '/';

    // If already authenticated, redirect
    useEffect(() => {
        if (isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    // Handle email input key press - move to password field on Tab or Enter
    const handleEmailKeyDown = (e) => {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            passwordInputRef.current.focus();
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous errors
        clearError();

        // Form validation
        const form = e.currentTarget;
        if (form.checkValidity() === false) {
            e.stopPropagation();
            setValidated(true);
            return;
        }

        const { email, password } = formData;

        const success = await login(email, password);

        if (success) {
            navigate(from, { replace: true });
        }
        // No need to reset the form on failure - email will be preserved
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
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
                        <h2>เข้าสู่ระบบ</h2>
                        <p className="text-muted">สร้างข้อสอบด้วย AI - ง่ายและรวดเร็ว</p>
                    </div>

                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            {/* Display error message */}
                            {error && (
                                <Alert variant="danger" onClose={clearError} dismissible>
                                    {error}
                                </Alert>
                            )}

                            {/* Display success message from location state */}
                            {location.state?.message && (
                                <Alert variant="success" onClose={() => {
                                    const state = { ...location.state };
                                    delete state.message;
                                    navigate(location.pathname, { state, replace: true });
                                }} dismissible>
                                    {location.state.message}
                                </Alert>
                            )}

                            <Form noValidate validated={validated} onSubmit={handleSubmit}>
                                {/* Email field */}
                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label>อีเมล</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        placeholder="กรอกอีเมลของคุณ"
                                        value={formData.email}
                                        onChange={handleChange}
                                        onKeyDown={handleEmailKeyDown}
                                        required
                                        disabled={loading}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        กรุณากรอกอีเมลที่ถูกต้อง
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Password field */}
                                <Form.Group className="mb-3" controlId="password">
                                    <div className="d-flex justify-content-between">
                                        <Form.Label>รหัสผ่าน</Form.Label>
                                        <Link to="/forgot-password" className="small text-decoration-none">ลืมรหัสผ่าน?</Link>
                                    </div>
                                    <InputGroup>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="กรอกรหัสผ่านของคุณ"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                            ref={passwordInputRef}
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            onClick={togglePasswordVisibility}
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/>
                                                    <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z"/>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                                    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                                                </svg>
                                            )}
                                        </Button>
                                        <Form.Control.Feedback type="invalid">
                                            กรุณากรอกรหัสผ่าน
                                        </Form.Control.Feedback>
                                    </InputGroup>
                                </Form.Group>

                                {/* Submit button */}
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
                                                กำลังเข้าสู่ระบบ...
                                            </>
                                        ) : (
                                            'เข้าสู่ระบบ'
                                        )}
                                    </Button>
                                </div>
                            </Form>

                            <div className="mt-4 text-center">
                                <p className="mb-0">ยังไม่มีบัญชี? <Link to="/register" className="text-decoration-none">สมัครใช้งาน</Link></p>
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

export default LoginPage;