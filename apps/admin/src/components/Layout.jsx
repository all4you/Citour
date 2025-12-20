import React, { useEffect } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogoutOutlined, DashboardOutlined, BookOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { Dropdown, Avatar, Space } from 'antd';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('citour_user') || '{}');
    const userName = user.name || '管理员';
    const avatarChar = userName.charAt(0).toUpperCase();

    useEffect(() => {
        if (!user.id) {
            navigate('/tenant/login');
        }
    }, [user.id, navigate]);

    if (!user.id) return null;

    const handleLogout = () => {
        localStorage.removeItem('citour_user');
        navigate('/tenant/login');
    };

    return (
        <ProLayout
            title="Citour 管理后台"
            logo={null}
            layout="mix"
            navTheme="light"
            fixSiderbar
            splitMenus={false}
            location={location}
            menuItemRender={(item, dom) => (
                <a onClick={() => navigate(item.path)}>{dom}</a>
            )}
            route={{
                routes: [
                    { path: '/tenant/dashboard', name: '仪表盘', icon: <DashboardOutlined /> },
                    { path: '/tenant/wordbooks', name: '词书管理', icon: <BookOutlined /> },
                    { path: '/tenant/students', name: '学生管理', icon: <UserOutlined /> },
                    { path: '/tenant/practice-records', name: '打卡记录', icon: <FileTextOutlined /> },
                ],
            }}
            avatarProps={false}
            actionsRender={false}
            rightContentRender={() => (
                <Dropdown
                    menu={{
                        items: [
                            {
                                key: 'logout',
                                icon: <LogoutOutlined />,
                                label: '退出登录',
                                onClick: handleLogout,
                            },
                        ],
                    }}
                >
                    <Space style={{ cursor: 'pointer', padding: '0 16px' }}>
                        <Avatar style={{ backgroundColor: '#f56a00' }}>{avatarChar}</Avatar>
                        <span>{userName}</span>
                    </Space>
                </Dropdown>
            )}
        >
            <Outlet />
        </ProLayout>
    );
}

