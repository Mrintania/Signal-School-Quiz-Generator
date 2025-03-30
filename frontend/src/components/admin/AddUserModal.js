import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { adminService } from '../../services/api';

const AddUserModal = ({ show, onHide, onUserAdded }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'teacher',
        status: 'active',
        schoolId: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [schools, setSchools] = useState([]);
    const [loadingSchools, setLoadingSchools] = useState(false);

    // Load available schools when modal opens
    React.useEffect(() => {
        if (show) {
            fetchSchools();
        }
    }, [show]);

    const fetchSchools = async () => {
        try {
            setLoadingSchools(true);
            const response = await adminService.getAllSchools(1, 100); // Get up to 100 schools

            if (response.success) {
                setSchools(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
        } finally {
            setLoadingSchools(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Password validation - at least 8 characters with 1 uppercase, 1 lowercase, and 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!formData.firstName.trim()) {
            setError('First name is required');
            return false;
        }

        if (!formData.lastName.trim()) {
            setError('Last name is required');
            return false;
        }

        if (!formData.email.trim() || !emailRegex.test(formData.email)) {
            setError('A valid email is required');
            return false;
        }

        if (!formData.password || !passwordRegex.test(formData.password)) {
            setError('Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear previous errors
        setError(null);

        // Validate the form
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            // Call the API to create user
            const response = await adminService.createUser(formData);

            if (response.success) {
                // Notify parent component that a user was added
                onUserAdded(response.user);

                // Reset form and close modal
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    role: 'teacher',
                    status: 'active',
                    schoolId: ''
                });

                onHide();
            } else {
                throw new Error(response.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            setError(error.message || 'An error occurred while creating the user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Add New User</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" onClose={() => setError(null)} dismissible>
                            {error}
                        </Alert>
                    )}

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Enter first name"
                                    required
                                />
                            </Form.Group>
                        </div>

                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Enter last name"
                                    required
                                />
                            </Form.Group>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter email address"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter password"
                            required
                        />
                        <Form.Text className="text-muted">
                            Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.
                        </Form.Text>
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Role</Form.Label>
                                <Form.Select name="role" value={formData.role} onChange={handleChange}>
                                    <option value="teacher">Teacher</option>
                                    <option value="school_admin">School Admin</option>
                                    <option value="admin">System Admin</option>
                                </Form.Select>
                            </Form.Group>
                        </div>

                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Status</Form.Label>
                                <Form.Select name="status" value={formData.status} onChange={handleChange}>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="inactive">Inactive</option>
                                </Form.Select>
                            </Form.Group>
                        </div>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>School/Organization</Form.Label>
                        <Form.Select
                            name="schoolId"
                            value={formData.schoolId}
                            onChange={handleChange}
                            disabled={loadingSchools}
                        >
                            <option value="">None</option>
                            {schools.map(school => (
                                <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                        </Form.Select>
                        {loadingSchools && (
                            <div className="text-center mt-2">
                                <Spinner animation="border" size="sm" /> Loading schools...
                            </div>
                        )}
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">Creating...</span>
                            </>
                        ) : (
                            'Create User'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default AddUserModal;