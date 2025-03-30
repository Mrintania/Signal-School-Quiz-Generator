// frontend/src/components/admin/AdminUsersManagement.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, InputGroup, Pagination, Modal, Spinner, Badge, Alert } from 'react-bootstrap';
import { adminService } from '../../services/api';

const AdminUsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // New user form state
    const [newUser, setNewUser] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: 'teacher', // Default role
        schoolId: '',
    });

    // Load users on component mount and when search, page changes
    useEffect(() => {
        fetchUsers();
    }, [currentPage, searchQuery]);

    // Fetch users from API
    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            // For now, mock data since we don't have the actual API endpoint yet
            // In production, this would call adminService.getAllUsers() with pagination/search params

            // Simulate API response delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock data for users
            const mockUsers = [
                { id: 1, firstName: 'สมชาย', lastName: 'ใจดี', email: 'somchai@example.com', role: 'teacher', status: 'active', createdAt: '2023-01-15', school: 'โรงเรียนตัวอย่าง 1' },
                { id: 2, firstName: 'วันดี', lastName: 'รักเรียน', email: 'wandee@example.com', role: 'teacher', status: 'active', createdAt: '2023-02-20', school: 'โรงเรียนตัวอย่าง 1' },
                { id: 3, firstName: 'มานะ', lastName: 'ตั้งใจ', email: 'mana@example.com', role: 'school_admin', status: 'active', createdAt: '2023-03-10', school: 'โรงเรียนตัวอย่าง 2' },
                { id: 4, firstName: 'สมศรี', lastName: 'มีสุข', email: 'somsri@example.com', role: 'teacher', status: 'inactive', createdAt: '2023-04-05', school: 'โรงเรียนตัวอย่าง 3' },
                { id: 5, firstName: 'ประชา', lastName: 'ชาญชัย', email: 'pracha@example.com', role: 'admin', status: 'active', createdAt: '2023-01-01', school: null },
            ];

            // Filter by search term if provided
            const filteredUsers = searchQuery
                ? mockUsers.filter(user =>
                    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (user.school && user.school.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                : mockUsers;

            setUsers(filteredUsers);
            setTotalPages(Math.ceil(filteredUsers.length / 10)); // Assuming 10 items per page
        } catch (error) {
            console.error('Error fetching users:', error);
            setError('ไม่สามารถดึงข้อมูลผู้ใช้ได้ โปรดลองอีกครั้งในภายหลัง');
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1); // Reset to first page when searching
    };

    // Handle add user form changes
    const handleNewUserChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle add user submit
    const handleAddUser = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            // In production, this would call the API to add a user
            await new Promise(resolve => setTimeout(resolve, 800));

            // Show success message
            setSuccessMessage('เพิ่มผู้ใช้ใหม่เรียบร้อยแล้ว');

            // Reset form and close modal
            setNewUser({
                firstName: '',
                lastName: '',
                email: '',
                role: 'teacher',
                schoolId: '',
            });

            setShowAddModal(false);

            // Refresh user list
            fetchUsers();

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error adding user:', error);
            setError('ไม่สามารถเพิ่มผู้ใช้ได้ โปรดลองอีกครั้งในภายหลัง');
        } finally {
            setLoading(false);
        }
    };

    // Handle pagination
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Format date for display
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH');
    };

    // Render role badge
    const RoleBadge = ({ role }) => {
        switch (role) {
            case 'admin':
                return <Badge bg="danger">ผู้ดูแลระบบ</Badge>;
            case 'school_admin':
                return <Badge bg="primary">ผู้ดูแลโรงเรียน</Badge>;
            case 'teacher':
                return <Badge bg="success">ครู</Badge>;
            default:
                return <Badge bg="secondary">ผู้ใช้</Badge>;
        }
    };

    // Render status badge
    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'active':
                return <Badge bg="success">ใช้งาน</Badge>;
            case 'inactive':
                return <Badge bg="secondary">ไม่ใช้งาน</Badge>;
            case 'pending':
                return <Badge bg="warning">รอยืนยัน</Badge>;
            case 'suspended':
                return <Badge bg="danger">ระงับ</Badge>;
            default:
                return <Badge bg="secondary">ไม่ทราบสถานะ</Badge>;
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
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">จัดการผู้ใช้</h5>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowAddModal(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                            </svg>
                            เพิ่มผู้ใช้ใหม่
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body>
                    {/* Search bar */}
                    <div className="mb-4">
                        <InputGroup>
                            <InputGroup.Text className="bg-white">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                                </svg>
                            </InputGroup.Text>
                            <Form.Control
                                placeholder="ค้นหาผู้ใช้ตามชื่อ อีเมล หรือโรงเรียน..."
                                value={searchQuery}
                                onChange={handleSearch}
                            />
                            {searchQuery && (
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => setSearchQuery('')}
                                >
                                    ล้าง
                                </Button>
                            )}
                        </InputGroup>
                    </div>

                    {/* Users table */}
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3">กำลังโหลดข้อมูลผู้ใช้...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-muted mb-0">ไม่พบข้อมูลผู้ใช้</p>
                            {searchQuery && (
                                <p className="text-muted">
                                    ลองค้นหาด้วยคำที่แตกต่างออกไป หรือล้างตัวกรอง
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            <Table responsive hover>
                                <thead className="bg-light">
                                    <tr>
                                        <th>ชื่อ</th>
                                        <th>อีเมล</th>
                                        <th>บทบาท</th>
                                        <th>สถานะ</th>
                                        <th>โรงเรียน</th>
                                        <th>วันที่สร้าง</th>
                                        <th>การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.firstName} {user.lastName}</td>
                                            <td>{user.email}</td>
                                            <td><RoleBadge role={user.role} /></td>
                                            <td><StatusBadge status={user.status} /></td>
                                            <td>{user.school || '-'}</td>
                                            <td>{formatDate(user.createdAt)}</td>
                                            <td>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowEditModal(true);
                                                    }}
                                                >
                                                    แก้ไข
                                                </Button>
                                                {user.status === 'active' ? (
                                                    <Button
                                                        variant="outline-secondary"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Handle deactivate user
                                                        }}
                                                    >
                                                        ระงับ
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Handle activate user
                                                        }}
                                                    >
                                                        เปิดใช้งาน
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center mt-4">
                                    <Pagination>
                                        <Pagination.First
                                            onClick={() => handlePageChange(1)}
                                            disabled={currentPage === 1}
                                        />
                                        <Pagination.Prev
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        />

                                        {/* Page numbers */}
                                        {[...Array(totalPages)].map((_, index) => (
                                            <Pagination.Item
                                                key={index + 1}
                                                active={index + 1 === currentPage}
                                                onClick={() => handlePageChange(index + 1)}
                                            >
                                                {index + 1}
                                            </Pagination.Item>
                                        ))}

                                        <Pagination.Next
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        />
                                        <Pagination.Last
                                            onClick={() => handlePageChange(totalPages)}
                                            disabled={currentPage === totalPages}
                                        />
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Add User Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>เพิ่มผู้ใช้ใหม่</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAddUser}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>ชื่อ</Form.Label>
                            <Form.Control
                                type="text"
                                name="firstName"
                                value={newUser.firstName}
                                onChange={handleNewUserChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>นามสกุล</Form.Label>
                            <Form.Control
                                type="text"
                                name="lastName"
                                value={newUser.lastName}
                                onChange={handleNewUserChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>อีเมล</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={newUser.email}
                                onChange={handleNewUserChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>บทบาท</Form.Label>
                            <Form.Select
                                name="role"
                                value={newUser.role}
                                onChange={handleNewUserChange}
                                required
                            >
                                <option value="teacher">ครู</option>
                                <option value="school_admin">ผู้ดูแลโรงเรียน</option>
                                <option value="admin">ผู้ดูแลระบบ</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>โรงเรียน (ไม่บังคับ)</Form.Label>
                            <Form.Select
                                name="schoolId"
                                value={newUser.schoolId}
                                onChange={handleNewUserChange}
                            >
                                <option value="">-- ไม่มีโรงเรียน --</option>
                                <option value="1">โรงเรียนตัวอย่าง 1</option>
                                <option value="2">โรงเรียนตัวอย่าง 2</option>
                                <option value="3">โรงเรียนตัวอย่าง 3</option>
                            </Form.Select>
                            <Form.Text className="text-muted">
                                การเลือกโรงเรียนจะเป็นตัวกำหนดว่าผู้ใช้จะสามารถเข้าถึงข้อมูลของโรงเรียนใดได้บ้าง
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
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
                            ) : 'เพิ่มผู้ใช้'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Edit User Modal - Similar to Add User Modal but with existing data */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>แก้ไขข้อมูลผู้ใช้</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>ชื่อ</Form.Label>
                                <Form.Control
                                    type="text"
                                    defaultValue={selectedUser.firstName}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>นามสกุล</Form.Label>
                                <Form.Control
                                    type="text"
                                    defaultValue={selectedUser.lastName}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>อีเมล</Form.Label>
                                <Form.Control
                                    type="email"
                                    defaultValue={selectedUser.email}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>บทบาท</Form.Label>
                                <Form.Select
                                    defaultValue={selectedUser.role}
                                >
                                    <option value="teacher">ครู</option>
                                    <option value="school_admin">ผู้ดูแลโรงเรียน</option>
                                    <option value="admin">ผู้ดูแลระบบ</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>สถานะ</Form.Label>
                                <Form.Select
                                    defaultValue={selectedUser.status}
                                >
                                    <option value="active">ใช้งาน</option>
                                    <option value="inactive">ไม่ใช้งาน</option>
                                    <option value="suspended">ระงับ</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>โรงเรียน</Form.Label>
                                <Form.Select
                                    defaultValue={selectedUser.school ? "1" : ""}
                                >
                                    <option value="">-- ไม่มีโรงเรียน --</option>
                                    <option value="1">โรงเรียนตัวอย่าง 1</option>
                                    <option value="2">โรงเรียนตัวอย่าง 2</option>
                                    <option value="3">โรงเรียนตัวอย่าง 3</option>
                                </Form.Select>
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        ยกเลิก
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            // Handle save changes
                            setShowEditModal(false);
                            setSuccessMessage('อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว');
                            setTimeout(() => setSuccessMessage(null), 3000);
                        }}
                    >
                        บันทึกการเปลี่ยนแปลง
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default AdminUsersManagement;