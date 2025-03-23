import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, ProgressBar } from 'react-bootstrap';
import { quizService } from '../services/api';

const QuizStatistics = ({ quizId }) => {
    const [stats, setStats] = useState({
        loading: true,
        error: null,
        data: null
    });

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                // In a real implementation, we would have a dedicated API endpoint
                // For now, let's simulate analytics based on quiz data
                const response = await quizService.getQuizById(quizId);

                if (response.success) {
                    const quiz = response.data;

                    // Calculate difficulty distribution
                    const difficultyDist = {
                        easy: 0,
                        medium: 0,
                        hard: 0
                    };

                    // Calculate the average explanation length
                    let totalExplanationLength = 0;
                    let maxExplanationLength = 0;
                    let minExplanationLength = Infinity;

                    // For multiple choice, calculate option distribution
                    const optionsDist = {
                        a: 0,
                        b: 0,
                        c: 0,
                        d: 0
                    };

                    // Simple algorithm to estimate question difficulty
                    quiz.questions.forEach(question => {
                        // Explanation length analysis
                        const expLength = question.explanation ? question.explanation.length : 0;
                        totalExplanationLength += expLength;
                        maxExplanationLength = Math.max(maxExplanationLength, expLength);
                        minExplanationLength = Math.min(minExplanationLength, expLength);

                        // For multiple choice, analyze correct answers
                        if (quiz.question_type === 'Multiple Choice' && question.options) {
                            // Find the correct option
                            const correctOptionIndex = question.options.findIndex(opt => opt.isCorrect);
                            if (correctOptionIndex >= 0) {
                                const optionKey = ['a', 'b', 'c', 'd'][correctOptionIndex];
                                optionsDist[optionKey]++;
                            }

                            // Estimate difficulty by question complexity
                            const questionLength = question.questionText.length;
                            const avgOptionLength = question.options.reduce((sum, opt) => sum + opt.text.length, 0) / question.options.length;

                            if (questionLength > 150 || avgOptionLength > 50) {
                                difficultyDist.hard++;
                            } else if (questionLength > 80 || avgOptionLength > 25) {
                                difficultyDist.medium++;
                            } else {
                                difficultyDist.easy++;
                            }
                        } else {
                            // Essay questions - estimate by complexity
                            const questionLength = question.questionText.length;
                            const explanationLength = question.explanation ? question.explanation.length : 0;

                            if (questionLength > 200 || explanationLength > 300) {
                                difficultyDist.hard++;
                            } else if (questionLength > 100 || explanationLength > 150) {
                                difficultyDist.medium++;
                            } else {
                                difficultyDist.easy++;
                            }
                        }
                    });

                    // Calculate averages
                    const avgExplanationLength = totalExplanationLength / quiz.questions.length;

                    // Set statistics data
                    setStats({
                        loading: false,
                        error: null,
                        data: {
                            totalQuestions: quiz.questions.length,
                            questionType: quiz.question_type,
                            difficultyDistribution: difficultyDist,
                            explanationStats: {
                                average: avgExplanationLength,
                                max: maxExplanationLength,
                                min: minExplanationLength === Infinity ? 0 : minExplanationLength
                            },
                            optionsDistribution: optionsDist,
                            createdAt: new Date(quiz.created_at),
                            topic: quiz.topic,
                            studentLevel: quiz.student_level || 'Not specified'
                        }
                    });
                } else {
                    setStats({
                        loading: false,
                        error: 'Failed to fetch quiz statistics',
                        data: null
                    });
                }
            } catch (error) {
                setStats({
                    loading: false,
                    error: error.message || 'An error occurred while fetching statistics',
                    data: null
                });
            }
        };

        if (quizId) {
            fetchStatistics();
        }
    }, [quizId]);

    // Calculate percentages for visualizations
    const difficultyPercentages = useMemo(() => {
        if (!stats.data) return null;

        const { difficultyDistribution, totalQuestions } = stats.data;
        return {
            easy: (difficultyDistribution.easy / totalQuestions) * 100,
            medium: (difficultyDistribution.medium / totalQuestions) * 100,
            hard: (difficultyDistribution.hard / totalQuestions) * 100
        };
    }, [stats.data]);

    // Calculate option percentages
    const optionPercentages = useMemo(() => {
        if (!stats.data || stats.data.questionType !== 'Multiple Choice') return null;

        const { optionsDistribution, totalQuestions } = stats.data;
        return {
            a: (optionsDistribution.a / totalQuestions) * 100,
            b: (optionsDistribution.b / totalQuestions) * 100,
            c: (optionsDistribution.c / totalQuestions) * 100,
            d: (optionsDistribution.d / totalQuestions) * 100
        };
    }, [stats.data]);

    if (stats.loading) {
        return (
            <Card className="mb-4 shadow-sm">
                <Card.Body className="text-center p-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2 mb-0">Loading quiz statistics...</p>
                </Card.Body>
            </Card>
        );
    }

    if (stats.error) {
        return (
            <Card className="mb-4 shadow-sm border-danger">
                <Card.Body className="p-4">
                    <p className="text-danger mb-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="me-2">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z" />
                        </svg>
                        {stats.error}
                    </p>
                </Card.Body>
            </Card>
        );
    }

    if (!stats.data) {
        return null;
    }

    const { data } = stats;
    const createdDate = data.createdAt.toLocaleDateString();

    return (
        <Card className="mb-4 shadow-sm">
            <Card.Header className="bg-light">
                <h5 className="mb-0">Quiz Analytics</h5>
            </Card.Header>
            <Card.Body className="p-4">
                <Row className="g-4">
                    {/* Basic Quiz Info */}
                    <Col md={6}>
                        <Card className="h-100 border-0 bg-light">
                            <Card.Body>
                                <h6 className="mb-3">Quiz Details</h6>
                                <ul className="list-unstyled mb-0">
                                    <li className="mb-2">
                                        <strong>Total Questions:</strong> {data.totalQuestions}
                                    </li>
                                    <li className="mb-2">
                                        <strong>Question Type:</strong> {data.questionType}
                                    </li>
                                    <li className="mb-2">
                                        <strong>Created Date:</strong> {createdDate}
                                    </li>
                                    <li className="mb-2">
                                        <strong>Topic:</strong> {data.topic}
                                    </li>
                                    <li>
                                        <strong>Student Level:</strong> {data.studentLevel}
                                    </li>
                                </ul>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Difficulty Distribution */}
                    <Col md={6}>
                        <Card className="h-100 border-0 bg-light">
                            <Card.Body>
                                <h6 className="mb-3">Estimated Difficulty Distribution</h6>
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between mb-1">
                                        <span>Easy</span>
                                        <span>{data.difficultyDistribution.easy} questions ({difficultyPercentages.easy.toFixed(1)}%)</span>
                                    </div>
                                    <ProgressBar
                                        now={difficultyPercentages.easy}
                                        variant="success"
                                        className="mb-2"
                                        style={{ height: '12px' }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <div className="d-flex justify-content-between mb-1">
                                        <span>Medium</span>
                                        <span>{data.difficultyDistribution.medium} questions ({difficultyPercentages.medium.toFixed(1)}%)</span>
                                    </div>
                                    <ProgressBar
                                        now={difficultyPercentages.medium}
                                        variant="warning"
                                        className="mb-2"
                                        style={{ height: '12px' }}
                                    />
                                </div>

                                <div>
                                    <div className="d-flex justify-content-between mb-1">
                                        <span>Hard</span>
                                        <span>{data.difficultyDistribution.hard} questions ({difficultyPercentages.hard.toFixed(1)}%)</span>
                                    </div>
                                    <ProgressBar
                                        now={difficultyPercentages.hard}
                                        variant="danger"
                                        style={{ height: '12px' }}
                                    />
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Explanation Analysis */}
                    <Col md={6}>
                        <Card className="h-100 border-0 bg-light">
                            <Card.Body>
                                <h6 className="mb-3">Explanation Analysis</h6>
                                <ul className="list-unstyled mb-0">
                                    <li className="mb-2">
                                        <strong>Average Length:</strong> {Math.round(data.explanationStats.average)} characters
                                    </li>
                                    <li className="mb-2">
                                        <strong>Longest Explanation:</strong> {data.explanationStats.max} characters
                                    </li>
                                    <li>
                                        <strong>Shortest Explanation:</strong> {data.explanationStats.min} characters
                                    </li>
                                </ul>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Option Distribution (for Multiple Choice) */}
                    {data.questionType === 'Multiple Choice' && (
                        <Col md={6}>
                            <Card className="h-100 border-0 bg-light">
                                <Card.Body>
                                    <h6 className="mb-3">Correct Answer Distribution</h6>
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>Option A</span>
                                            <span>{data.optionsDistribution.a} questions ({optionPercentages.a.toFixed(1)}%)</span>
                                        </div>
                                        <ProgressBar
                                            now={optionPercentages.a}
                                            variant="info"
                                            className="mb-2"
                                            style={{ height: '12px' }}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>Option B</span>
                                            <span>{data.optionsDistribution.b} questions ({optionPercentages.b.toFixed(1)}%)</span>
                                        </div>
                                        <ProgressBar
                                            now={optionPercentages.b}
                                            variant="info"
                                            className="mb-2"
                                            style={{ height: '12px' }}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>Option C</span>
                                            <span>{data.optionsDistribution.c} questions ({optionPercentages.c.toFixed(1)}%)</span>
                                        </div>
                                        <ProgressBar
                                            now={optionPercentages.c}
                                            variant="info"
                                            className="mb-2"
                                            style={{ height: '12px' }}
                                        />
                                    </div>

                                    <div>
                                        <div className="d-flex justify-content-between mb-1">
                                            <span>Option D</span>
                                            <span>{data.optionsDistribution.d} questions ({optionPercentages.d.toFixed(1)}%)</span>
                                        </div>
                                        <ProgressBar
                                            now={optionPercentages.d}
                                            variant="info"
                                            style={{ height: '12px' }}
                                        />
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    )}
                </Row>
            </Card.Body>
        </Card>
    );
};

export default QuizStatistics;