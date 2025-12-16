import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';
import { getNowUTC8 } from '../utils/time';

interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// Apply tenant middleware to all routes
app.use('*', tenantMiddleware);

// Get all wordbooks for tenant
app.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const { page = '1', pageSize = '20', status } = c.req.query();
  const offset = (parseInt(page) - 1) * parseInt(pageSize);

  let query = 'SELECT * FROM word_books WHERE tenant_id = ?';
  const params: any[] = [tenantId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY id ASC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);

  const books = await c.env.DB.prepare(query).bind(...params).all();

  const countQuery = status
    ? 'SELECT COUNT(*) as total FROM word_books WHERE tenant_id = ? AND status = ?'
    : 'SELECT COUNT(*) as total FROM word_books WHERE tenant_id = ?';
  const countParams = status ? [tenantId, status] : [tenantId];
  const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();

  return c.json({
    success: true,
    data: books.results,
    total: countResult?.total || 0
  });
});

// Get single wordbook
app.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  const book = await c.env.DB.prepare(`
    SELECT * FROM word_books WHERE id = ? AND tenant_id = ?
  `).bind(parseInt(id), tenantId).first();

  if (!book) {
    return c.json({ error: '单词本不存在' }, 404);
  }

  return c.json({ success: true, data: book });
});

// Create wordbook
app.post('/', async (c) => {
  const tenantId = c.get('tenantId');
  const { name, description, status = 'offline', daily_target = 20 } = await c.req.json();

  if (!name) {
    return c.json({ error: '名称不能为空' }, 400);
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO word_books (tenant_id, name, description, status, daily_target)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tenantId, name, description || '', status, daily_target).run();

  return c.json({ success: true, id: result.meta.last_row_id });
});

// Update wordbook
app.put('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const { name, description, status, daily_target } = await c.req.json();

  await c.env.DB.prepare(`
    UPDATE word_books 
    SET name = ?, description = ?, status = ?, daily_target = ?, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(name, description, status, daily_target, getNowUTC8(), parseInt(id), tenantId).run();

  return c.json({ success: true });
});

// Delete wordbook
app.delete('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  // Words will be deleted via CASCADE
  await c.env.DB.prepare(`
    DELETE FROM word_books WHERE id = ? AND tenant_id = ?
  `).bind(parseInt(id), tenantId).run();

  return c.json({ success: true });
});

// Update word count cache
app.post('/:id/refresh-count', async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  const countResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM words WHERE book_id = ? AND tenant_id = ?
  `).bind(parseInt(id), tenantId).first();

  await c.env.DB.prepare(`
    UPDATE word_books SET word_count = ? WHERE id = ? AND tenant_id = ?
  `).bind(countResult?.count || 0, parseInt(id), tenantId).run();

  return c.json({ success: true, count: countResult?.count || 0 });
});

export default app;
