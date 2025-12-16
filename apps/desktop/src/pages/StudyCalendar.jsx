import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCalendarStats } from '../services/api';
import styles from '../styles/calendar.module.css';

export default function StudyCalendar() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12

    useEffect(() => {
        loadStats();
    }, [year, month]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const userStr = localStorage.getItem('citour_student');
            if (!userStr) {
                navigate('/login');
                return;
            }
            const user = JSON.parse(userStr);
            const response = await getCalendarStats(user.id, year, month);
            console.log('Calendar stats response:', response);
            setStats(response.data);
        } catch (err) {
            console.error('Failed to load calendar stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 2, 1)); // month is 1-based, set to prev month
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month, 1)); // month is 1-based, set to next month
    };

    const generateCalendarGrid = () => {
        const daysInMonth = new Date(year, month, 0).getDate();
        const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 (Sun) - 6 (Sat)

        const grid = [];
        const dailyStats = stats?.daily || {};

        // Empty cells for days before start of month
        for (let i = 0; i < firstDayOfWeek; i++) {
            grid.push(<div key={`empty-start-${i}`} className={`${styles.dateCell} ${styles.otherMonth}`} />);
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            // Format date string YYYY-MM-DD
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const count = dailyStats[dateStr] || 0;
            const isToday = new Date().toDateString() === new Date(year, month - 1, day).toDateString();

            grid.push(
                <motion.div
                    key={day}
                    className={`${styles.dateCell} ${isToday ? styles.today : ''} ${count > 0 ? styles.checked : ''}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: day * 0.01 }}
                >
                    <span className={styles.dateNumber}>{day}</span>
                    {count > 0 && <span className={styles.checkMark}>✓</span>}
                    {count > 0 && <span className={styles.practiceCount}>{count}次</span>}
                </motion.div>
            );
        }

        // Remaining empty cells to fill last row (optional, simplified here)
        return grid;
    };

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    return (
        <div className={styles.calendarPage}>
            <div className={styles.calendarContainer}>
                <header className={styles.calendarHeader}>
                    <button className={styles.backBtn} onClick={() => navigate('/home')} title="返回首页">
                        ←
                    </button>
                    <div className={styles.calendarControls}>
                        <button className={styles.navBtn} onClick={handlePrevMonth}>&lt;</button>
                        <div className={styles.monthTitle}>{year}年 {month}月</div>
                        <button className={styles.navBtn} onClick={handleNextMonth}>&gt;</button>
                    </div>
                </header>

                <div className={styles.monthlyStats}>
                    <span className={styles.statIcon}>📊</span>
                    <span className={styles.statText}>本月累计打卡</span>
                    <span className={styles.statValue}>{stats?.total || 0}</span>
                    <span className={styles.statText}>次</span>
                </div>

                <div className={styles.weekHeader}>
                    {weekDays.map(d => <div key={d} className={styles.weekDay}>{d}</div>)}
                </div>

                <div className={styles.calendarBody}>
                    <div className={styles.calendarGrid}>
                        {generateCalendarGrid()}
                    </div>
                </div>
            </div>
        </div>
    );
}
