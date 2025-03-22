import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Nav } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

const AccountPage = () => {
  // User state - in a real app, this would come from authentication context
  const [user, setUser] = useState({
    name: 'Pornsupat Vutisuwan',
    email: 'pornsupat@example.com',
    role: 'Teacher',
    preferences: {
      defaultQuestionCount: 10,
      defaultQuizType: 'Multiple Choice',
      defaultLanguage: 'thai'
    }
  });
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [preferenceForm, setPreferenceForm] = useState({
    defaultQuestionCount: user.preferences.defaultQuestionCount,
    defaultQuizType: user.preferences.defaultQuizType,
    defaultLanguage: user.preferences.defaultLanguage
  });
  
  // UI states
  const [activeTab, setActiveTab] = useState('profile');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [preferenceSuccess, setPreferenceSuccess] = useState(false);
  
  // Use theme context
  const { currentTheme, toggleTheme } = useTheme();
  
  // Handle form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePreferenceChange = (e) => {
    const { name, value } = e.target;
    setPreferenceForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submissions
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!profileForm.name.trim()) {
      setProfileError('Name is required');
      setProfileSuccess(false);
      return;
    }
    
    if (!profileForm.email.trim() || !profileForm.email.includes('@')) {
      setProfileError('Valid email is required');
      setProfileSuccess(false);
      return;
    }
    
    // In a real app, this would call an API to update the user's profile
    // For now, we'll just update the local state
    setUser(prev => ({
      ...prev,
      name: profileForm.name,
      email: profileForm.email
    }));
    
    setProfileSuccess(true);
    setProfileError(null);
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setProfileSuccess(false);
    }, 3000);
  };
  
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      setPasswordSuccess(false);
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      setPasswordSuccess(false);
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordSuccess(false);
      return;
    }
    
    // In a real app, this would call an API to update the password
    // For now, we'll just show a success message
    setPasswordSuccess(true);
    setPasswordError(null);
    
    // Reset the form
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setPasswordSuccess(false);
    }, 3000);
  };
  
  const handlePreferenceSubmit = (e) => {
    e.preventDefault();
    
    // In a real app, this would call an API to update the user's preferences
    // For now, we'll just update the local state
    setUser(prev => ({
      ...prev,
      preferences: {
        defaultQuestionCount: preferenceForm.defaultQuestionCount,
        defaultQuizType: preferenceForm.defaultQuizType,
        defaultLanguage: preferenceForm.defaultLanguage
      }
    }));
    
    setPreferenceSuccess(true);
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setPreferenceSuccess(false);
    }, 3000);
  };
  
  return (
    <Container className="py-4">
      <h2 className="mb-4">My Account</h2>
      
      <Row>
        <Col md={3} lg={3} className="mb-4">
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <div 
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center text-white bg-primary"
                style={{ width: '80px', height: '80px', fontSize: '2rem' }}
              >
                {user.name.charAt(0)}
              </div>
              <h5>{user.name}</h5>
              <p className="text-muted">{user.role}</p>
            </Card.Body>
            
            <div className="border-top">
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'profile'} 
                    onClick={() => setActiveTab('profile')}
                    className="rounded-0"
                  >
                    Profile Information
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'password'} 
                    onClick={() => setActiveTab('password')}
                    className="rounded-0"
                  >
                    Change Password
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'preferences'} 
                    onClick={() => setActiveTab('preferences')}
                    className="rounded-0"
                  >
                    Quiz Preferences
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'appearance'} 
                    onClick={() => setActiveTab('appearance')}
                    className="rounded-0"
                  >
                    Appearance
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>
          </Card>
        </Col>
        
        <Col md={9} lg={9}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              {/* Profile Information */}
              {activeTab === 'profile' && (
                <div>
                  <h4 className="mb-4">Profile Information</h4>
                  
                  {profileSuccess && (
                    <Alert variant="success">
                      Profile updated successfully!
                    </Alert>
                  )}
                  
                  {profileError && (
                    <Alert variant="danger">
                      {profileError}
                    </Alert>
                  )}
                  
                  <Form onSubmit={handleProfileSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Form.Control 
                        type="text" 
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control 
                        type="email" 
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Role</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={user.role}
                        disabled
                      />
                      <Form.Text className="text-muted">
                        Your role cannot be changed. Please contact an administrator.
                      </Form.Text>
                    </Form.Group>
                    
                    <Button variant="primary" type="submit">
                      Update Profile
                    </Button>
                  </Form>
                </div>
              )}
              
              {/* Change Password */}
              {activeTab === 'password' && (
                <div>
                  <h4 className="mb-4">Change Password</h4>
                  
                  {passwordSuccess && (
                    <Alert variant="success">
                      Password changed successfully!
                    </Alert>
                  )}
                  
                  {passwordError && (
                    <Alert variant="danger">
                      {passwordError}
                    </Alert>
                  )}
                  
                  <Form onSubmit={handlePasswordSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <Form.Text className="text-muted">
                        Password must be at least 8 characters.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Confirm New Password</Form.Label>
                      <Form.Control 
                        type="password" 
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </Form.Group>
                    
                    <Button variant="primary" type="submit">
                      Change Password
                    </Button>
                  </Form>
                </div>
              )}
              
              {/* Quiz Preferences */}
              {activeTab === 'preferences' && (
                <div>
                  <h4 className="mb-4">Quiz Preferences</h4>
                  
                  {preferenceSuccess && (
                    <Alert variant="success">
                      Preferences updated successfully!
                    </Alert>
                  )}
                  
                  <Form onSubmit={handlePreferenceSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Default Number of Questions</Form.Label>
                      <Form.Select
                        name="defaultQuestionCount"
                        value={preferenceForm.defaultQuestionCount}
                        onChange={handlePreferenceChange}
                      >
                        <option value="5">5 questions</option>
                        <option value="10">10 questions</option>
                        <option value="15">15 questions</option>
                        <option value="20">20 questions</option>
                        <option value="25">25 questions</option>
                      </Form.Select>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Default Quiz Type</Form.Label>
                      <Form.Select
                        name="defaultQuizType"
                        value={preferenceForm.defaultQuizType}
                        onChange={handlePreferenceChange}
                      >
                        <option value="Multiple Choice">Multiple Choice</option>
                        <option value="Essay">Essay</option>
                      </Form.Select>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Default Language</Form.Label>
                      <Form.Select
                        name="defaultLanguage"
                        value={preferenceForm.defaultLanguage}
                        onChange={handlePreferenceChange}
                      >
                        <option value="english">English</option>
                        <option value="thai">Thai</option>
                      </Form.Select>
                    </Form.Group>
                    
                    <Button variant="primary" type="submit">
                      Save Preferences
                    </Button>
                  </Form>
                </div>
              )}
              
              {/* Appearance */}
              {activeTab === 'appearance' && (
                <div>
                  <h4 className="mb-4">Appearance</h4>
                  
                  <Form.Group className="mb-4">
                    <Form.Label>Theme</Form.Label>
                    <div className="mb-3">
                      <Form.Check
                        type="radio"
                        label="Light Mode"
                        name="theme"
                        id="theme-light"
                        checked={currentTheme === 'light'}
                        onChange={() => currentTheme !== 'light' && toggleTheme()}
                        className="mb-2"
                      />
                      <Form.Check
                        type="radio"
                        label="Dark Mode"
                        name="theme"
                        id="theme-dark"
                        checked={currentTheme === 'dark'}
                        onChange={() => currentTheme !== 'dark' && toggleTheme()}
                      />
                    </div>
                    <Form.Text className="text-muted">
                      Choose the theme for your application interface.
                    </Form.Text>
                  </Form.Group>
                  
                  <div className="border-top pt-4 mt-4">
                    <h6 className="mb-3">Preview</h6>
                    <div className={`p-3 rounded ${currentTheme === 'dark' ? 'bg-dark text-light' : 'bg-light'}`}>
                      <div className="mb-2">Theme: {currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
                      <div className="d-flex align-items-center mt-2">
                        <div className={`btn btn-primary me-2`}>Primary Button</div>
                        <div className={`btn btn-secondary me-2`}>Secondary Button</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AccountPage;