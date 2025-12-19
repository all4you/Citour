import React, { useState } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TeamOutlined, LogoutOutlined } from '@ant-design/icons';
import { Popover } from 'antd';

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

    const logoutContent = (
        <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}
            onClick={handleLogout}
        >
            <LogoutOutlined /> 退出登录
        </div>
    );

    return (
        <ProLayout
            title="Citour 系统后台"
            logo={null}
            layout="side"
            navTheme="light"
            fixSiderbar
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
            menuFooterRender={(props) => {
                if (props?.collapsed) {
                    return (
                        <div style={{ textAlign: 'center', padding: '16px 0', cursor: 'pointer' }}>
                            <Popover content={logoutContent} trigger="hover" placement="rightBottom">
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#f56a00',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    margin: '0 auto'
                                }}>
                                    {avatarChar}
                                </div>
                            </Popover>
                        </div>
                    );
                }
                return (
                    <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
                        <Popover content={logoutContent} trigger="hover" placement="rightBottom">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#f56a00',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px'
                                }}>
                                    {avatarChar}
                                </div>
                                <span style={{ fontSize: '14px', color: '#333', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {userName}
                                </span>
                            </div>
                        </Popover>
                    </div>
                );
            }}
        >
            <Outlet />
        </ProLayout>
    );
}
