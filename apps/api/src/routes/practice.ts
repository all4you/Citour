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

export default app;
