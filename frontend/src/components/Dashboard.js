import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { quizService } from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalQuizzes: 0,
        multipleChoiceCount: 0,
        essayCount: 0,
        totalQuestions: 0,
        recentActivity: [],
        loading: true,
        error: null
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch all quizzes for stats
                const response = await quizService.getAllQuizzes();

                if (response.success) {
                    const quizzes = response.data;

                    // Calculate stats
                    const multipleChoiceCount = quizzes.filter(q => q.question_type === 'Multiple Choice').length;
                    const essayCount = quizzes.filter(q => q.question_type === 'Essay').length;

                    // Get question count
                    let totalQuestions = 0;
                    let questionsPerQuiz = [];

                    // For detailed stats, we need to fetch each quiz
                    const detailedPromises = quizzes.slice(0, 10).map(quiz => quizService.getQuizById(quiz.id));
                    const detailedResults = await Promise.allSettled(detailedPromises);

                    const successfulResults = detailedResults
                        .filter(result => result.status === 'fulfilled' && result.value.success)
                        .map(result => result.value.data);

                    totalQuestions = successfulResults.reduce(
                        (total, quiz) => total + (quiz.questions ? quiz.questions.length : 0),
                        0
                    );

                    questionsPerQuiz = successfulResults.map(quiz => ({
                        id: quiz.id,
                        title: quiz.title,
                        count: quiz.questions ? quiz.questions.length : 0
                    }));

                    // Get recent activity (for now, just sort by date)
                    const recentActivity = [...quizzes]
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 5);

                    setStats({
                        totalQuizzes: quizzes.length,
                        multipleChoiceCount,
                        essayCount,
                        totalQuestions,
                        questionsPerQuiz,
                        recentActivity,
                        loading: false,
                        error: null
                    });
                } else {
                    throw new Error(response.message || 'Failed to fetch stats');
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                setStats(prev => ({
                    ...prev,
                    loading: false,
                    error: error.message || 'An error occurred while fetching statistics'
                }));
            }
        };

        fetchStats();
    }, []);

    // Format date
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Get time ago string
    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);

        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) {
            return interval === 1 ? '1 year ago' : `${interval} years ago`;
        }

        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) {
            return interval === 1 ? '1 month ago' : `${interval} months ago`;
        }

        interval = Math.floor(seconds / 86400);
        if (interval >= 1) {
            return interval === 1 ? '1 day ago' : `${interval} days ago`;
        }

        interval = Math.floor(seconds / 3600);
        if (interval >= 1) {
            return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
        }

        interval = Math.floor(seconds / 60);
        if (interval >= 1) {
            return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
        }

        return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
    };

    if (stats.loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading dashboard statistics...</p>
            </div>
        );
    }

    if (stats.error) {
        return (
            <div className="alert alert-danger">
                <p className="mb-0">Error loading dashboard: {stats.error}</p>
            </div>
        );
    }

    return (
        <div>
            {/* Stats Cards */}
            <Row className="g-4 mb-4">
                <Col sm={6} md={3}>
                    <Card className="h-100 border-0 shadow-sm hover-card">
                        <Card.Body className="text-center">
                            <div className="display-4 fw-bold text-primary mb-2">{stats.totalQuizzes}</div>
                            <p className="mb-0 text-muted">Total Quizzes</p>
                        </Card.Body>
                    </Card>
                </Col>

                <Col sm={6} md={3}>
                    <Card className="h-100 border-0 shadow-sm hover-card">
                        <Card.Body className="text-center">
                            <div className="display-4 fw-bold text-success mb-2">{stats.totalQuestions}</div>
                            <p className="mb-0 text-muted">Total Questions</p>
                        </Card.Body>
                    </Card>
                </Col>

                <Col sm={6} md={3}>
                    <Card className="h-100 border-0 shadow-sm hover-card">
                        <Card.Body className="text-center">
                            <div className="display-4 fw-bold text-info mb-2">{stats.multipleChoiceCount}</div>
                            <p className="mb-0 text-muted">Multiple Choice</p>
                        </Card.Body>
                    </Card>
                </Col>

                <Col sm={6} md={3}>
                    <Card className="h-100 border-0 shadow-sm hover-card">
                        <Card.Body className="text-center">
                            <div className="display-4 fw-bold text-warning mb-2">{stats.essayCount}</div>
                            <p className="mb-0 text-muted">Essay Quizzes</p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Main Content Row */}
            <Row className="g-4">
                {/* Recent Activity */}
                <Col lg={7}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-bottom">
                            <h5 className="mb-0">Recent Activity</h5>
                        </Card.Header>
                        <Card.Body>
                            {stats.recentActivity.length > 0 ? (
                                <div className="activity-timeline">
                                    {stats.recentActivity.map((item, index) => (
                                        <div key={item.id} className={`activity-item ${index < stats.recentActivity.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}`}>
                                            <div className="d-flex align-items-start">
                                                <div className="activity-icon me-3">
                                                    <div className="rounded-circle bg-light p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z" />
                                                            <path d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.235.235 0 0 1 .02-.022z" />
                                                        </svg>
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">
                                                        <Link to={`/view/${item.id}`} className="text-decoration-none">
                                                            {item.title}
                                                        </Link>
                                                    </h6>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-muted">
                                                            Created {getTimeAgo(item.created_at)}
                                                        </small>
                                                        <Badge bg={item.question_type === 'Multiple Choice' ? 'info' : 'warning'} className="text-white">
                                                            {item.question_type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-muted mb-3">You haven't created any quizzes yet</p>
                                    <Link to="/create">
                                        <Button variant="primary">Create Your First Quiz</Button>
                                    </Link>
                                </div>
                            )}
                        </Card.Body>
                        {stats.recentActivity.length > 0 && (
                            <Card.Footer className="bg-white border-top text-center">
                                <Link to="/library" className="text-decoration-none">
                                    View All Quizzes
                                </Link>
                            </Card.Footer>
                        )}
                    </Card>
                </Col>

                {/* Quick Actions */}
                <Col lg={5}>
                    <Row className="g-4">
                        <Col xs={12}>
                            <Card className="border-0 shadow-sm">
                                <Card.Body>
                                    <h5 className="mb-3">Quick Actions</h5>
                                    <div className="d-grid gap-2">
                                        <Link to="/create" className="btn btn-success">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                                            </svg>
                                            Create New Quiz
                                        </Link>
                                        <Link to="/library" className="btn btn-outline-primary">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                                                <path d="M.54 3.87.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.826a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31zM2.19 4a1 1 0 0 0-.996 1.09l.637 7a1 1 0 0 0 .995.91h10.348a1 1 0 0 0 .995-.91l.637-7A1 1 0 0 0 13.81 4H2.19zm4.69-1.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707z" />
                                            </svg>
                                            My Library
                                        </Link>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>

                        {stats.totalQuizzes > 0 && (
                            <Col xs={12}>
                                <Card className="border-0 shadow-sm">
                                    <Card.Header className="bg-white">
                                        <h5 className="mb-0">Quiz Insights</h5>
                                    </Card.Header>
                                    <Card.Body>
                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span>Multiple Choice</span>
                                                <span>{stats.multipleChoiceCount} quizzes ({
                                                    stats.totalQuizzes
                                                        ? Math.round((stats.multipleChoiceCount / stats.totalQuizzes) * 100)
                                                        : 0
                                                }%)</span>
                                            </div>
                                            <div className="progress" style={{ height: '10px' }}>
                                                <div
                                                    className="progress-bar bg-info"
                                                    role="progressbar"
                                                    style={{ width: `${stats.totalQuizzes ? (stats.multipleChoiceCount / stats.totalQuizzes) * 100 : 0}%` }}
                                                    aria-valuenow={stats.multipleChoiceCount}
                                                    aria-valuemin="0"
                                                    aria-valuemax={stats.totalQuizzes}
                                                ></div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="d-flex justify-content-between mb-1">
                                                <span>Essay Questions</span>
                                                <span>{stats.essayCount} quizzes ({
                                                    stats.totalQuizzes
                                                        ? Math.round((stats.essayCount / stats.totalQuizzes) * 100)
                                                        : 0
                                                }%)</span>
                                            </div>
                                            <div className="progress" style={{ height: '10px' }}>
                                                <div
                                                    className="progress-bar bg-warning"
                                                    role="progressbar"
                                                    style={{ width: `${stats.totalQuizzes ? (stats.essayCount / stats.totalQuizzes) * 100 : 0}%` }}
                                                    aria-valuenow={stats.essayCount}
                                                    aria-valuemin="0"
                                                    aria-valuemax={stats.totalQuizzes}
                                                ></div>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}
                    </Row>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;