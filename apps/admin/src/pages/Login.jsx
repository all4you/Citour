import React from 'react';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

export default function Login() {
    const navigate = useNavigate();

    const handleFinish = async (values) => {
        try {
            const data = await login(values.account, values.password);
            // 检查是否是管理员角色
            if (data.user.role !== 'admin') {
                message.error('无权限访问管理后台');
                return;
            }
            localStorage.setItem('citour_user', JSON.stringify(data.user));
            message.success('登录成功');
            navigate('/tenant/dashboard');
        } catch (error) {
            message.error(error.response?.data?.error || '登录失败');
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
            <LoginForm
                title="Citour Admin"
                subTitle="租户管理后台"
                onFinish={handleFinish}
            >
                <ProFormText
                    name="account"
                    fieldProps={{
                        size: 'large',
                        prefix: <UserOutlined />,
                    }}
                    placeholder="账号"
                    rules={[{ required: true, message: '请输入账号' }]}
                />
                <ProFormText.Password
                    name="password"
                    fieldProps={{
                        size: 'large',
                        prefix: <LockOutlined />,
                    }}
                    placeholder="密码"
                    rules={[{ required: true, message: '请输入密码' }]}
                />
            </LoginForm>
        </div>
    );
}
