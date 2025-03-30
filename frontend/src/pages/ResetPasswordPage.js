// frontend/src/pages/ResetPasswordPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ResetPasswordPage = () => {
    const { resetPassword, clearError, error, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Extract token from URL parameters
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    // Form state
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [validated, setValidated] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({
        value: 0,
        variant: 'danger',
        text: 'ไม่รัดกุม'
    });
    const [resetSuccess, setResetSuccess] = useState(false);

    // Check if token is provided
    useEffect(() => {
        if (!token) {
            // If no token provided, show error or navigate to forgot password page
            setFormData(prev => ({
                ...prev,
                tokenError: 'ไม่พบโทเค็นสำหรับรีเซ็ตรหัสผ่าน โปรดขอลิงก์รีเซ็ตรหัสผ่านใหม่'
            }));
        }
    }, [token]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));

        // Check password strength
        if (name === 'newPassword') {
            checkPasswordStrength(value);
        }
    };

    // Check password strength
    const checkPasswordStrength = (password) => {
        let strength = 0;
        let feedback = 'ไม่รัดกุม';
        let variant = 'danger';

        if (password.length >= 8) strength += 1;
        if (password.match(/[A-Z]/)) strength += 1;
        if (password.match(/[a-z]/)) strength += 1;
        if (password.match(/[0-9]/)) strength += 1;
        if (password.match(/[^A-Za-z0-9]/)) strength += 1;

        if (strength === 0) {
            feedback = 'ไม่รัดกุม';
            variant = 'danger';
        } else if (strength < 3) {
            feedback = 'อ่อนแอ';
            variant = 'danger';
        } else if (strength < 4) {
            feedback = 'ปานกลาง';
            variant = 'warning';
        } else if (strength < 5) {
            feedback = 'ดี';
            variant = 'success';
        } else {
            feedback = 'รัดกุม';
            variant = 'success';
        }

        // Calculate percentage for progress bar
        const percentValue = (strength / 5) * 100;

        setPasswordStrength({
            value: percentValue,
            variant,
            text: feedback
        });
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

        // Check if passwords match
        if (formData.newPassword !== formData.confirmPassword) {
            // Create a custom validation message
            const confirmPasswordInput = form.querySelector('#confirmPassword');
            confirmPasswordInput.setCustomValidity('รหัสผ่านไม่ตรงกัน');
            setValidated(true);
            return;
        }

        // Call reset password function from auth context
        const success = await resetPassword(token, formData.newPassword);

        if (success) {
            setResetSuccess(true);
            // Reset form data
            setFormData({
                newPassword: '',
                confirmPassword: ''
            });
            setValidated(false);
        }
    };

    // Toggle password visibility
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const toggleConfirmPasswordVisibility = () => {
        setShowConfirmPassword(!showConfirmPassword);
    };

    // If token error, show error message
    if (formData.tokenError) {
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
                            <h2>รีเซ็ตรหัสผ่าน</h2>
                        </div>

                        <Card className="border-0 shadow-sm">
                            <Card.Body className="p-4">
                                <Alert variant="danger">
                                    <Alert.Heading>ไม่สามารถรีเซ็ตรหัสผ่านได้</Alert.Heading>
                                    <p>{formData.tokenError}</p>
                                    <div className="d-grid gap-2 mt-3">
                                        <Link to="/forgot-password" className="btn btn-primary">
                                            ขอลิงก์รีเซ็ตรหัสผ่านใหม่
                                        </Link>
                                    </div>
                                </Alert>
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
    }

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
                        <h2>รีเซ็ตรหัสผ่าน</h2>
                        <p className="text-muted">สร้างรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
                    </div>

                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            {/* Success message */}
                            {resetSuccess && (
                                <Alert variant="success" dismissible>
                                    <Alert.Heading>รีเซ็ตรหัสผ่านสำเร็จ!</Alert.Heading>
                                    <p>
                                        รหัสผ่านของคุณได้รับการเปลี่ยนแปลงเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
                                    </p>
                                    <div className="d-grid gap-2 mt-3">
                                        <Button variant="primary" onClick={() => navigate('/login')}>
                                            ไปยังหน้าเข้าสู่ระบบ
                                        </Button>
                                    </div>
                                </Alert>
                            )}

                            {/* Error message */}
                            {error && (
                                <Alert variant="danger" onClose={clearError} dismissible>
                                    {error}
                                </Alert>
                            )}

                            {/* Only show form if not already reset successfully */}
                            {!resetSuccess && (
                                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                                    {/* New Password */}
                                    <Form.Group className="mb-3" controlId="newPassword">
                                        <Form.Label>รหัสผ่านใหม่</Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type={showPassword ? "text" : "password"}
                                                name="newPassword"
                                                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
                                                value={formData.newPassword}
                                                onChange={handleChange}
                                                required
                                                minLength={8}
                                                pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                                                disabled={loading}
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                onClick={togglePasswordVisibility}
                                                disabled={loading}
                                            >
                                                {showPassword ? (
                                                    <i className="bi bi-eye-slash"></i>
                                                ) : (
                                                    <i className="bi bi-eye"></i>
                                                )}
                                            </Button>
                                            <Form.Control.Feedback type="invalid">
                                                รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข
                                            </Form.Control.Feedback>
                                        </InputGroup>

                                        {/* Password strength indicator */}
                                        {formData.newPassword && (
                                            <div className="mt-2">
                                                <div className="d-flex justify-content-between mb-1 small">
                                                    <span>ความรัดกุมของรหัสผ่าน:</span>
                                                    <span className={`text-${passwordStrength.variant}`}>{passwordStrength.text}</span>
                                                </div>
                                                <div className="progress" style={{ height: '5px' }}>
                                                    <div
                                                        className={`progress-bar bg-${passwordStrength.variant}`}
                                                        role="progressbar"
                                                        style={{ width: `${passwordStrength.value}%` }}
                                                        aria-valuenow={passwordStrength.value}
                                                        aria-valuemin="0"
                                                        aria-valuemax="100"
                                                    ></div>
                                                </div>
                                                <div className="mt-1 small text-muted">
                                                    รหัสผ่านควรมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ
                                                </div>
                                            </div>
                                        )}
                                    </Form.Group>

                                    {/* Confirm Password */}
                                    <Form.Group className="mb-3" controlId="confirmPassword">
                                        <Form.Label>ยืนยันรหัสผ่านใหม่</Form.Label>
                                        <InputGroup>
                                            <Form.Control
                                                type={showConfirmPassword ? "text" : "password"}
                                                name="confirmPassword"
                                                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                required
                                                isInvalid={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== ''}
                                                disabled={loading}
                                            />
                                            <Button
                                                variant="outline-secondary"
                                                onClick={toggleConfirmPasswordVisibility}
                                                disabled={loading}
                                            >
                                                {showConfirmPassword ? (
                                                    <i className="bi bi-eye-slash"></i>
                                                ) : (
                                                    <i className="bi bi-eye"></i>
                                                )}
                                            </Button>
                                            <Form.Control.Feedback type="invalid">
                                                รหัสผ่านไม่ตรงกัน
                                            </Form.Control.Feedback>
                                        </InputGroup>
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
                                                    กำลังรีเซ็ตรหัสผ่าน...
                                                </>
                                            ) : (
                                                'รีเซ็ตรหัสผ่าน'
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

export default ResetPasswordPage;