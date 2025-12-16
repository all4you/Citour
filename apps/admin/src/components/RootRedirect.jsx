import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function RootRedirect() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // 检查是否有登录的用户
        const user = localStorage.getItem('citour_user');
        const sysAdmin = localStorage.getItem('citour_sys_admin');

        // 获取来源路径,判断用户意图
        const fromPath = location.state?.from || document.referrer;
        const isFromSysPath = fromPath && fromPath.includes('/sys');

        // 智能判断:如果来自 /sys 路径,优先使用系统管理员身份
        if (isFromSysPath && sysAdmin) {
            navigate('/sys/tenants', { replace: true });
        } else if (user) {
            // 优先使用租户用户身份
            navigate('/tenant/dashboard', { replace: true });
        } else if (sysAdmin) {
            // 如果没有租户用户,但有系统管理员
            navigate('/sys/tenants', { replace: true });
        } else {
            // 未登录,跳转到租户登录页
            navigate('/tenant/login', { replace: true });
        }
    }, [navigate, location]);

    return null;
}
