import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { getWrongWords } from '../services/api';
import styles from '../styles/wrong.module.css';

export default function Wrong() {
    const navigate = useNavigate();
    const [user] = useState(() => JSON.parse(localStorage.getItem('citour_student') || '{}'));
    const [words, setWords] = useState([]);
    const [stats, setStats] = useState({ total: 0, thisWeek: 0, reviewed: 0, unreviewed: 0 });
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('all'); // all, week, today
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!user.id) {
            navigate('/login');
            return;
        }
        if (hasFetched.current) return;
        hasFetched.current = true;
        loadWrongWords();
    }, []);

    useEffect(() => {
        if (user.id && hasFetched.current) {
            console.log('Time filter changed to:', timeFilter);
            loadWrongWords();
        }
    }, [timeFilter]);

    const loadWrongWords = async () => {
        try {
            console.log('Loading wrong words with filter:', timeFilter);
            setLoading(true);
            const res = await getWrongWords(user.id, { page: 1, pageSize: 50, time_filter: timeFilter });
            console.log('Wrong words response:', res);
            setWords(res.data || []);
            setStats(res.stats || { total: 0, thisWeek: 0, reviewed: 0, unreviewed: 0 });
        } catch (err) {
            console.error('Failed to load wrong words:', err);
        } finally {
            setLoading(false);
        }
    };

    // 播放发音 (使用有道词典 API)
    const playAudio = (word) => {
        if (!word) return;
        console.log('Playing audio for:', word);

        // 使用有道词典音频 API
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
        const audio = new Audio(audioUrl);
        audio.volume = 1;

        audio.play().catch((err) => {
            console.warn('有道词典播放失败，尝试 Web Speech API:', err);
            // 备用方案：使用 Web Speech API
            try {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                speechSynthesis.speak(utterance);
            } catch (e) {
                console.error('播放失败:', e);
            }
        });
    };

    // 格式化日期
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}-${day}`;
    };

    // 计算掌握率
    const masteryRate = stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0;

    if (loading) {
        return (
            <div className={`${styles.wrongPage} ${styles.loading}`}>
                <div className={styles.loadingSpinner}>📝</div>
                <p>加载中...</p>
            </div>
        );
    }

    return (
        <div className={styles.wrongPage}>
            <header className={styles.pageHeader}>
                <button className={styles.backBtn} onClick={() => navigate('/home')}>←</button>
                <h1>📝 错词本</h1>
            </header>

            {/* 统计卡片 */}
            <div className={styles.statsOverview}>
                <div className={styles.statCard}>
                    <div className={styles.statValue}>{stats.total}</div>
                    <div className={styles.statLabel}>总错词</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statValue} ${styles.highlight}`}>{stats.thisWeek}</div>
                    <div className={styles.statLabel}>本周新增</div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statValue} ${styles.success}`}>{masteryRate}%</div>
                    <div className={styles.statLabel}>掌握率</div>
                </div>
            </div>

            {/* 时间筛选 */}
            <div className={styles.timeFilters}>
                <button
                    className={timeFilter === 'all' ? styles.active : ''}
                    onClick={() => setTimeFilter('all')}
                >
                    全部
                </button>
                <button
                    className={timeFilter === 'week' ? styles.active : ''}
                    onClick={() => setTimeFilter('week')}
                >
                    本周
                </button>
                <button
                    className={timeFilter === 'today' ? styles.active : ''}
                    onClick={() => setTimeFilter('today')}
                >
                    今天
                </button>
            </div>

            {words.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>🎉</span>
                    <h3>太棒了！</h3>
                    <p>{timeFilter === 'all' ? '你还没有错过的单词' : '这个时间段没有错词'}</p>
                </div>
            ) : (
                <div className={styles.wrongList}>
                    {words.map((item, index) => (
                        <div
                            key={`${item.word_id}-${index}`}
                            className={styles.wrongCard}
                        >
                            <div className={styles.wordHeader}>
                                <div className={styles.wordSpelling}>{item.spelling}</div>
                                <button
                                    className={styles.audioBtn}
                                    onClick={() => playAudio(item.spelling)}
                                    title="播放发音"
                                >
                                    🔊
                                </button>
                                <div className={styles.wrongCountBadge}>
                                    错 {item.wrong_count} 次
                                </div>
                            </div>

                            <div className={styles.wordMeaning}>{item.meaning}</div>

                            <div className={styles.wordMeta}>
                                {item.book_name && (
                                    <span className={styles.bookName}>📚 {item.book_name}</span>
                                )}
                                {item.first_error_at && (
                                    <span className={styles.errorDate}>
                                        首次: {formatDate(item.first_error_at)}
                                    </span>
                                )}
                            </div>

                            {item.wrong_spelling && (
                                <div className={styles.wrongSpellings}>
                                    错误拼写: <span className={styles.spellingError}>{item.wrong_spelling}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
