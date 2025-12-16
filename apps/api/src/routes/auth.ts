import { Hono } from 'hono';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// Login
app.post('/login', async (c) => {
    const { account, password, role } = await c.req.json();

    const user = await c.env.DB.prepare(`
    SELECT id, tenant_id, name, account, role 
    FROM users 
    WHERE account = ? AND password = ?
  `).bind(account, password).first();

    if (!user) {
        return c.json({ error: '用户名或密码错误' }, 401);
    }

    // Check role if specified
    if (role && user.role !== role) {
        return c.json({ error: '无权限登录' }, 403);
    }

    return c.json({
        success: true,
        user: {
            id: user.id,
            tenantId: user.tenant_id,
            name: user.name,
            account: user.account,
            role: user.role
        }
    });
});

// Student login
app.post('/student/login', async (c) => {
    const { account, password, tenantId } = await c.req.json();

    const user = await c.env.DB.prepare(`
    SELECT id, tenant_id, name, account, role 
    FROM users 
    WHERE account = ? AND password = ? AND tenant_id = ? AND role = 'student'
  `).bind(account, password, tenantId).first();

    if (!user) {
        return c.json({ error: '用户名或密码错误' }, 401);
    }

    return c.json({
        success: true,
        user: {
            id: user.id,
            tenantId: user.tenant_id,
            name: user.name,
            account: user.account,
            role: user.role
        }
    });
});

export default app;
