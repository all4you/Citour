import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';
import { getNowUTC8 } from '../utils/time';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', tenantMiddleware);

// Get all students for tenant
app.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const { page = '1', pageSize = '20' } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const students = await c.env.DB.prepare(`
    SELECT id, tenant_id, name, account, class_name, created_at
    FROM users 
    WHERE tenant_id = ? AND role = 'student'
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).bind(tenantId, parseInt(pageSize), offset).all();

    const countResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM users WHERE tenant_id = ? AND role = 'student'
  `).bind(tenantId).first();

    return c.json({
        success: true,
        data: students.results,
        total: countResult?.total || 0
    });
});

// Create student
app.post('/', async (c) => {
    const tenantId = c.get('tenantId');
    const { name, account, password, class_name } = await c.req.json();

    if (!name || !account || !password) {
        return c.json({ error: '缺少必填字段' }, 400);
    }

    // Check if account already exists
    const existing = await c.env.DB.prepare(`
    SELECT id FROM users WHERE account = ? AND tenant_id = ?
  `).bind(account, tenantId).first();

    if (existing) {
        return c.json({ error: '账号已存在' }, 400);
    }

    const result = await c.env.DB.prepare(`
    INSERT INTO users (tenant_id, name, account, password, role, class_name)
    VALUES (?, ?, ?, ?, 'student', ?)
  `).bind(tenantId, name, account, password, class_name || '').run();

    return c.json({ success: true, id: result.meta.last_row_id });
});

// Update student
app.put('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const { name, account, password, class_name } = await c.req.json();

    let query = 'UPDATE users SET name = ?, account = ?, class_name = ?, updated_at = ?';
    const params: any[] = [name, account, class_name || '', getNowUTC8()];

    if (password) {
        query += ', password = ?';
        params.push(password);
    }

    query += ' WHERE id = ? AND tenant_id = ? AND role = ?';
    params.push(parseInt(id), tenantId, 'student');

    await c.env.DB.prepare(query).bind(...params).run();

    return c.json({ success: true });
});

// Delete student
app.delete('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    // Delete related data first
    await c.env.DB.batch([
        c.env.DB.prepare('DELETE FROM wrong_words WHERE user_id = ? AND tenant_id = ?').bind(parseInt(id), tenantId),
        c.env.DB.prepare('DELETE FROM word_mastery WHERE user_id = ? AND tenant_id = ?').bind(parseInt(id), tenantId),
        c.env.DB.prepare('DELETE FROM practice_sessions WHERE user_id = ? AND tenant_id = ?').bind(parseInt(id), tenantId),
        c.env.DB.prepare('DELETE FROM daily_tasks WHERE user_id = ? AND tenant_id = ?').bind(parseInt(id), tenantId),
        c.env.DB.prepare('DELETE FROM study_plans WHERE user_id = ? AND tenant_id = ?').bind(parseInt(id), tenantId),
        c.env.DB.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ? AND role = ?').bind(parseInt(id), tenantId, 'student'),
    ]);

    return c.json({ success: true });
});

export default app;
