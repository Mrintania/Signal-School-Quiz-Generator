import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Form, Badge, Spinner, Dropdown, Modal, Alert } from 'react-bootstrap';
import PendingUsers from './PendingUsers';
import { adminService } from '../../services/api';
import AddUserModal from './AddUserModal';


const UsersContent = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newStatus, setNewStatus] = useState('');
    const [updating, setUpdating] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRole, setNewRole] = useState('');
    const [showAddUserModal, setShowAddUserModal] = useState(false);

    // Fetch users on component mount and when filters change
    useEffect(() => {
        fetchUsers();
    }, [page, limit, filter, search]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await adminService.getAllUsers(page, limit, search, filter);

            if (response.success) {
                setUsers(response.data);
                setTotalPages(Math.ceil(response.pagination.total / limit));
            } else {
                throw new Error(response.message || 'Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setError(error.message || 'An error occurred while fetching users');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
    };

    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const openStatusModal = (user) => {
        setSelectedUser(user);
        setNewStatus(user.status);
        setShowStatusModal(true);
    };

    const openRoleModal = (user) => {
        setSelectedUser(user);
        setNewRole(user.role);
        setShowRoleModal(true);
    };

    const handleStatusUpdate = async () => {
        if (!selectedUser || !newStatus) return;

        try {
            setUpdating(true);
            const response = await adminService.updateUserStatus(selectedUser.id, newStatus);

            if (response.success) {
                // Update the user status in the local state
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === selectedUser.id ? { ...user, status: newStatus } : user
                    )
                );
                setShowStatusModal(false);
            } else {
                throw new Error(response.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            setError(error.message || 'An error occurred while updating user status');
        } finally {
            setUpdating(false);
        }
    };

    const handleRoleUpdate = async () => {
        if (!selectedUser || !newRole) return;

        try {
            setUpdating(true);
            const response = await adminService.updateUserRole(selectedUser.id, newRole);

            if (response.success) {
                // Update the user role in the local state
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === selectedUser.id ? { ...user, role: newRole } : user
                    )
                );
                setShowRoleModal(false);
            } else {
                throw new Error(response.message || 'Failed to update user role');
            }
        } catch (error) {
            console.error('Error updating user role:', error);
            setError(error.message || 'An error occurred while updating user role');
        } finally {
            setUpdating(false);
        }
    };

    // Fixed function name to match what's used in the component
    const handleOpenAddUserModal = () => {
        setShowAddUserModal(true);
    };

    // Fixed function name to match what's used in the component
    const handleCloseAddUserModal = () => {
        setShowAddUserModal(false);
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'active': return 'success';
            case 'pending': return 'warning';
            case 'suspended': return 'danger';
            case 'inactive': return 'secondary';
            default: return 'light';
        }
    };

    const getRoleBadgeVariant = (role) => {
        switch (role) {
            case 'admin': return 'danger';
            case 'school_admin': return 'primary';
            case 'teacher': return 'info';
            default: return 'light';
        }
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return date.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleUserAdded = (newUser) => {
        // Add the new user to the list and refresh
        setUsers(prev => [newUser, ...prev]);

        // Show success message
        setError(null);

        // Refresh the list to ensure it's up to date
        fetchUsers();
    };

    return (
        <>
            <PendingUsers />


            <Card className="border-0 shadow-sm mt-4">
                <Card.Header className="bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">All Users</h5>
                        <Button variant="primary" size="sm" onClick={handleOpenAddUserModal}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                            </svg>
                            Add New User
                        </Button>
                    </div>
                </Card.Header>

                <Card.Body>
                    {error && (
                        <Alert variant="danger" onClose={() => setError(null)} dismissible>
                            {error}
                        </Alert>
                    )}

                    <div className="d-flex mb-3">
                        <Form.Group className="me-2 flex-grow-1">
                            <Form.Control
                                type="text"
                                placeholder="Search by name or email"
                                value={search}
                                onChange={handleSearchChange}
                            />
                        </Form.Group>
                        <Form.Group className="w-25">
                            <Form.Select value={filter} onChange={handleFilterChange}>
                                <option value="">All Users</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="suspended">Suspended</option>
                                <option value="inactive">Inactive</option>
                                <option value="admin">Admins</option>
                                <option value="school_admin">School Admins</option>
                                <option value="teacher">Teachers</option>
                            </Form.Select>
                        </Form.Group>
                    </div>

                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2">Loading users...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="mb-0 text-muted">No users found matching your criteria.</p>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <Table hover>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Last Login</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar-sm me-2">
                                                            {user.profileImage ? (
                                                                <img
                                                                    src={user.profileImage}
                                                                    alt={`${user.firstName} ${user.lastName}`}
                                                                    className="rounded-circle"
                                                                    width="32"
                                                                    height="32"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                                                    style={{ width: '32px', height: '32px', fontSize: '14px' }}
                                                                >
                                                                    {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                </td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <Badge bg={getRoleBadgeVariant(user.role)}>
                                                        {user.role === 'school_admin' ? 'School Admin' :
                                                            user.role === 'admin' ? 'System Admin' :
                                                                'Teacher'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Badge bg={getStatusBadgeVariant(user.status)}>
                                                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                                    </Badge>
                                                </td>
                                                <td>{user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}</td>
                                                <td>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant="light" size="sm" id={`dropdown-${user.id}`}>
                                                            Actions
                                                        </Dropdown.Toggle>
                                                        <Dropdown.Menu>
                                                            <Dropdown.Item onClick={() => openStatusModal(user)}>
                                                                Change Status
                                                            </Dropdown.Item>
                                                            <Dropdown.Item onClick={() => openRoleModal(user)}>
                                                                Change Role
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item>View Profile</Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div>
                                    Showing {Math.min((page - 1) * limit + 1, users.length)} to {Math.min(page * limit, users.length)} of {totalPages * limit} entries
                                </div>
                                <div>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        className="me-2"
                                        disabled={page === 1}
                                        onClick={() => handlePageChange(page - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        disabled={page === totalPages}
                                        onClick={() => handlePageChange(page + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Status Change Modal */}
            <Modal show={showStatusModal} onHide={() => setShowStatusModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Change User Status</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        You are changing the status for user: <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>
                    </p>
                    <Form.Group>
                        <Form.Label>Select New Status</Form.Label>
                        <Form.Select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                        >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                            <option value="inactive">Inactive</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleStatusUpdate}
                        disabled={updating}
                    >
                        {updating ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">Updating...</span>
                            </>
                        ) : (
                            'Update Status'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Role Change Modal */}
            <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Change User Role</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        You are changing the role for user: <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong>
                    </p>
                    <Form.Group>
                        <Form.Label>Select New Role</Form.Label>
                        <Form.Select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                        >
                            <option value="admin">System Admin</option>
                            <option value="school_admin">School Admin</option>
                            <option value="teacher">Teacher</option>
                        </Form.Select>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleRoleUpdate}
                        disabled={updating}
                    >
                        {updating ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">Updating...</span>
                            </>
                        ) : (
                            'Update Role'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
            {/* Add User Modal */}
            <AddUserModal
                show={showAddUserModal}
                onHide={handleCloseAddUserModal}
                onUserAdded={handleUserAdded}
            />

        </>
    );
};

export default UsersContent;