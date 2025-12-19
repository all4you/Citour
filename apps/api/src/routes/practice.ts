import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';
import { getNowUTC8 } from '../utils/time';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', tenantMiddleware);

// Submit practice result for a word
app.post('/submit', async (c) => {
    const tenantId = c.get('tenantId');
    const { user_id, word_id, book_id, task_id, is_correct, used_hint, user_input } = await c.req.json();

    if (!user_id || !word_id) {
        return c.json({ error: '缺少必填字段' }, 400);
    }

    // If wrong, add to wrong_words
    if (!is_correct && user_input) {
        const word = await c.env.DB.prepare(`
          SELECT spelling FROM words WHERE id = ?
        `).bind(word_id).first();

        if (word) {
            await c.env.DB.prepare(`
              INSERT INTO wrong_words (tenant_id, user_id, word_id, book_id, task_id, correct_spelling, wrong_spelling)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(tenantId, user_id, word_id, book_id || null, task_id || null, word.spelling, user_input).run();
        }
    }

    return c.json({
        success: true
    });
});

// Get wrong words for a user
app.get('/wrong-words', async (c) => {
    const tenantId = c.get('tenantId');
    const { user_id, book_id, time_filter = 'all', page = '1', pageSize = '20' } = c.req.query();

    if (!user_id) {
        return c.json({ error: 'Missing user_id' }, 400);
    }

    const userId = parseInt(user_id);
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    // 构建时间筛选条件
    let timeCondition = '';
    const now = new Date();
    if (time_filter === 'today') {
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        timeCondition = `AND DATE(ww.created_at) = '${today}'`;
    } else if (time_filter === 'week') {
        // 最近7天
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        timeCondition = `AND DATE(ww.created_at) >= '${weekAgoStr}'`;
    }

    // 1. 获取统计数据
    const statsQuery = `
        SELECT 
            COUNT(DISTINCT ww.word_id) as total,
            COUNT(DISTINCT CASE WHEN DATE(ww.created_at) >= DATE('now', '-7 days') THEN ww.word_id END) as this_week_count,
            SUM(CASE WHEN ww.reviewed = 1 THEN 1 ELSE 0 END) as reviewed_count
        FROM wrong_words ww
        WHERE ww.user_id = ? AND ww.tenant_id = ?
    `;
    const stats = await c.env.DB.prepare(statsQuery).bind(userId, tenantId).first();

    // 2. 获取错词列表（聚合多次错误）
    let wordsQuery = `
        SELECT 
            w.id as word_id,
            w.spelling,
            w.meaning,
            wb.name as book_name,
            COUNT(ww.id) as wrong_count,
            MIN(ww.created_at) as first_error_at,
            MAX(ww.created_at) as last_error_at,
            GROUP_CONCAT(ww.wrong_spelling, '|') as wrong_spellings,
            MAX(ww.reviewed) as reviewed
        FROM wrong_words ww
        JOIN words w ON ww.word_id = w.id
        LEFT JOIN word_books wb ON ww.book_id = wb.id
        WHERE ww.user_id = ? AND ww.tenant_id = ?
    `;
    const params: any[] = [userId, tenantId];

    if (book_id) {
        wordsQuery += ' AND ww.book_id = ?';
        params.push(parseInt(book_id));
    }

    wordsQuery += ` ${timeCondition} GROUP BY w.id ORDER BY last_error_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(pageSize), offset);

    const wrongWords = await c.env.DB.prepare(wordsQuery).bind(...params).all();

    // 处理 wrong_spellings，去重并限制显示
    const processedWords = wrongWords.results?.map((item: any) => {
        const spellings = item.wrong_spellings ? item.wrong_spellings.split('|') : [];
        const uniqueSpellings = [...new Set(spellings)].filter(s => s);
        return {
            ...item,
            wrong_spelling: uniqueSpellings.slice(0, 3).join(', ') // 最多显示3个
        };
    });

    return c.json({
        success: true,
        data: processedWords,
        stats: {
            total: Number(stats?.total || 0),
            thisWeek: Number(stats?.this_week_count || 0),
            reviewed: Number(stats?.reviewed_count || 0),
            unreviewed: Number(stats?.total || 0) - Number(stats?.reviewed_count || 0)
        }
    });
});

// Mark wrong word as reviewed
app.put('/wrong-words/:id/review', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    await c.env.DB.prepare(`
        UPDATE wrong_words SET reviewed = 1 WHERE id = ? AND tenant_id = ?
    `).bind(parseInt(id), tenantId).run();

    return c.json({ success: true });
});

// Get practice history (打卡记录)
app.get('/history', async (c) => {
    const tenantId = c.get('tenantId');
    const { user_id, book_id, page = '1', pageSize = '20' } = c.req.query();

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // 构建查询条件
    const params: any[] = [tenantId];
    let whereClause = 'WHERE lt.tenant_id = ? AND lt.status = "completed"';

    if (user_id) {
        whereClause += ' AND lt.user_id = ?';
        params.push(parseInt(user_id));
    }

    if (book_id) {
        whereClause += ' AND lt.book_id = ?';
        params.push(parseInt(book_id));
    }

    // 1. 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM learning_tasks lt ${whereClause}`;
    const totalResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = totalResult?.total || 0;

    // 2. 获取列表
    const listQuery = `
        SELECT 
            lt.id,
            lt.user_id,
            lt.book_id,
            wb.name as book_name,
            'review' as session_type, -- 默认为 review，因为表里没有 session_type
            lt.started_at,
            lt.ended_at,
            lt.duration_seconds,
            lt.total_count as total_words,
            lt.correct_count,
            lt.wrong_count,
            lt.hint_count
        FROM learning_tasks lt
        LEFT JOIN word_books wb ON lt.book_id = wb.id
        ${whereClause}
        ORDER BY lt.created_at DESC
        LIMIT ? OFFSET ?
    `;

    // 添加分页参数
    const listParams = [...params, limit, offset];
    const results = await c.env.DB.prepare(listQuery).bind(...listParams).all();

    return c.json({
        success: true,
        data: results.results,
        total
    });
});

// Start a practice session
app.post('/session/start', async (c) => {
    const tenantId = c.get('tenantId');
    const { user_id, book_id, word_ids = [], total_words } = await c.req.json();

    if (!user_id || !book_id) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    const now = getNowUTC8(); // Use local time

    const result = await c.env.DB.prepare(`
        INSERT INTO learning_tasks (
            tenant_id, user_id, book_id, word_ids, total_count, 
            status, started_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?)
        RETURNING id
    `).bind(
        tenantId, user_id, book_id, JSON.stringify(word_ids), total_words || word_ids.length,
        now, now
    ).first();

    return c.json({
        success: true,
        data: {
            session_id: result?.id
        }
    });
});

// End a practice session
app.post('/session/:id/end', async (c) => {
    const tenantId = c.get('tenantId');
    const sessionId = c.req.param('id');
    const { duration_seconds, correct_count, wrong_count, hint_count } = await c.req.json();

    const now = getNowUTC8();

    await c.env.DB.prepare(`
        UPDATE learning_tasks 
        SET status = 'completed',
            ended_at = ?,
            duration_seconds = ?,
            correct_count = ?,
            wrong_count = ?,
            hint_count = ?
        WHERE id = ? AND tenant_id = ?
    `).bind(
        now,
        duration_seconds || 0,
        correct_count || 0,
        wrong_count || 0,
        hint_count || 0,
        sessionId,
        tenantId
    ).run();

    return c.json({
        success: true
    });
});

export default app;
