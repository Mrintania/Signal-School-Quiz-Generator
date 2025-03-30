// frontend/src/components/admin/AdminSchoolsManagement.js
import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, InputGroup, Pagination, Modal, Spinner, Badge, Alert, Row, Col } from 'react-bootstrap';

const AdminSchoolsManagement = () => {
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // New school form state
    const [newSchool, setNewSchool] = useState({
        name: '',
        address: '',
        city: '',
        province: '',
        postalCode: '',
        phone: '',
        email: '',
        type: 'public', // Default type
    });

    // Load schools on component mount and when search/page changes
    useEffect(() => {
        fetchSchools();
    }, [currentPage, searchQuery]);

    // Fetch schools from API (mock data for now)
    const fetchSchools = async () => {
        try {
            setLoading(true);
            setError(null);

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Mock data for schools
            const mockSchools = [
                { id: 1, name: 'โรงเรียนตัวอย่าง 1', type: 'public', address: '123 ถนนสุขุมวิท', city: 'คลองเตย', province: 'กรุงเทพมหานคร', postalCode: '10110', phone: '02-123-4567', email: 'school1@example.com', students: 1250, teachers: 85, status: 'active', createdAt: '2022-01-15' },
                { id: 2, name: 'โรงเรียนตัวอย่าง 2', type: 'private', address: '456 ถนนพหลโยธิน', city: 'จตุจักร', province: 'กรุงเทพมหานคร', postalCode: '10900', phone: '02-234-5678', email: 'school2@example.com', students: 850, teachers: 45, status: 'active', createdAt: '2022-02-20' },
                { id: 3, name: 'โรงเรียนตัวอย่าง 3', type: 'international', address: '789 ถนนสาทร', city: 'สาทร', province: 'กรุงเทพมหานคร', postalCode: '10120', phone: '02-345-6789', email: 'school3@example.com', students: 650, teachers: 60, status: 'active', createdAt: '2022-03-10' },
                { id: 4, name: 'โรงเรียนตัวอย่าง 4', type: 'public', address: '101 ถนนเพชรเกษม', city: 'หาดใหญ่', province: 'สงขลา', postalCode: '90110', phone: '074-123-456', email: 'school4@example.com', students: 950, teachers: 55, status: 'inactive', createdAt: '2022-04-05' },
                { id: 5, name: 'โรงเรียนตัวอย่าง 5', type: 'vocational', address: '202 ถนนมิตรภาพ', city: 'เมือง', province: 'ขอนแก่น', postalCode: '40000', phone: '043-234-567', email: 'school5@example.com', students: 750, teachers: 40, status: 'active', createdAt: '2022-05-01' },
            ];

            // Filter by search term if provided
            const filteredSchools = searchQuery
                ? mockSchools.filter(school =>
                    school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    school.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    school.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    school.type.toLowerCase().includes(searchQuery.toLowerCase())
                )
                : mockSchools;

            setSchools(filteredSchools);
            setTotalPages(Math.ceil(filteredSchools.length / 10)); // Assuming 10 items per page
        } catch (error) {
            console.error('Error fetching schools:', error);
            setError('ไม่สามารถดึงข้อมูลโรงเรียนได้ โปรดลองอีกครั้งในภายหลัง');
        } finally {
            setLoading(false);
        }
    };

    // Handle search
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1); // Reset to first page when searching
    };

    // Handle add school form changes
    const handleNewSchoolChange = (e) => {
        const { name, value } = e.target;
        setNewSchool(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle add school submit
    const handleAddSchool = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            // In production, this would call the API to add a school
            await new Promise(resolve => setTimeout(resolve, 800));

            // Show success message
            setSuccessMessage('เพิ่มโรงเรียนใหม่เรียบร้อยแล้ว');

            // Reset form and close modal
            setNewSchool({
                name: '',
                address: '',
                city: '',
                province: '',
                postalCode: '',
                phone: '',
                email: '',
                type: 'public',
            });

            setShowAddModal(false);

            // Refresh school list
            fetchSchools();

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 3000);
        } catch (error) {
            console.error('Error adding school:', error);
            setError('ไม่สามารถเพิ่มโรงเรียนได้ โปรดลองอีกครั้งในภายหลัง');
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

    // Render type badge
    const TypeBadge = ({ type }) => {
        switch (type) {
            case 'public':
                return <Badge bg="success">รัฐบาล</Badge>;
            case 'private':
                return <Badge bg="primary">เอกชน</Badge>;
            case 'international':
                return <Badge bg="info">นานาชาติ</Badge>;
            case 'vocational':
                return <Badge bg="warning">อาชีวศึกษา</Badge>;
            default:
                return <Badge bg="secondary">อื่นๆ</Badge>;
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
                        <h5 className="mb-0">จัดการโรงเรียน</h5>
                        <Button
                            variant="success"
                            size="sm"
                            onClick={() => setShowAddModal(true)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                            </svg>
                            เพิ่มโรงเรียนใหม่
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
                                placeholder="ค้นหาโรงเรียนตามชื่อ ที่อยู่ หรือประเภท..."
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

                    {/* Schools table */}
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3">กำลังโหลดข้อมูลโรงเรียน...</p>
                        </div>
                    ) : schools.length === 0 ? (
                        <div className="text-center py-5">
                            <p className="text-muted mb-0">ไม่พบข้อมูลโรงเรียน</p>
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
                                        <th>ชื่อโรงเรียน</th>
                                        <th>ประเภท</th>
                                        <th>จังหวัด</th>
                                        <th>นักเรียน</th>
                                        <th>ครู</th>
                                        <th>สถานะ</th>
                                        <th>วันที่สร้าง</th>
                                        <th>การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schools.map(school => (
                                        <tr key={school.id}>
                                            <td>{school.name}</td>
                                            <td><TypeBadge type={school.type} /></td>
                                            <td>{school.province}</td>
                                            <td>{school.students.toLocaleString()}</td>
                                            <td>{school.teachers}</td>
                                            <td><StatusBadge status={school.status} /></td>
                                            <td>{formatDate(school.createdAt)}</td>
                                            <td>
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    className="me-1"
                                                    onClick={() => {
                                                        setSelectedSchool(school);
                                                        setShowEditModal(true);
                                                    }}
                                                >
                                                    แก้ไข
                                                </Button>
                                                <Button
                                                    variant="outline-info"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Handle view school details/dashboard
                                                    }}
                                                >
                                                    รายละเอียด
                                                </Button>
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

            {/* Add School Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>เพิ่มโรงเรียนใหม่</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAddSchool}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>ชื่อโรงเรียน</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={newSchool.name}
                                        onChange={handleNewSchoolChange}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>ประเภทโรงเรียน</Form.Label>
                                    <Form.Select
                                        name="type"
                                        value={newSchool.type}
                                        onChange={handleNewSchoolChange}
                                        required
                                    >
                                        <option value="public">รัฐบาล</option>
                                        <option value="private">เอกชน</option>
                                        <option value="international">นานาชาติ</option>
                                        <option value="vocational">อาชีวศึกษา</option>
                                        <option value="other">อื่นๆ</option>
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>ที่อยู่</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="address"
                                        value={newSchool.address}
                                        onChange={handleNewSchoolChange}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>เขต/อำเภอ</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="city"
                                        value={newSchool.city}
                                        onChange={handleNewSchoolChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>จังหวัด</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="province"
                                        value={newSchool.province}
                                        onChange={handleNewSchoolChange}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>รหัสไปรษณีย์</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="postalCode"
                                        value={newSchool.postalCode}
                                        onChange={handleNewSchoolChange}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>หมายเลขโทรศัพท์</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="phone"
                                        value={newSchool.phone}
                                        onChange={handleNewSchoolChange}
                                        required
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>อีเมลติดต่อ</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        value={newSchool.email}
                                        onChange={handleNewSchoolChange}
                                        required
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            ยกเลิก
                        </Button>
                        <Button
                            variant="success"
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
                            ) : 'เพิ่มโรงเรียน'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Edit School Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>แก้ไขข้อมูลโรงเรียน</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedSchool && (
                        <Form>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>ชื่อโรงเรียน</Form.Label>
                                        <Form.Control
                                            type="text"
                                            defaultValue={selectedSchool.name}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>ประเภทโรงเรียน</Form.Label>
                                        <Form.Select
                                            defaultValue={selectedSchool.type}
                                        >
                                            <option value="public">รัฐบาล</option>
                                            <option value="private">เอกชน</option>
                                            <option value="international">นานาชาติ</option>
                                            <option value="vocational">อาชีวศึกษา</option>
                                            <option value="other">อื่นๆ</option>
                                        </Form.Select>
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>ที่อยู่</Form.Label>
                                        <Form.Control
                                            type="text"
                                            defaultValue={selectedSchool.address}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>เขต/อำเภอ</Form.Label>
                                        <Form.Control
                                            type="text"
                                            defaultValue={selectedSchool.city}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>จังหวัด</Form.Label>
                                        <Form.Control
                                            type="text"
                                            defaultValue={selectedSchool.province}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>รหัสไปรษณีย์</Form.Label>
                                        <Form.Control
                                            type="text"
                                            defaultValue={selectedSchool.postalCode}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>หมายเลขโทรศัพท์</Form.Label>
                                        <Form.Control
                                            type="text"
                                            defaultValue={selectedSchool.phone}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>อีเมลติดต่อ</Form.Label>
                                        <Form.Control
                                            type="email"
                                            defaultValue={selectedSchool.email}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Label>สถานะ</Form.Label>
                                <Form.Select
                                    defaultValue={selectedSchool.status}
                                >
                                    <option value="active">ใช้งาน</option>
                                    <option value="inactive">ไม่ใช้งาน</option>
                                    <option value="pending">รอการยืนยัน</option>
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
                        variant="success"
                        onClick={() => {
                            // Handle save changes
                            setShowEditModal(false);
                            setSuccessMessage('อัปเดตข้อมูลโรงเรียนเรียบร้อยแล้ว');
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

export default AdminSchoolsManagement;