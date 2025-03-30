// frontend/src/components/admin/AdminSystemSettings.js
import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert, Tab, Nav, Spinner } from 'react-bootstrap';

const AdminSystemSettings = () => {
    // Settings states
    const [generalSettings, setGeneralSettings] = useState({
        siteName: 'Signal School Quiz Generator',
        siteDescription: 'AI-powered quiz generator for teachers and educators',
        language: 'th',
        timezone: 'Asia/Bangkok',
        dateFormat: 'DD/MM/YYYY',
        filesPerPage: '20',
    });

    const [emailSettings, setEmailSettings] = useState({
        smtpServer: 'smtp.example.com',
        smtpPort: '587',
        smtpUsername: 'noreply@example.com',
        smtpPassword: '********',
        fromEmail: 'noreply@example.com',
        fromName: 'Signal School',
        enableSSL: true,
    });

    const [aiSettings, setAiSettings] = useState({
        apiKey: '********',
        maxTokens: '2000',
        temperature: '0.7',
        topP: '1',
        presencePenalty: '0',
        frequencyPenalty: '0',
        apiEndpoint: 'https://api.openai.com/v1',
        model: 'gpt-4-turbo',
    });

    const [integrationSettings, setIntegrationSettings] = useState({
        googleApiKey: '',
        googleClientId: '',
        googleClientSecret: '',
        storageProvider: 'local',
        awsRegion: '',
        awsAccessKey: '',
        awsSecretKey: '',
        awsBucket: '',
    });

    // UI states
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [error, setError] = useState(null);
    const [testingEmail, setTestingEmail] = useState(false);
    const [testingAI, setTestingAI] = useState(false);

    // Handle form changes
    const handleGeneralChange = (e) => {
        const { name, value } = e.target;
        setGeneralSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEmailChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEmailSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAIChange = (e) => {
        const { name, value } = e.target;
        setAiSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleIntegrationChange = (e) => {
        const { name, value } = e.target;
        setIntegrationSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Save settings
    const saveSettings = async (settingsType) => {
        try {
            setLoading(true);
            setError(null);

            // Mock API call delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Show success message
            setSuccessMessage(`บันทึกการตั้งค่า ${getSettingsLabel(settingsType)} เรียบร้อยแล้ว`);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error(`Error saving ${settingsType} settings:`, error);
            setError(`ไม่สามารถบันทึกการตั้งค่า ${getSettingsLabel(settingsType)} โปรดลองอีกครั้งในภายหลัง`);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get settings label in Thai
    const getSettingsLabel = (settingsType) => {
        switch (settingsType) {
            case 'general': return 'ทั่วไป';
            case 'email': return 'อีเมล';
            case 'ai': return 'AI';
            case 'integrations': return 'การเชื่อมต่อภายนอก';
            default: return 'ระบบ';
        }
    };

    // Test email settings
    const testEmailSettings = async () => {
        try {
            setTestingEmail(true);

            // Mock API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Show success message
            setSuccessMessage('ทดสอบการตั้งค่าอีเมลสำเร็จ ระบบสามารถส่งอีเมลได้อย่างถูกต้อง');

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error testing email settings:', error);
            setError('ไม่สามารถทดสอบการตั้งค่าอีเมลได้ โปรดตรวจสอบการตั้งค่าและลองอีกครั้ง');
        } finally {
            setTestingEmail(false);
        }
    };

    // Test AI settings
    const testAISettings = async () => {
        try {
            setTestingAI(true);

            // Mock API call delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Show success message
            setSuccessMessage('ทดสอบการตั้งค่า AI สำเร็จ ระบบสามารถเชื่อมต่อกับ API ได้อย่างถูกต้อง');

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error testing AI settings:', error);
            setError('ไม่สามารถทดสอบการตั้งค่า AI ได้ โปรดตรวจสอบการตั้งค่าและลองอีกครั้ง');
        } finally {
            setTestingAI(false);
        }
    };

    return (
        <>
            {/* Success message */}
            {successMessage && (
                <Alert variant="success" onClose={() => setSuccessMessage(null)} dismissible>
                    {successMessage}
                </Alert>
            )}

            {/* Error message */}
            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    {error}
                </Alert>
            )}

            <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white">
                    <h5 className="mb-0">ตั้งค่าระบบ</h5>
                </Card.Header>
                <Card.Body>
                    <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                        <Row>
                            <Col md={3}>
                                <Nav variant="pills" className="flex-column">
                                    <Nav.Item>
                                        <Nav.Link eventKey="general">
                                            <div className="d-flex align-items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                    <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
                                                    <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z" />
                                                </svg>
                                                การตั้งค่าทั่วไป
                                            </div>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="email">
                                            <div className="d-flex align-items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z" />
                                                </svg>
                                                ตั้งค่าระบบอีเมล
                                            </div>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="ai">
                                            <div className="d-flex align-items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                    <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.58 26.58 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.933.933 0 0 1-.765.935c-.845.147-2.34.346-4.235.346-1.895 0-3.39-.2-4.235-.346A.933.933 0 0 1 3 9.219V8.062Zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a24.767 24.767 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25.286 25.286 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135Z" />
                                                    <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2V1.866ZM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5Z" />
                                                </svg>
                                                ตั้งค่า AI
                                            </div>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="integrations">
                                            <div className="d-flex align-items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                                                </svg>
                                                การเชื่อมต่อภายนอก
                                            </div>
                                        </Nav.Link>
                                    </Nav.Item>
                                </Nav>
                            </Col>

                            <Col md={9}>
                                <Tab.Content>
                                    {/* General Settings Tab */}
                                    <Tab.Pane eventKey="general">
                                        <h5 className="mb-3">การตั้งค่าทั่วไป</h5>
                                        <Form>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>ชื่อเว็บไซต์</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="siteName"
                                                            value={generalSettings.siteName}
                                                            onChange={handleGeneralChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>คำอธิบายเว็บไซต์</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="siteDescription"
                                                            value={generalSettings.siteDescription}
                                                            onChange={handleGeneralChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>ภาษาหลัก</Form.Label>
                                                        <Form.Select
                                                            name="language"
                                                            value={generalSettings.language}
                                                            onChange={handleGeneralChange}
                                                        >
                                                            <option value="th">ไทย</option>
                                                            <option value="en">อังกฤษ</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>เขตเวลา</Form.Label>
                                                        <Form.Select
                                                            name="timezone"
                                                            value={generalSettings.timezone}
                                                            onChange={handleGeneralChange}
                                                        >
                                                            <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                                                            <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                                                            <option value="UTC">UTC (GMT+0)</option>
                                                            <option value="America/New_York">America/New_York (GMT-5)</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>รูปแบบวันที่</Form.Label>
                                                        <Form.Select
                                                            name="dateFormat"
                                                            value={generalSettings.dateFormat}
                                                            onChange={handleGeneralChange}
                                                        >
                                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>จำนวนรายการต่อหน้า</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="filesPerPage"
                                                            value={generalSettings.filesPerPage}
                                                            onChange={handleGeneralChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="mt-3 d-flex justify-content-end">
                                                <Button
                                                    variant="primary"
                                                    onClick={() => saveSettings('general')}
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
                                                            กำลังบันทึก...
                                                        </>
                                                    ) : 'บันทึกการตั้งค่า'}
                                                </Button>
                                            </div>
                                        </Form>
                                    </Tab.Pane>

                                    {/* Email Settings Tab */}
                                    <Tab.Pane eventKey="email">
                                        <h5 className="mb-3">ตั้งค่าระบบอีเมล</h5>
                                        <Form>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>SMTP Server</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="smtpServer"
                                                            value={emailSettings.smtpServer}
                                                            onChange={handleEmailChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>SMTP Port</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="smtpPort"
                                                            value={emailSettings.smtpPort}
                                                            onChange={handleEmailChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>SMTP Username</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="smtpUsername"
                                                            value={emailSettings.smtpUsername}
                                                            onChange={handleEmailChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>SMTP Password</Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            name="smtpPassword"
                                                            value={emailSettings.smtpPassword}
                                                            onChange={handleEmailChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>From Email</Form.Label>
                                                        <Form.Control
                                                            type="email"
                                                            name="fromEmail"
                                                            value={emailSettings.fromEmail}
                                                            onChange={handleEmailChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>From Name</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="fromName"
                                                            value={emailSettings.fromName}
                                                            onChange={handleEmailChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Form.Group className="mb-3">
                                                <Form.Check
                                                    type="checkbox"
                                                    label="Enable SSL"
                                                    name="enableSSL"
                                                    checked={emailSettings.enableSSL}
                                                    onChange={handleEmailChange}
                                                />
                                            </Form.Group>

                                            <div className="mt-3 d-flex justify-content-between">
                                                <Button
                                                    variant="outline-primary"
                                                    onClick={testEmailSettings}
                                                    disabled={testingEmail || loading}
                                                >
                                                    {testingEmail ? (
                                                        <>
                                                            <Spinner
                                                                as="span"
                                                                animation="border"
                                                                size="sm"
                                                                role="status"
                                                                aria-hidden="true"
                                                                className="me-2"
                                                            />
                                                            กำลังทดสอบ...
                                                        </>
                                                    ) : 'ทดสอบการตั้งค่า'}
                                                </Button>

                                                <Button
                                                    variant="primary"
                                                    onClick={() => saveSettings('email')}
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
                                                            กำลังบันทึก...
                                                        </>
                                                    ) : 'บันทึกการตั้งค่า'}
                                                </Button>
                                            </div>
                                        </Form>
                                    </Tab.Pane>

                                    {/* AI Settings Tab */}
                                    <Tab.Pane eventKey="ai">
                                        <h5 className="mb-3">ตั้งค่า AI</h5>
                                        <Form>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>API Key</Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            name="apiKey"
                                                            value={aiSettings.apiKey}
                                                            onChange={handleAIChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>API Endpoint</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="apiEndpoint"
                                                            value={aiSettings.apiEndpoint}
                                                            onChange={handleAIChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Form.Group className="mb-3">
                                                <Form.Label>Model</Form.Label>
                                                <Form.Select
                                                    name="model"
                                                    value={aiSettings.model}
                                                    onChange={handleAIChange}
                                                >
                                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                                    <option value="gpt-4">GPT-4</option>
                                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                </Form.Select>
                                            </Form.Group>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Max Tokens</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            name="maxTokens"
                                                            value={aiSettings.maxTokens}
                                                            onChange={handleAIChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Temperature</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            max="1"
                                                            name="temperature"
                                                            value={aiSettings.temperature}
                                                            onChange={handleAIChange}
                                                        />
                                                        <Form.Text className="text-muted">
                                                            ค่าระหว่าง 0 ถึง 1, ค่าสูงทำให้ผลลัพธ์มีความสร้างสรรค์มากขึ้น
                                                        </Form.Text>
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Top P</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.1"
                                                            min="0"
                                                            max="1"
                                                            name="topP"
                                                            value={aiSettings.topP}
                                                            onChange={handleAIChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Presence Penalty</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            step="0.1"
                                                            min="-2"
                                                            max="2"
                                                            name="presencePenalty"
                                                            value={aiSettings.presencePenalty}
                                                            onChange={handleAIChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <div className="mt-3 d-flex justify-content-between">
                                                <Button
                                                    variant="outline-primary"
                                                    onClick={testAISettings}
                                                    disabled={testingAI || loading}
                                                >
                                                    {testingAI ? (
                                                        <>
                                                            <Spinner
                                                                as="span"
                                                                animation="border"
                                                                size="sm"
                                                                role="status"
                                                                aria-hidden="true"
                                                                className="me-2"
                                                            />
                                                            กำลังทดสอบการเชื่อมต่อ...
                                                        </>
                                                    ) : 'ทดสอบการเชื่อมต่อ'}
                                                </Button>

                                                <Button
                                                    variant="primary"
                                                    onClick={() => saveSettings('ai')}
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
                                                            กำลังบันทึก...
                                                        </>
                                                    ) : 'บันทึกการตั้งค่า'}
                                                </Button>
                                            </div>
                                        </Form>
                                    </Tab.Pane>

                                    {/* Integrations Tab */}
                                    <Tab.Pane eventKey="integrations">
                                        <h5 className="mb-3">การเชื่อมต่อภายนอก</h5>
                                        <Form>
                                            <h6 className="mb-3">Google Integration</h6>
                                            <Row>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Google API Key</Form.Label>
                                                        <Form.Control
                                                            type="password"
                                                            name="googleApiKey"
                                                            value={integrationSettings.googleApiKey}
                                                            onChange={handleIntegrationChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col md={6}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label>Google Client ID</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="googleClientId"
                                                            value={integrationSettings.googleClientId}
                                                            onChange={handleIntegrationChange}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                            </Row>

                                            <Form.Group className="mb-4">
                                                <Form.Label>Google Client Secret</Form.Label>
                                                <Form.Control
                                                    type="password"
                                                    name="googleClientSecret"
                                                    value={integrationSettings.googleClientSecret}
                                                    onChange={handleIntegrationChange}
                                                />
                                            </Form.Group>

                                            <h6 className="mb-3">Storage Settings</h6>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Storage Provider</Form.Label>
                                                <Form.Select
                                                    name="storageProvider"
                                                    value={integrationSettings.storageProvider}
                                                    onChange={handleIntegrationChange}
                                                >
                                                    <option value="local">Local Storage</option>
                                                    <option value="aws">Amazon S3</option>
                                                    <option value="gcs">Google Cloud Storage</option>
                                                </Form.Select>
                                            </Form.Group>

                                            {integrationSettings.storageProvider === 'aws' && (
                                                <>
                                                    <Row>
                                                        <Col md={6}>
                                                            <Form.Group className="mb-3">
                                                                <Form.Label>AWS Region</Form.Label>
                                                                <Form.Control
                                                                    type="text"
                                                                    name="awsRegion"
                                                                    value={integrationSettings.awsRegion}
                                                                    onChange={handleIntegrationChange}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        <Col md={6}>
                                                            <Form.Group className="mb-3">
                                                                <Form.Label>AWS Bucket</Form.Label>
                                                                <Form.Control
                                                                    type="text"
                                                                    name="awsBucket"
                                                                    value={integrationSettings.awsBucket}
                                                                    onChange={handleIntegrationChange}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                    </Row>

                                                    <Row>
                                                        <Col md={6}>
                                                            <Form.Group className="mb-3">
                                                                <Form.Label>AWS Access Key</Form.Label>
                                                                <Form.Control
                                                                    type="text"
                                                                    name="awsAccessKey"
                                                                    value={integrationSettings.awsAccessKey}
                                                                    onChange={handleIntegrationChange}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                        <Col md={6}>
                                                            <Form.Group className="mb-3">
                                                                <Form.Label>AWS Secret Key</Form.Label>
                                                                <Form.Control
                                                                    type="password"
                                                                    name="awsSecretKey"
                                                                    value={integrationSettings.awsSecretKey}
                                                                    onChange={handleIntegrationChange}
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                    </Row>
                                                </>
                                            )}

                                            <div className="mt-3 d-flex justify-content-end">
                                                <Button
                                                    variant="primary"
                                                    onClick={() => saveSettings('integrations')}
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
                                                            กำลังบันทึก...
                                                        </>
                                                    ) : 'บันทึกการตั้งค่า'}
                                                </Button>
                                            </div>
                                        </Form>
                                    </Tab.Pane>
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Card.Body>
            </Card>
        </>
    );
};

export default AdminSystemSettings;