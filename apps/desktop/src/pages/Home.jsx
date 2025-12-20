import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCurrentLearningBook, getUserStats, generateLearningTask } from '../services/api';
import styles from '../styles/home.module.css';

export default function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [currentBook, setCurrentBook] = useState(null);
    const [lastCompleted, setLastCompleted] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const hasFetched = useRef(false);

    useEffect(() => {
        const userStr = localStorage.getItem('citour_student');
        if (!userStr) {
            navigate('/login');
            return;
        }

        const userData = JSON.parse(userStr);
        setUser(userData);

        if (!hasFetched.current) {
            hasFetched.current = true;
            loadData(userData);
        }
    }, [navigate]);

    const loadData = async (userData) => {
        try {
            setLoading(true);

            const [bookRes, statsRes] = await Promise.all([
                getCurrentLearningBook(userData.id),
                getUserStats(userData.id)
            ]);

            setCurrentBook(bookRes.data || null);
            setLastCompleted(bookRes.lastCompleted || null);
            setStats(statsRes.data || {});
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('citour_student');
        navigate('/login');
    };

    const handleContinueLearning = async () => {
        if (!currentBook) return;

        try {
            setActionLoading(true);
            const taskRes = await generateLearningTask(user.id, currentBook.id);

            if (taskRes.allCompleted) {
                await loadData(user);
                return;
            }

            const task = taskRes.data;
            if (task && task.id) {
                navigate(`/practice/${task.id}`, { state: { task } });
            }
        } catch (err) {
            console.error('Failed to continue learning:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const getProgress = () => {
        if (!currentBook || !currentBook.word_count) return { percent: 0, remaining: 0 };
        const completed = currentBook.completed_words || 0;
        const total = currentBook.word_count;
        const remaining = total - completed;
        const percent = Math.round((completed / total) * 100);
        return { percent, remaining, completed, total };
    };

    const progress = getProgress();

    if (loading) {
        return (
            <div className={`${styles.homePage} ${styles.loading}`}>
                <div className={styles.loadingSpinner}>📚</div>
                <p>加载中...</p>
            </div>
        );
    }

    return (
        <div className={styles.homePage}>
            <header className={styles.homeHeader}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>{user?.name?.[0] || '👋'}</div>
                    <div>
                        <h2>你好，{user?.name || '同学'}</h2>
                        <p>今天也要加油哦！</p>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={handleLogout}>退出</button>
            </header>

            <section className={styles.statsSection}>
                <div className={styles.statCard}>
                    <span className={styles.statIcon}>📖</span>
                    <span className={styles.statValue}>{stats?.wordsLearned || 0}</span>
                    <span className={styles.statLabel}>已学单词</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statIcon}>✅</span>
                    <span className={styles.statValue}>{stats?.tasksCompleted || 0}</span>
                    <span className={styles.statLabel}>完成任务</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statIcon}>🔥</span>
                    <span className={styles.statValue}>{stats?.streakDays || 0}</span>
                    <span className={styles.statLabel}>学习天数</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statIcon}>🎯</span>
                    <span className={styles.statValue}>{stats?.accuracy || 0}%</span>
                    <span className={styles.statLabel}>正确率</span>
                </div>
            </section>

            <section className={styles.currentBookSection}>
                <h3 className={styles.sectionTitle}>📚 当前学习</h3>

                {currentBook ? (
                    <div className={styles.currentBookCard}>
                        <div className={styles.bookHeader}>
                            <h4>{currentBook.name}</h4>
                            <span className={styles.learningBadge}>学习中</span>
                        </div>

                        <div className={styles.progressStatsGrid}>
                            <div className={styles.progressStat}>
                                <span className={styles.statNum}>{progress.total}</span>
                                <span className={styles.statDesc}>总计</span>
                            </div>
                            <div className={`${styles.progressStat} ${styles.completed}`}>
                                <span className={styles.statNum}>{progress.completed}</span>
                                <span className={styles.statDesc}>已完成</span>
                            </div>
                            <div className={`${styles.progressStat} ${styles.remaining}`}>
                                <span className={styles.statNum}>{progress.remaining}</span>
                                <span className={styles.statDesc}>剩余</span>
                            </div>
                        </div>

                        <div className={styles.progressBarContainer}>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
                            </div>
                            <span className={styles.progressPercent}>{progress.percent}%</span>
                        </div>

                        <button
                            className={`btn btn-success ${styles.btnLarge}`}
                            onClick={handleContinueLearning}
                            disabled={actionLoading}
                        >
                            {actionLoading ? '加载中...' : '继续学习 →'}
                        </button>
                    </div>
                ) : (
                    <div className={styles.emptyBook}>
                        <p>暂无正在学习的单词本</p>
                        <button className="btn btn-primary" onClick={() => navigate('/books')}>
                            去挑选单词本
                        </button>
                    </div>
                )
                }

                {/* 上次完成区域 - 独立显示 */}
                {
                    lastCompleted && (
                        <div className={styles.lastCompletedSection}>
                            <div className={styles.sectionDivider}>
                                <span>上次完成</span>
                            </div>
                            <div className={styles.lastCompletedCard}>
                                <div className={styles.lastCompletedHeader}>
                                    <div className={styles.lastCompletedTitle}>
                                        <span className={styles.bookIconTiny}>📖</span>
                                        <h4>{lastCompleted.name}</h4>
                                    </div>
                                    <span className={styles.completedBadge}>已完成</span>
                                </div>
                                <div className={styles.lastCompletedStats}>
                                    <div className={styles.lcStat}>
                                        <span className={styles.lcStatNum}>{lastCompleted.word_count || 0}</span>
                                        <span className={styles.lcStatLabel}>总计</span>
                                    </div>
                                    <div className={`${styles.lcStat} ${styles.completed}`}>
                                        <span className={styles.lcStatNum}>{lastCompleted.completed_words || lastCompleted.word_count || 0}</span>
                                        <span className={styles.lcStatLabel}>已完成</span>
                                    </div>
                                    <div className={`${styles.lcStat} ${styles.practice}`}>
                                        <span className={styles.lcStatNum}>{lastCompleted.practice_count || 0}</span>
                                        <span className={styles.lcStatLabel}>练习次数</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </section>

            <section className={styles.actionsSection}>
                <button className={styles.actionBtn} onClick={() => navigate('/books')}>
                    <span className={styles.actionIcon}>📚</span>
                    <span>单词本</span>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/calendar')}>
                    <span className={styles.actionIcon}>📅</span>
                    <span>学习日历</span>
                </button>
                <button className={styles.actionBtn} onClick={() => navigate('/wrong')}>
                    <span className={styles.actionIcon}>📝</span>
                    <span>错词本</span>
                </button>
            </section>
        </div >
    );
}
