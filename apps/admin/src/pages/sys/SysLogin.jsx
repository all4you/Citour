import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { sysLogin } from '../../services/api';

export default function SysLogin() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (values) => {
        setLoading(true);
        setError('');
        try {
            const res = await sysLogin(values.account, values.password);

            // 保存系统管理员信息到 localStorage
            localStorage.setItem('citour_sys_admin', JSON.stringify({
                ...res.user,
                account: values.account
            }));

            navigate('/sys/tenants');
        } catch (err) {
            const errorMessage = err.response?.data?.error
                || err.response?.data?.message
                || err.message
                || '登录失败，请检查账号密码';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <Card
                title="Citour 系统管理后台"
                style={{ width: 400 }}
                headStyle={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
            >
                <div style={{ textAlign: 'center', marginBottom: 24, color: '#666' }}>
                    登录系统管理后台
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                <Form
                    name="sys_login"
                    onFinish={handleLogin}
                    autoComplete="off"
                    size="large"
                >
                    <Form.Item
                        name="account"
                        rules={[{ required: true, message: '请输入账号' }]}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="账号"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                        >
                            登录
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
