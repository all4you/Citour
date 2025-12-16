import React from 'react';
import { Layout, Menu } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TeamOutlined, LogoutOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

export default function SysLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('citour_sys_admin');
        navigate('/sys/login');
    };

    const menuItems = [
        {
            key: '/sys/tenants',
            icon: <TeamOutlined />,
            label: '租户管理',
            onClick: () => navigate('/sys/tenants')
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: handleLogout,
            danger: true
        }
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{
                display: 'flex',
                alignItems: 'center',
                background: '#001529',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold'
            }}>
                Citour 系统管理后台
            </Header>
            <Layout>
                <Sider width={200} style={{ background: '#fff' }}>
                    <Menu
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        style={{ height: '100%', borderRight: 0 }}
                        items={menuItems}
                    />
                </Sider>
                <Layout style={{ padding: '24px' }}>
                    <Content
                        style={{
                            padding: 24,
                            margin: 0,
                            minHeight: 280,
                            background: '#fff',
                        }}
                    >
                        <Outlet />
                    </Content>
                </Layout>
            </Layout>
        </Layout>
    );
}
