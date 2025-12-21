import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { studentLogin } from '../services/api';
import styles from '../styles/login.module.css';

export default function Login() {
    const navigate = useNavigate();
    const [tenantId, setTenantId] = useState('');
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!tenantId || !account || !password) {
            setError('请填写所有字段');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await studentLogin(parseInt(tenantId), account, password);
            if (res.success) {
                localStorage.setItem('citour_student', JSON.stringify(res.user));
                navigate('/home');
            } else {
                setError(res.error || '登录失败');
            }
        } catch (err) {
            setError(err.response?.data?.error || '登录失败，请检查网络');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginContainer}>
                <div className={styles.loginHeader}>
                    <h1 className={styles.loginTitle}>词途</h1>
                    <p className={styles.loginSubtitle}>见证每一词的成长</p>
                </div>

                <form onSubmit={handleLogin} className={styles.loginForm}>
                    {error && (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label>学校编号</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="请输入学校编号"
                            value={tenantId}
                            onChange={(e) => setTenantId(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>学生账号</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="请输入学生账号"
                            value={account}
                            onChange={(e) => setAccount(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>学生密码</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="请输入学生密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn btn-primary btn-large ${styles.loginBtn}`}
                        disabled={loading}
                    >
                        {loading ? '登录中...' : '开始学习 🚀'}
                    </button>
                </form>
            </div>
        </div>
    );
}
