import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { sysLogin } from '../../services/api';

export default function SysLogin() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (values) => {
        setLoading(true);
        try {
            const res = await sysLogin(values.account, values.password);

            // 保存系统管理员信息到 localStorage
            localStorage.setItem('citour_sys_admin', JSON.stringify({
                ...res.user,
                account: values.account
            }));

            message.success('登录成功');
            navigate('/sys/tenants');
        } catch (error) {
            message.error(error.response?.data?.error || '登录失败');
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
                title="系统管理员登录"
                style={{ width: 400 }}
                headStyle={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
            >
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
