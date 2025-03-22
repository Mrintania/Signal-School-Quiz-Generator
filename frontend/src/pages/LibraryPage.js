import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Dropdown, Table, Modal, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { quizService } from '../services/api';

// ไอคอน SVG สำหรับใช้ในหน้า
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
  </svg>
);

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z"/>
  </svg>
);

const QuizIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#F19158" strokeWidth="1" viewBox="0 0 24 24">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" fill="#FFF1E6" stroke="#F19158" />
    <path fill="#F19158" d="M12 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
    <path d="M8 14h8M8 17h5" stroke="#F19158" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 0.25a0.75 0.75 0 0 1 0.673 0.418l1.882 3.815 4.21 0.612a0.75 0.75 0 0 1 0.416 1.279l-3.046 2.97 0.719 4.192a0.75 0.75 0 0 1-1.088 0.791L8 12.347l-3.766 1.98a0.75 0.75 0 0 1-1.088-0.79l0.72-4.194L0.818 6.374a0.75 0.75 0 0 1 0.416-1.28l4.21-0.611L7.327 0.668A0.75 0.75 0 0 1 8 0.25z"/>
  </svg>
);

const ThreeDotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
  </svg>
);

const LibraryPage = () => {
  const navigate = useNavigate();
  
  // State สำหรับข้อมูลหลัก
  const [quizzes, setQuizzes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('root'); // root คือโฟลเดอร์หลัก
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State สำหรับการเรียงลำดับ
  const [sortConfig, setSortConfig] = useState({
    key: 'name', // เริ่มต้นเรียงตามชื่อ
    direction: 'asc' // เรียงจาก a-z
  });
  
  // State สำหรับ Modal ต่างๆ
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isCopy, setIsCopy] = useState(false); // true = copy, false = move
  
  // State สำหรับการสร้างโฟลเดอร์ใหม่
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLocation, setNewFolderLocation] = useState('root');
  const [newFolderColor, setNewFolderColor] = useState('#F9E852'); // สีเริ่มต้นเป็นสีเหลือง
  
  // State สำหรับการเปลี่ยนชื่อ
  const [newQuizName, setNewQuizName] = useState('');
  
  // State สำหรับการดูโฟลเดอร์ย่อย
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [destinationFolder, setDestinationFolder] = useState('root');

  // ดึงข้อมูลทั้งหมด (ใช้ useCallback เพื่อป้องกันการสร้างฟังก์ชันใหม่ทุกครั้งที่ render)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // สมมติว่ามี API สำหรับดึงข้อมูลโฟลเดอร์
      // ในที่นี้จะจำลองข้อมูลโฟลเดอร์ไว้ก่อน
      const mockFolders = [
        { id: 'root', name: 'My Library', color: '#F9E852', parentId: null },
        // สามารถเพิ่มโฟลเดอร์อื่นๆ ได้ตามต้องการ
      ];
      
      // ดึงข้อมูลข้อสอบจาก API จริง
      const response = await quizService.getAllQuizzes();
      
      if (response.success) {
        // เพิ่ม field folderId ให้กับทุก quiz (ตอนนี้ให้เป็น root ทั้งหมด)
        const quizzesWithFolder = response.data.map(quiz => ({
          ...quiz,
          folderId: 'root' // เริ่มต้นให้อยู่ใน root folder
        }));
        
        setQuizzes(quizzesWithFolder);
        setFolders(mockFolders);
      } else {
        setError(response.message || 'Failed to fetch quizzes');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดข้อมูลเมื่อเปิดหน้า
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // กรองข้อมูลตามคำค้นหาและโฟลเดอร์ปัจจุบัน
  const filteredQuizzes = quizzes.filter(quiz => {
    // กรองตามโฟลเดอร์ปัจจุบัน
    const folderMatch = quiz.folderId === currentFolder;
    
    // กรองตามคำค้นหา (ถ้ามี)
    const searchMatch = !searchTerm || 
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.topic.toLowerCase().includes(searchTerm.toLowerCase());
    
    return folderMatch && searchMatch;
  });

  // กรองโฟลเดอร์ที่อยู่ในโฟลเดอร์ปัจจุบัน
  const filteredFolders = folders.filter(folder => 
    folder.parentId === currentFolder && folder.id !== 'root'
  );
  
  // เพิ่มฟังก์ชันสำหรับเรียงลำดับข้อมูล
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // เรียงลำดับข้อมูล
  const sortedItems = [...filteredFolders, ...filteredQuizzes].sort((a, b) => {
    // ตัวแปรสำหรับเปรียบเทียบ
    let aValue, bValue;
    
    // กำหนดค่าตามฟิลด์ที่เลือกเรียง
    if (sortConfig.key === 'name') {
      aValue = a.name || a.title || '';
      bValue = b.name || b.title || '';
    } else if (sortConfig.key === 'type') {
      // ให้โฟลเดอร์มาก่อนเสมอ
      if (a.id && !b.id) return -1;
      if (!a.id && b.id) return 1;
      
      aValue = a.id ? 'Folder' : 'Quiz';
      bValue = b.id ? 'Folder' : 'Quiz';
    } else if (sortConfig.key === 'modified') {
      // โฟลเดอร์ไม่มีวันที่แก้ไข ให้มาก่อนเสมอ
      if (a.id && !b.id) return sortConfig.direction === 'asc' ? -1 : 1;
      if (!a.id && b.id) return sortConfig.direction === 'asc' ? 1 : -1;
      
      aValue = a.created_at || a.updated_at || '';
      bValue = b.created_at || b.updated_at || '';
    }
    
    // เปรียบเทียบและเรียงลำดับ
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // ฟังก์ชันสำหรับสร้างโฟลเดอร์ใหม่
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      return; // ไม่อนุญาตให้สร้างโฟลเดอร์ที่ไม่มีชื่อ
    }
    
    // สร้าง ID แบบง่ายๆ
    const folderId = `folder_${Date.now()}`;
    
    // สร้างโฟลเดอร์ใหม่
    const newFolder = {
      id: folderId,
      name: newFolderName,
      color: newFolderColor,
      parentId: newFolderLocation
    };
    
    // อัปเดต state
    setFolders(prevFolders => [...prevFolders, newFolder]);
    
    // ส่งข้อมูลไปยัง localStorage เพื่อให้ Sidebar เข้าถึงได้
    // (ในระบบจริงควรใช้ Context API หรือ Redux แทน)
    const storedFolders = JSON.parse(localStorage.getItem('folders') || '[]');
    localStorage.setItem('folders', JSON.stringify([...storedFolders, newFolder]));
    
    // รีเซ็ต state สำหรับสร้างโฟลเดอร์
    setNewFolderName('');
    setNewFolderColor('#F9E852');
    setNewFolderLocation('root');
    
    // ปิด modal
    setShowCreateFolderModal(false);
  };
  
  // ฟังก์ชันสำหรับเปิดหน้าดูข้อสอบ
  const handleViewQuiz = (quizId) => {
    navigate(`/view/${quizId}`);
  };

  // ฟังก์ชันสำหรับเปลี่ยนชื่อข้อสอบ
  const handleRenameQuiz = async () => {
    if (!newQuizName.trim() || !selectedQuiz) {
      return;
    }
    
    try {
      const response = await quizService.renameQuiz(selectedQuiz.id, newQuizName);
      
      if (response.success) {
        // อัปเดต state
        setQuizzes(prevQuizzes => 
          prevQuizzes.map(quiz => 
            quiz.id === selectedQuiz.id 
              ? { ...quiz, title: newQuizName } 
              : quiz
          )
        );
        
        // แสดงข้อความสำเร็จ (ถ้าต้องการ)
        // alert('Quiz renamed successfully!');
      } else {
        setError(response.message || 'Failed to rename quiz');
      }
    } catch (error) {
      console.error('Error renaming quiz:', error);
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      // รีเซ็ต state และปิด modal
      setNewQuizName('');
      setSelectedQuiz(null);
      setShowRenameModal(false);
    }
  };

  // ฟังก์ชันสำหรับลบข้อสอบ
  const handleDeleteQuiz = async () => {
    if (!selectedQuiz) {
      return;
    }
    
    try {
      const response = await quizService.deleteQuiz(selectedQuiz.id);
      
      if (response.success) {
        // อัปเดต state โดยลบข้อสอบที่เลือก
        setQuizzes(prevQuizzes => 
          prevQuizzes.filter(quiz => quiz.id !== selectedQuiz.id)
        );
        
        // แสดงข้อความสำเร็จ (ถ้าต้องการ)
        // alert('Quiz deleted successfully!');
      } else {
        setError(response.message || 'Failed to delete quiz');
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      // รีเซ็ต state และปิด modal
      setSelectedQuiz(null);
      setShowDeleteModal(false);
    }
  };

  // ฟังก์ชันสำหรับย้ายหรือคัดลอกข้อสอบ
  const handleMoveOrCopy = async () => {
    if (!selectedQuiz || !destinationFolder) {
      return;
    }
    
    try {
      if (isCopy) {
        // คัดลอกข้อสอบ
        const quizData = {
          title: `${selectedQuiz.title}`, // อาจมีการเปลี่ยนชื่อถ้าซ้ำ
          topic: selectedQuiz.topic,
          questionType: selectedQuiz.question_type,
          studentLevel: selectedQuiz.student_level,
          questions: selectedQuiz.questions || []
        };
        
        // เรียก API เพื่อบันทึกข้อสอบใหม่
        const response = await quizService.saveQuiz(quizData);
        
        if (response.success) {
          // สมมติว่า response มี quizId ของข้อสอบใหม่
          const newQuizId = response.quizId;
          
          // สร้างข้อสอบใหม่โดยคัดลอกจากข้อสอบเดิม และเปลี่ยน ID/folder
          const newQuiz = {
            ...selectedQuiz,
            id: newQuizId,
            folderId: destinationFolder
          };
          
          // อัปเดต state โดยเพิ่มข้อสอบใหม่
          setQuizzes(prevQuizzes => [...prevQuizzes, newQuiz]);
          
          // แสดงข้อความสำเร็จ (ถ้าต้องการ)
          // alert('Quiz copied successfully!');
        } else {
          setError(response.message || 'Failed to copy quiz');
        }
      } else {
        // ย้ายข้อสอบ (เปลี่ยนโฟลเดอร์เท่านั้น)
        setQuizzes(prevQuizzes => 
          prevQuizzes.map(quiz => 
            quiz.id === selectedQuiz.id 
              ? { ...quiz, folderId: destinationFolder } 
              : quiz
          )
        );
        
        // แสดงข้อความสำเร็จ (ถ้าต้องการ)
        // alert('Quiz moved successfully!');
      }
    } catch (error) {
      console.error('Error moving/copying quiz:', error);
      setError(error.response?.data?.message || 'An error occurred');
    } finally {
      // รีเซ็ต state และปิด modal
      setSelectedQuiz(null);
      setDestinationFolder('root');
      setShowMoveModal(false);
      setIsCopy(false); // รีเซ็ตกลับเป็น move (ค่าเริ่มต้น)
    }
  };

  // ฟังก์ชันจัดการคลิกที่ Action menu (3 จุด)
  const handleActionClick = (quiz, action) => {
    setSelectedQuiz(quiz);
    
    switch (action) {
      case 'view':
        // นำทางไปยังหน้าดูข้อสอบ
        window.location.href = `/view/${quiz.id}`;
        break;
      case 'edit':
        // ปิดไว้ก่อน เพราะอยู่ระหว่างการพัฒนา
        break;
      case 'export':
        // ส่งต่อไปยังฟังก์ชัน export ที่มีอยู่แล้ว
        window.open(`/api/quizzes/${quiz.id}/export/text`, '_blank');
        break;
      case 'rename':
        setNewQuizName(quiz.title);
        setShowRenameModal(true);
        break;
      case 'move':
        setIsCopy(false);
        setShowMoveModal(true);
        break;
      case 'copy':
        setIsCopy(true);
        setShowMoveModal(true);
        break;
      case 'delete':
        setShowDeleteModal(true);
        break;
      default:
        break;
    }
  };

  // ฟอร์แมตวันที่
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Container fluid className="py-4 px-4">
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 className="mb-0">My Library</h2>
        </Col>
      </Row>

      {/* ช่องค้นหาและปุ่มสร้าง */}
      <Row className="mb-4 align-items-center">
        <Col md={6} lg={4}>
          <InputGroup>
            <InputGroup.Text className="bg-white border-end-0">
              <SearchIcon />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-start-0"
              style={{ boxShadow: 'none' }}
            />
          </InputGroup>
        </Col>
        <Col md={6} lg={8} className="text-md-end mt-3 mt-md-0">
          <Button 
            variant="light" 
            className="me-2 border"
            onClick={() => setShowCreateFolderModal(true)}
          >
            <FolderIcon /> Folder
          </Button>
          <Link to="/create">
            <Button variant="warning" style={{ backgroundColor: '#D7FC70', color: '#000', borderColor: '#D7FC70' }}>
              <StarIcon className="me-1" /> Create new
            </Button>
          </Link>
        </Col>
      </Row>

      {/* ตารางแสดงข้อมูล */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="bg-light border-bottom">
              <tr>
                <th 
                  className="ps-4 cursor-pointer" 
                  onClick={() => requestSort('name')}
                  style={{ cursor: 'pointer' }}
                >
                  Name 
                  <span>
                    {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </span>
                </th>
                <th 
                  className="cursor-pointer" 
                  onClick={() => requestSort('type')}
                  style={{ cursor: 'pointer' }}
                >
                  Type 
                  <span>
                    {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </span>
                </th>
                <th 
                  className="cursor-pointer" 
                  onClick={() => requestSort('modified')}
                  style={{ cursor: 'pointer' }}
                >
                  Modified 
                  <span>
                    {sortConfig.key === 'modified' && (sortConfig.direction === 'asc' ? ' ↑' : ' ↓')}
                  </span>
                </th>
                <th></th> {/* สำหรับปุ่ม actions */}
              </tr>
            </thead>
            <tbody>
              {/* แสดงโฟลเดอร์และข้อสอบที่ผ่านการเรียงลำดับแล้ว */}
              {sortedItems.map(item => {
                if (item.id && item.parentId !== undefined) {
                  // โฟลเดอร์
                  return (
                    <tr key={`folder-${item.id}`} 
                        onClick={() => setCurrentFolder(item.id)}
                        style={{ cursor: 'pointer' }}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <div 
                            className="me-2 rounded" 
                            style={{ 
                              width: '24px', 
                              height: '24px', 
                              backgroundColor: item.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FolderIcon />
                          </div>
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td>Folder</td>
                      <td>-</td>
                      <td className="text-end pe-3">
                        <div className="cursor-pointer" style={{ cursor: 'pointer' }}>
                          <ThreeDotsIcon />
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  // ข้อสอบ
                  return (
                    <tr 
                      key={`quiz-${item.id}`} 
                      onClick={() => handleViewQuiz(item.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="ps-4">
                        <div className="d-flex align-items-center">
                          <div className="me-2">
                            <QuizIcon />
                          </div>
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td>Quiz</td>
                      <td>{formatDate(item.created_at)}</td>
                      <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
                        <Dropdown align="end">
                          <Dropdown.Toggle 
                            as="div" 
                            className="cursor-pointer" 
                            style={{ cursor: 'pointer' }}
                          >
                            <ThreeDotsIcon />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => handleActionClick(item, 'view')}>
                              <div className="d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                  <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                  <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                                </svg>
                                View responses
                              </div>
                            </Dropdown.Item>
                            <Dropdown.Item disabled onClick={() => handleActionClick(item, 'edit')}>
                              <div className="d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                  <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                </svg>
                                Edit
                              </div>
                              <div className="small text-muted ms-4">อยู่ระหว่างการพัฒนา</div>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleActionClick(item, 'export')}>
                              <div className="d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                </svg>
                                Export <Badge pill bg="warning" text="dark" className="ms-1" style={{ fontSize: '0.7em' }}>Pro</Badge>
                              </div>
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={() => handleActionClick(item, 'rename')}>
                              <div className="d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                  <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                                </svg>
                                Rename
                              </div>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => handleActionClick(item, 'move')}>
                              <div className="d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                  <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                                </svg>
                                Move / Copy
                              </div>
                            </Dropdown.Item>
                            <Dropdown.Item className="text-danger" onClick={() => handleActionClick(item, 'delete')}>
                              <div className="d-flex align-items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                                <span className="text-danger">Delete</span>
                              </div>
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </td>
                    </tr>
                  );
                }
              })}

              {/* แสดงข้อความถ้าไม่มีข้อมูล */}
              {filteredFolders.length === 0 && filteredQuizzes.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-5">
                    <p className="mb-0">ไม่พบข้อมูลในโฟลเดอร์นี้</p>
                    {searchTerm && <p className="text-muted">ลองค้นหาด้วยคำค้นอื่น</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal สร้างโฟลเดอร์ */}
      <Modal show={showCreateFolderModal} onHide={() => setShowCreateFolderModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create folder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Folder name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Folder location</Form.Label>
            <Form.Select
              value={newFolderLocation}
              onChange={(e) => setNewFolderLocation(e.target.value)}
            >
              <option value="root">Select</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          
          <div className="mb-3">
            <div className="d-flex justify-content-between">
              {['#F9E852', '#FA8072', '#FFA07A', '#90EE90', '#87CEFA', '#9370DB', '#DDA0DD', '#D3D3D3'].map(color => (
                <div
                  key={color}
                  className={`rounded-circle ${newFolderColor === color ? 'border border-2 border-dark' : ''}`}
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    backgroundColor: color,
                    cursor: 'pointer'
                  }}
                  onClick={() => setNewFolderColor(color)}
                />
              ))}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowCreateFolderModal(false)}>
            Cancel
          </Button>
          <Button
            variant="warning"
            style={{ backgroundColor: '#D7FC70', color: '#000', borderColor: '#D7FC70' }}
            onClick={handleCreateFolder}
          >
            Create folder
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal ย้าย/คัดลอกไฟล์ */}
      <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Move / Copy file</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>File name</Form.Label>
            <Form.Control
              type="text"
              value={selectedQuiz?.title || ''}
              disabled
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Destination folder</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                value={folders.find(f => f.id === destinationFolder)?.name || ''}
                onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                readOnly
                style={{ cursor: 'pointer' }}
              />
              <div className="position-absolute top-50 end-0 translate-middle-y pe-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                </svg>
              </div>
            </div>
            
            {/* Dropdown สำหรับเลือกโฟลเดอร์ */}
            {showFolderDropdown && (
              <div className="border rounded mt-1 shadow-sm bg-white">
                {folders.map(folder => (
                  <div
                    key={folder.id}
                    className="p-2 d-flex align-items-center border-bottom"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setDestinationFolder(folder.id);
                      setShowFolderDropdown(false);
                    }}
                  >
                    <div 
                      className="me-2 rounded" 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        backgroundColor: folder.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FolderIcon />
                    </div>
                    <span>{folder.name}</span>
                    {folder.id === selectedQuiz?.folderId && (
                      <span className="ms-auto text-muted">Current location</span>
                    )}
                  </div>
                ))}
                
                <div
                  className="p-2 d-flex align-items-center text-success"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setShowCreateFolderModal(true);
                    setShowFolderDropdown(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                  </svg>
                  <span>Add folder</span>
                </div>
              </div>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex justify-content-between w-100">
            <Button 
              variant="light" 
              className="px-4"
              onClick={() => {
                setIsCopy(false);
                handleMoveOrCopy();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
              </svg>
              Move file
            </Button>
            <Button 
              variant="light" 
              className="px-4"
              onClick={() => {
                setIsCopy(true);
                handleMoveOrCopy();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
              </svg>
              Copy file
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Modal เปลี่ยนชื่อข้อสอบ */}
      <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rename quiz</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Quiz name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter new name"
              value={newQuizName}
              onChange={(e) => setNewQuizName(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowRenameModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleRenameQuiz}
          >
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal ยืนยันการลบ */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete quiz</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete the quiz "{selectedQuiz?.title}"?</p>
          <p className="text-danger mb-0">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteQuiz}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default LibraryPage;