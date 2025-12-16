import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getBooksWithProgress, startLearningBook, pauseLearningBook, completeLearningBook, generateLearningTask, getBookStats } from '../services/api';
import styles from '../styles/books.module.css';

export default function Books() {
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('citour_student') || '{}'));
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [statsModal, setStatsModal] = useState(null); // 学习情况弹窗
    const [statsLoading, setStatsLoading] = useState(false);
    const [descModal, setDescModal] = useState(null); // 描述弹窗
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getBooksWithProgress(user.id);
            setBooks(res.data || []);
        } catch (err) {
            console.error('Failed to load books:', err);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const showConfirm = (title, message, onConfirm, confirmText = '确定') => {
        setConfirmModal({ title, message, onConfirm, confirmText });
    };

    const getLearningBook = () => books.find(b => b.status === 'learning');

    // 开始学习
    const handleStartLearning = async (book) => {
        const learningBook = getLearningBook();
        if (learningBook && learningBook.id !== book.id) {
            showToast(`请先暂停「${learningBook.name}」才能开始学习其他单词本`, 'error');
            return;
        }

        try {
            setActionLoading(book.id);
            await startLearningBook(user.id, book.id);

            const taskRes = await generateLearningTask(user.id, book.id);

            if (taskRes.allCompleted) {
                showToast('🎉 该单词本所有单词都已学习完成！', 'success');
                await loadData();
                return;
            }

            const task = taskRes.data;
            if (task && task.id) {
                navigate(`/practice/${task.id}`, { state: { task } });
            } else {
                showToast('任务生成失败，请重试', 'error');
            }
        } catch (err) {
            console.error('Failed to start learning:', err);
            const errorMsg = err.response?.data?.error || '开始学习失败，请重试';
            showToast(errorMsg, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // 继续学习
    const handleContinueLearning = async (book) => {
        try {
            setActionLoading(book.id);
            const taskRes = await generateLearningTask(user.id, book.id);

            if (taskRes.allCompleted) {
                showToast('🎉 该单词本所有单词都已学习完成！', 'success');
                await loadData();
                return;
            }

            const task = taskRes.data;
            if (task && task.id) {
                navigate(`/practice/${task.id}`, { state: { task } });
            } else {
                showToast('任务生成失败，请重试', 'error');
            }
        } catch (err) {
            console.error('Failed to continue learning:', err);
            showToast('继续学习失败，请重试', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    // 暂停学习
    const handlePauseLearning = (book) => {
        showConfirm(
            '暂停学习',
            `确定要暂停学习「${book.name}」吗？`,
            async () => {
                try {
                    setActionLoading(`pause-${book.id}`);
                    await pauseLearningBook(user.id, book.id);
                    await loadData();
                    showToast(`已暂停「${book.name}」`, 'success');
                } catch (err) {
                    showToast('暂停失败', 'error');
                } finally {
                    setActionLoading(null);
                }
            }
        );
    };

    // 完成学习
    const handleCompleteLearning = (book) => {
        showConfirm(
            '完成学习',
            `确定要标记「${book.name}」为已完成吗？完成后仍可继续复习。`,
            async () => {
                try {
                    setActionLoading(`complete-${book.id}`);
                    await completeLearningBook(user.id, book.id);
                    await loadData();
                    showToast(`🎉 恭喜完成「${book.name}」！`, 'success');
                } catch (err) {
                    showToast('操作失败', 'error');
                } finally {
                    setActionLoading(null);
                }
            },
            '完成学习'
        );
    };

    // 查看学习情况
    const handleViewStats = async (book) => {
        try {
            setStatsLoading(true);
            const res = await getBookStats(user.id, book.id);
            setStatsModal({
                book,
                stats: res.data
            });
        } catch (err) {
            showToast('获取学习情况失败', 'error');
        } finally {
            setStatsLoading(false);
        }
    };

    const getProgressPercent = (book) => {
        if (!book.word_count || book.word_count === 0) return 0;
        return Math.round((book.completed_words || 0) / book.word_count * 100);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'learning':
                return <span className={`${styles.statusBadge} ${styles.learning}`}>学习中</span>;
            case 'completed':
                return <span className={`${styles.statusBadge} ${styles.completed}`}>已完成</span>;
            case 'not_started':
            default:
                return <span className={`${styles.statusBadge} ${styles.notStarted}`}>未开始</span>;
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0分钟';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}小时${minutes}分钟`;
        return `${minutes}分钟`;
    };

    if (loading) {
        return (
            <div className={`${styles.booksPage} ${styles.loading}`}>
                <div className={styles.loadingSpinner}>📚</div>
                <p>加载中...</p>
            </div>
        );
    }

    return (
        <div className={styles.booksPage}>
            {/* 确认弹窗 */}
            <AnimatePresence>
                {confirmModal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmModal(null)}
                    >
                        <motion.div
                            className={styles.confirmModal}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3>{confirmModal.title}</h3>
                            <p>{confirmModal.message}</p>
                            <div className={styles.modalActions}>
                                <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>取消</button>
                                <button className="btn btn-primary" onClick={() => { setConfirmModal(null); confirmModal.onConfirm(); }}>
                                    {confirmModal.confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 学习情况弹窗 */}
            <AnimatePresence>
                {statsModal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setStatsModal(null)}
                    >
                        <motion.div
                            className={styles.statsModal}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3>📊 {statsModal.book.name}</h3>
                            <div className={styles.statsGrid}>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{statsModal.stats.totalWords}</span>
                                    <span className={styles.statLabel}>总单词</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{statsModal.stats.learnedWords}</span>
                                    <span className={styles.statLabel}>已学习</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{statsModal.stats.completedTasks}</span>
                                    <span className={styles.statLabel}>完成任务</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{statsModal.stats.accuracy}%</span>
                                    <span className={styles.statLabel}>正确率</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{formatDuration(statsModal.stats.totalDuration)}</span>
                                    <span className={styles.statLabel}>学习时长</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{statsModal.stats.wrongWordsCount}</span>
                                    <span className={styles.statLabel}>错词数</span>
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={() => setStatsModal(null)}>关闭</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 描述弹窗 */}
            <AnimatePresence>
                {descModal && (
                    <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDescModal(null)}>
                        <motion.div className={styles.descModal} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
                            <h3>📖 {descModal.name}</h3>
                            <div className={styles.descContent}>
                                {descModal.description || '暂无描述'}
                            </div>
                            <button className="btn btn-primary" onClick={() => setDescModal(null)}>关闭</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div className={`${styles.toast} ${toast.type === 'error' ? styles.error : ''}`} initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}>
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <header className={styles.pageHeader}>
                <button className={styles.backBtn} onClick={() => navigate('/home')}>←</button>
                <h1>📚 单词本</h1>
            </header>

            <div className={styles.booksGrid}>
                {books.map((book, index) => {
                    const total = book.word_count || 0;
                    const completed = book.completed_words || 0;
                    const remaining = total - completed;
                    const practiceCount = book.practice_count || 0;
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const isAllCompleted = completed >= total && total > 0;

                    return (
                        <motion.div
                            key={book.id}
                            className={`${styles.bookCardCompact} ${styles[book.status]}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <div className={styles.bookHeaderRow}>
                                <div className={styles.bookIconSmall}>📖</div>
                                <div className={styles.bookTitleArea}>
                                    <h3>{book.name}</h3>
                                    {getStatusBadge(book.status)}
                                </div>
                                <button className={styles.infoBtn} onClick={() => setDescModal(book)} title="查看描述">
                                    ℹ️
                                </button>
                            </div>

                            <div className={styles.bookStatsRow}>
                                <div className={styles.statPill}>
                                    <span className={styles.statNum}>{total}</span>
                                    <span className={styles.statLabel}>总数</span>
                                </div>
                                <div className={`${styles.statPill} ${styles.completed}`}>
                                    <span className={styles.statNum}>{completed}</span>
                                    <span className={styles.statLabel}>已完成</span>
                                </div>
                                <div className={`${styles.statPill} ${styles.remaining}`}>
                                    <span className={styles.statNum}>{remaining}</span>
                                    <span className={styles.statLabel}>剩余</span>
                                </div>
                                <div className={`${styles.statPill} ${styles.practice}`}>
                                    <span className={styles.statNum}>{practiceCount}</span>
                                    <span className={styles.statLabel}>已练习</span>
                                </div>
                                <div className={styles.progressRingMini}>
                                    <svg viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15" fill="none" stroke="url(#gradient)" strokeWidth="3"
                                            strokeDasharray={`${percent * 0.94} 100`}
                                            strokeLinecap="round"
                                            transform="rotate(-90 18 18)" />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="100%" stopColor="#10b981" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <span className={styles.ringText}>{percent}%</span>
                                </div>
                            </div>

                            <div className={styles.bookActionsRow}>
                                {book.status === 'learning' ? (
                                    <>
                                        <button className={`btn ${styles.btnSuccess} ${styles.btnSm}`} onClick={() => handleContinueLearning(book)} disabled={actionLoading === book.id}>
                                            {actionLoading === book.id ? '...' : '继续学习'}
                                        </button>
                                        <button
                                            className={`btn ${styles.btnSm} ${isAllCompleted ? styles.btnPrimaryOutline : styles.btnDisabled}`}
                                            onClick={() => isAllCompleted && handleCompleteLearning(book)}
                                            disabled={!isAllCompleted}
                                        >
                                            完成学习
                                        </button>
                                    </>
                                ) : book.status === 'completed' ? (
                                    <button className={`btn ${styles.btnSuccess} ${styles.btnSm}`} onClick={() => handleContinueLearning(book)} disabled={actionLoading === book.id}>
                                        {actionLoading === book.id ? '...' : '继续复习'}
                                    </button>
                                ) : (
                                    <button className={`btn btn-primary ${styles.btnSm}`} onClick={() => handleStartLearning(book)} disabled={actionLoading === book.id || (getLearningBook() && getLearningBook().id !== book.id)}>
                                        {actionLoading === book.id ? '...' : getLearningBook() ? '请先完成学习中的任务' : '开始学习'}
                                    </button>
                                )}
                                <button className={`btn ${styles.btnLink} ${styles.btnSm}`} onClick={() => handleViewStats(book)}>
                                    学习详情
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {books.length === 0 && (
                <div className={styles.emptyState}>
                    <p>暂无可用的单词本</p>
                </div>
            )}
        </div>
    );
}
