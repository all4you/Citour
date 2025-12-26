import React, { useState } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TeamOutlined, LogoutOutlined } from '@ant-design/icons';
import { Dropdown, Avatar, Space } from 'antd';

export default function SysLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [pathname, setPathname] = useState(location.pathname);

    // Get current system admin user
    const user = JSON.parse(localStorage.getItem('citour_sys_admin') || '{}');
    const userName = user.name || '系统管理员';
    const avatarChar = userName.charAt(0).toUpperCase();

    const handleLogout = () => {
        localStorage.removeItem('citour_sys_admin');
        navigate('/sys/login');
    };

    return (
        <ProLayout
            title="Citour 系统管理后台"
            logo={null}
            layout="mix"
            navTheme="light"
            fixSiderbar
            splitMenus={false}
            location={{
                pathname: location.pathname,
            }}
            menuItemRender={(item, dom) => (
                <a onClick={() => {
                    setPathname(item.path || '/');
                    navigate(item.path || '/');
                }}>
                    {dom}
                </a>
            )}
            route={{
                routes: [
                    {
                        path: '/sys/tenants',
                        name: '租户管理',
                        icon: <TeamOutlined />,
                    },
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

