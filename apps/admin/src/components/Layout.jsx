import React, { useEffect } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogoutOutlined, DashboardOutlined, BookOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('citour_user') || '{}');

    useEffect(() => {
        if (!user.id) {
            navigate('/tenant/login');
        }
    }, [user.id, navigate]);

    if (!user.id) return null;

    return (
        <ProLayout
            title="Citour Admin"
            logo={null}
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
            avatarProps={{
                src: user.avatar || 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
                title: user.name,
                render: (props, dom) => {
                    return (
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'logout',
                                        icon: <LogoutOutlined />,
                                        label: '退出登录',
                                        onClick: () => {
                                            localStorage.removeItem('citour_user');
                                            navigate('/tenant/login');
                                        },
                                    },
                                ],
                            }}
                        >
                            {dom}
                        </Dropdown>
                    );
                },
            }}
        >
            <Outlet />
        </ProLayout>
    );
}
