import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUserStats } from '../services/api';
import styles from '../styles/stats.module.css';

export default function Stats() {
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('citour_student') || '{}'));
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!user.id) {
            navigate('/login');
            return;
        }
        if (hasFetched.current) return;
        hasFetched.current = true;
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const res = await getUserStats(user.id);
            setStats(res.data || {});
        } catch (err) {
            console.error('Failed to load stats:', err);
        } finally {
            setLoading(false);
        }
    };

    // 计算学习进度百分比
    const learningProgress = stats?.wordsLearned && stats?.wordsMastered
        ? Math.min(100, Math.round((stats.wordsMastered / Math.max(stats.wordsLearned, 1)) * 100))
        : 0;

    if (loading) {
        return (
            <div className={`${styles.statsPage} ${styles.loading}`}>
                <div className={styles.loadingSpinner}>📊</div>
                <p>加载中...</p>
            </div>
        );
    }

    return (
        <div className={styles.statsPage}>
            <header className={styles.pageHeader}>
                <button className={styles.backBtn} onClick={() => navigate('/home')}>←</button>
                <h1>📊 学习统计</h1>
            </header>

            <motion.div
                className={styles.statsGrid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className={styles.statCard}>
                    <span className={styles.statIcon}>📝</span>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats?.sessionsCount || 0}</span>
                        <span className={styles.statLabel}>练习次数</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statIcon}>🔥</span>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats?.streakDays || 0}</span>
                        <span className={styles.statLabel}>连续打卡</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statIcon}>📖</span>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats?.wordsLearned || 0}</span>
                        <span className={styles.statLabel}>已学单词</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statIcon}>⭐</span>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats?.wordsMastered || 0}</span>
                        <span className={styles.statLabel}>已掌握</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statIcon}>❌</span>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats?.wrongWordsCount || 0}</span>
                        <span className={styles.statLabel}>错词数量</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <span className={styles.statIcon}>🎯</span>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats?.accuracy || 0}%</span>
                        <span className={styles.statLabel}>正确率</span>
                    </div>
                </div>

            </motion.div>

            {/* 进度环 */}
            <motion.div
                className={styles.progressSection}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
            >
                <div className={styles.progressRingContainer}>
                    <svg className={styles.progressRing} viewBox="0 0 120 120">
                        <circle className={styles.progressRingBg} cx="60" cy="60" r="52" />
                        <circle
                            className={styles.progressRingFill}
                            cx="60" cy="60" r="52"
                            style={{
                                strokeDashoffset: 327 - (327 * learningProgress / 100)
                            }}
                        />
                    </svg>
                    <div className={styles.progressRingText}>
                        <span className={styles.progressValue}>{learningProgress}%</span>
                        <span className={styles.progressLabel}>掌握率</span>
                    </div>
                </div>
            </motion.div>

            <div className={styles.encouragementCard}>
                <h3>💪 继续加油！</h3>
                <p>坚持每天学习，你会变得越来越厉害！</p>
            </div>
        </div>
    );
}
