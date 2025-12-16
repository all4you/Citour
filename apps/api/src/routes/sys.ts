import { Hono } from 'hono';
import { getNowUTC8 } from '../utils/time';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// System admin login
app.post('/login', async (c) => {
    const { account, password } = await c.req.json();

    const user = await c.env.DB.prepare(`
    SELECT id, tenant_id, name, account, role 
    FROM users 
    WHERE account = ? AND password = ? AND role = 'sys_admin'
  `).bind(account, password).first();

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

// Get all tenants
app.get('/tenants', async (c) => {
    const { page = '1', pageSize = '20' } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const tenants = await c.env.DB.prepare(`
    SELECT id, name, status, created_at
    FROM tenants
    WHERE id > 0
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).bind(parseInt(pageSize), offset).all();

    const countResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM tenants WHERE id > 0
  `).first();

    return c.json({
        success: true,
        data: tenants.results,
        total: countResult?.total || 0
    });
});

// Create tenant with admin
app.post('/tenants', async (c) => {
    const { name, adminName, adminAccount, adminPassword } = await c.req.json();

    if (!name || !adminAccount || !adminPassword) {
        return c.json({ error: '缺少必填字段' }, 400);
    }

    try {
        // Create tenant
        const tenantResult = await c.env.DB.prepare(`
      INSERT INTO tenants (name, status) VALUES (?, 'active')
    `).bind(name).run();

        const tenantId = tenantResult.meta.last_row_id;

        // Create tenant admin
        await c.env.DB.prepare(`
      INSERT INTO users (tenant_id, name, account, password, role)
      VALUES (?, ?, ?, ?, 'admin')
    `).bind(tenantId, adminName || '管理员', adminAccount, adminPassword).run();

        return c.json({ success: true, tenantId });
    } catch (err: any) {
        return c.json({ error: err.message }, 500);
    }
});

// Update tenant
app.put('/tenants/:id', async (c) => {
    const { id } = c.req.param();
    const { name, status } = await c.req.json();

    await c.env.DB.prepare(`
    UPDATE tenants SET name = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).bind(name, status, getNowUTC8(), parseInt(id)).run();

    return c.json({ success: true });
});

// Delete tenant
app.delete('/tenants/:id', async (c) => {
    const { id } = c.req.param();

    // Delete all related data
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM wrong_words WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM word_mastery WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM practice_sessions WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM daily_tasks WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM study_plans WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM words WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM word_books WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM users WHERE tenant_id = ?').bind(parseInt(id)),
        c.env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(parseInt(id)),
    ]);

    return c.json({ success: true });
});

export default app;
