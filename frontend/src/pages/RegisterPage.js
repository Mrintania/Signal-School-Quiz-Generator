// frontend/src/pages/RegisterPage.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
    const { register, isAuthenticated, error, clearError, loading } = useAuth();
    const navigate = useNavigate();

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        schoolName: ''
    });

    const [validated, setValidated] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({
        value: 0,
        variant: 'danger',
        text: 'ไม่รัดกุม'
    });
    const [registerSuccess, setRegisterSuccess] = useState(false);

    // If already authenticated, redirect to home
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));

        // Check password strength
        if (name === 'password') {
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
        clearError();

        // Form validation
        const form = e.currentTarget;
        if (form.checkValidity() === false) {
            e.stopPropagation();
            setValidated(true);
            return;
        }

        // Check if passwords match
        if (formData.password !== formData.confirmPassword) {
            // Create a custom validation message
            const confirmPasswordInput = form.querySelector('#confirmPassword');
            confirmPasswordInput.setCustomValidity('Passwords do not match');
            setValidated(true);
            return;
        }

        const { firstName, lastName, email, password, schoolName } = formData;

        const success = await register({
            firstName,
            lastName,
            email,
            password,
            schoolName: schoolName || undefined // Only include if provided
        });

        if (success) {
            setRegisterSuccess(true);
            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                confirmPassword: '',
                schoolName: ''
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

    return (
        <Container className="py-5">
            <Row className="justify-content-center">
                <Col md={8} lg={6}>
                    <div className="text-center mb-4">
                        <img
                            src="/logo.png"
                            alt="Signal School Quiz Generator"
                            height="60"
                            className="mb-3"
                        />
                        <h2>สมัครใช้งาน</h2>
                        <p className="text-muted">สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน</p>
                    </div>

                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            {/* Display error message */}
                            {error && (
                                <Alert variant="danger" onClose={clearError} dismissible>
                                    {error}
                                </Alert>
                            )}

                            {/* Display success message */}
                            {registerSuccess && (
                                <Alert variant="success" dismissible onClose={() => setRegisterSuccess(false)}>
                                    <Alert.Heading>ลงทะเบียนสำเร็จ!</Alert.Heading>
                                    <p>
                                        เราได้ส่งอีเมลยืนยันไปยังที่อยู่อีเมลที่คุณให้ไว้แล้ว กรุณาตรวจสอบอีเมลและคลิกลิงก์ยืนยันเพื่อเปิดใช้งานบัญชีของคุณ
                                    </p>
                                    <div className="d-flex justify-content-end">
                                        <Button variant="outline-success" onClick={() => navigate('/login')}>
                                            ไปที่หน้าเข้าสู่ระบบ
                                        </Button>
                                    </div>
                                </Alert>
                            )}

                            <Form noValidate validated={validated} onSubmit={handleSubmit}>
                                <Row>
                                    {/* First Name */}
                                    <Col md={6} className="mb-3">
                                        <Form.Group controlId="firstName">
                                            <Form.Label>ชื่อ</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="firstName"
                                                placeholder="กรอกชื่อของคุณ"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                required
                                                disabled={loading || registerSuccess}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                กรุณากรอกชื่อ
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>

                                    {/* Last Name */}
                                    <Col md={6} className="mb-3">
                                        <Form.Group controlId="lastName">
                                            <Form.Label>นามสกุล</Form.Label>
                                            <Form.Control
                                                type="text"
                                                name="lastName"
                                                placeholder="กรอกนามสกุลของคุณ"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                required
                                                disabled={loading || registerSuccess}
                                            />
                                            <Form.Control.Feedback type="invalid">
                                                กรุณากรอกนามสกุล
                                            </Form.Control.Feedback>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Email */}
                                <Form.Group className="mb-3" controlId="email">
                                    <Form.Label>อีเมล</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        placeholder="กรอกอีเมลของคุณ"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        disabled={loading || registerSuccess}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        กรุณากรอกอีเมลที่ถูกต้อง
                                    </Form.Control.Feedback>
                                </Form.Group>

                                {/* Password */}
                                <Form.Group className="mb-3" controlId="password">
                                    <Form.Label>รหัสผ่าน</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            placeholder="กรอกรหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={8}
                                            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                                            disabled={loading || registerSuccess}
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            onClick={togglePasswordVisibility}
                                            disabled={loading || registerSuccess}
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
                                    {formData.password && (
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
                                    <Form.Label>ยืนยันรหัสผ่าน</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            placeholder="กรอกรหัสผ่านอีกครั้ง"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            isInvalid={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
                                            disabled={loading || registerSuccess}
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            onClick={toggleConfirmPasswordVisibility}
                                            disabled={loading || registerSuccess}
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

                                {/* School Name (Optional) */}
                                <Form.Group className="mb-3" controlId="schoolName">
                                    <Form.Label>ชื่อโรงเรียน/องค์กร (ไม่บังคับ)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="schoolName"
                                        placeholder="กรอกชื่อโรงเรียนหรือองค์กรของคุณ"
                                        value={formData.schoolName}
                                        onChange={handleChange}
                                        disabled={loading || registerSuccess}
                                    />
                                    <Form.Text className="text-muted">
                                        หากคุณกรอกชื่อโรงเรียนหรือองค์กร คุณจะได้รับสิทธิ์เป็นผู้ดูแลของโรงเรียนหรือองค์กรนั้น
                                    </Form.Text>
                                </Form.Group>

                                {/* Terms and Privacy Policy */}
                                <Form.Group className="mb-3" controlId="termsCheck">
                                    <Form.Check
                                        type="checkbox"
                                        required
                                        disabled={loading || registerSuccess}
                                        label={
                                            <span>
                                                ฉันยอมรับ <Link to="/terms" target="_blank">เงื่อนไขการใช้งาน</Link> และ <Link to="/privacy" target="_blank">นโยบายความเป็นส่วนตัว</Link>
                                            </span>
                                        }
                                        feedback="คุณต้องยอมรับเงื่อนไขก่อนดำเนินการต่อ"
                                        feedbackType="invalid"
                                    />
                                </Form.Group>

                                {/* Submit button */}
                                <div className="d-grid gap-2 mt-4">
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        size="lg"
                                        disabled={loading || registerSuccess}
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
                                                กำลังสมัคร...
                                            </>
                                        ) : (
                                            'สมัครใช้งาน'
                                        )}
                                    </Button>
                                </div>
                            </Form>

                            <div className="mt-4 text-center">
                                <p className="mb-0">มีบัญชีอยู่แล้ว? <Link to="/login" className="text-decoration-none">เข้าสู่ระบบ</Link></p>
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

export default RegisterPage;