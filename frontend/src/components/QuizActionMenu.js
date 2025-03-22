import React, { useState } from 'react';
import { Dropdown, Modal, Button, Form } from 'react-bootstrap';
import { quizService } from '../services/api';

const QuizActionMenu = ({ quiz, onRenameSuccess, onDeleteSuccess, onMoveSuccess, language = 'thai' }) => {
    // State for modals
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // State for inputs
    const [newTitle, setNewTitle] = useState(quiz?.title || '');
    const [selectedFolder, setSelectedFolder] = useState('root');
    const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Dummy folders - in a real app, these would come from your context or API
    const [folders, setFolders] = useState(() => {
        // Try to load from localStorage if available
        const storedFolders = JSON.parse(localStorage.getItem('folders') || '[]');
        return storedFolders.length > 0 ? storedFolders : [
            { id: 'root', name: 'My Library', color: '#F9E852', parentId: null },
            { id: 'folder_1', name: 'Math', color: '#87CEFA', parentId: 'root' },
            { id: 'folder_2', name: 'Science', color: '#90EE90', parentId: 'root' }
        ];
    });

    // Modal functions
    const openRenameModal = () => {
        setNewTitle(quiz.title);
        setShowRenameModal(true);
    };

    const openMoveModal = () => {
        setShowMoveModal(true);
    };

    const openDeleteModal = () => {
        setShowDeleteModal(true);
    };

    // Action functions
    const handleRename = async () => {
        if (!newTitle.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await quizService.renameQuiz(quiz.id, newTitle);

            if (response.success) {
                setShowRenameModal(false);
                if (onRenameSuccess) onRenameSuccess(newTitle);
            } else {
                setError(response.message || 'Failed to rename quiz');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        setLoading(true);
        setError(null);

        try {
            // เรียกใช้ API เพื่อย้ายข้อสอบ (ตอนนี้จะใช้ localStorage แทน)
            const response = await quizService.moveQuiz(quiz.id, selectedFolder);

            if (response.success) {
                setShowMoveModal(false);
                if (onMoveSuccess) onMoveSuccess(selectedFolder);
            } else {
                setError(response.message || 'Failed to move quiz');
            }
        } catch (error) {
            // เปลี่ยนข้อความ error เพื่อไม่ให้สับสน
            setError('Cannot move quiz at this time. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await quizService.deleteQuiz(quiz.id);

            if (response.success) {
                setShowDeleteModal(false);
                if (onDeleteSuccess) onDeleteSuccess();
            } else {
                setError(response.message || 'Failed to delete quiz');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Handle export
    const handleExport = () => {
        // Open a dropdown or directly export in a format
        quizService.exportQuizToText(quiz.id);
    };





    // Text based on language
    const text = {
        rename: language === 'thai' ? 'แก้ไขชื่อ' : 'Rename',
        move: language === 'thai' ? 'ย้าย / คัดลอก' : 'Move / Copy',
        delete: language === 'thai' ? 'ลบ' : 'Delete',
        export: language === 'thai' ? 'ส่งออก' : 'Export',
        cancel: language === 'thai' ? 'ยกเลิก' : 'Cancel',
        save: language === 'thai' ? 'บันทึก' : 'Save',
        moveFile: language === 'thai' ? 'ย้ายไฟล์' : 'Move file',
        copyFile: language === 'thai' ? 'คัดลอกไฟล์' : 'Copy file',
        fileName: language === 'thai' ? 'ชื่อไฟล์' : 'File name',
        destinationFolder: language === 'thai' ? 'โฟลเดอร์ปลายทาง' : 'Destination folder',
        renameQuiz: language === 'thai' ? 'แก้ไขชื่อข้อสอบ' : 'Rename quiz',
        moveQuiz: language === 'thai' ? 'ย้ายข้อสอบ' : 'Move quiz',
        deleteQuiz: language === 'thai' ? 'ลบข้อสอบ' : 'Delete quiz',
        deleteConfirm: language === 'thai'
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบข้อสอบ "${quiz?.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`
            : `Are you sure you want to delete the quiz "${quiz?.title}"? This action cannot be undone.`,
        quizName: language === 'thai' ? 'ชื่อข้อสอบ' : 'Quiz name',
        deleteAction: language === 'thai' ? 'ลบ' : 'Delete',
        deleteInProgress: language === 'thai' ? 'กำลังลบ...' : 'Deleting...',
    };

    return (
        <div className="d-flex">
            {/* Export Button - Shows with Pro badge */}
            <Button
                variant="outline-secondary"
                className="me-2 d-flex align-items-center"
                onClick={handleExport}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                </svg>
                {text.export}
            </Button>

            {/* Three Dots Menu */}
            <Dropdown>
                <Dropdown.Toggle variant="light" id="dropdown-actions" className="border">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                    </svg>
                </Dropdown.Toggle>

                <Dropdown.Menu>
                    <Dropdown.Item onClick={openRenameModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
                        </svg>
                        {text.rename}
                    </Dropdown.Item>
                    <Dropdown.Item onClick={openMoveModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                        </svg>
                        {text.move}
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={openDeleteModal} className="text-danger">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                        </svg>
                        <span className="text-danger">{text.delete}</span>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>

            {/* Rename Modal */}
            <Modal show={showRenameModal} onHide={() => setShowRenameModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{text.renameQuiz}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <Form.Group>
                        <Form.Label>{text.quizName}</Form.Label>
                        <Form.Control
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder={quiz?.title}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRenameModal(false)}>
                        {text.cancel}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleRename}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="d-flex align-items-center">
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                {text.save}...
                            </span>
                        ) : text.save}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Move Modal */}
            <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{text.moveQuiz}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}

                    <Form.Group className="mb-3">
                        <Form.Label>{text.fileName}</Form.Label>
                        <Form.Control
                            type="text"
                            value={quiz?.title || ''}
                            disabled
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>{text.destinationFolder}</Form.Label>
                        <div className="position-relative">
                            <Form.Control
                                type="text"
                                value={folders.find(f => f.id === selectedFolder)?.name || ''}
                                onClick={() => setFolderDropdownOpen(!folderDropdownOpen)}
                                readOnly
                                style={{ cursor: 'pointer' }}
                            />
                            <div className="position-absolute top-50 end-0 translate-middle-y pe-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
                                </svg>
                            </div>
                        </div>

                        {/* Folder Dropdown */}
                        {folderDropdownOpen && (
                            <div className="border rounded mt-1 shadow-sm bg-white">
                                {folders.map(folder => (
                                    <div
                                        key={folder.id}
                                        className="p-2 d-flex align-items-center border-bottom"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            setSelectedFolder(folder.id);
                                            setFolderDropdownOpen(false);
                                        }}
                                    >
                                        <div
                                            className="me-2 rounded"
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: folder.color || '#F9E852',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z" />
                                            </svg>
                                        </div>
                                        <span>{folder.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button
                        variant="light"
                        className="px-4"
                        onClick={handleMove}
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                        </svg>
                        {text.moveFile}
                    </Button>
                    <Button
                        variant="light"
                        className="px-4"
                        onClick={handleMove}
                        disabled={loading}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
                        </svg>
                        {text.copyFile}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{text.deleteQuiz}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <p>{text.deleteConfirm}</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        {text.cancel}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="d-flex align-items-center">
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                {text.deleteInProgress}
                            </span>
                        ) : text.deleteAction}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default QuizActionMenu;