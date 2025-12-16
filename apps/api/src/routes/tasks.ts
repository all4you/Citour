import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';
import { getNowUTC8 } from '../utils/time';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', tenantMiddleware);

// 为单词本创建学习任务（取最多20个未学习的单词）
app.post('/generate', async (c) => {
    const tenantId = c.get('tenantId');
    const { user_id, book_id } = await c.req.json();

    if (!user_id || !book_id) {
        return c.json({ error: '缺少必填字段' }, 400);
    }

    // 检查是否有未完成的任务
    const pendingTask = await c.env.DB.prepare(`
        SELECT * FROM learning_tasks 
        WHERE user_id = ? AND book_id = ? AND status != 'completed'
        ORDER BY created_at DESC LIMIT 1
    `).bind(user_id, book_id).first();

    if (pendingTask) {
        // 返回现有未完成任务
        const wordIds = JSON.parse(pendingTask.word_ids || '[]');
        let words: any[] = [];
        if (wordIds.length > 0) {
            const placeholders = wordIds.map(() => '?').join(',');
            const wordsResult = await c.env.DB.prepare(`
                SELECT * FROM words WHERE id IN (${placeholders}) AND tenant_id = ?
            `).bind(...wordIds, tenantId).all();
            words = wordsResult.results;
        }

        return c.json({
            success: true,
            data: {
                ...pendingTask,
                words
            },
            exists: true
        });
    }

    // 获取单词本信息
    const bookInfo = await c.env.DB.prepare(`
        SELECT word_count FROM word_books WHERE id = ?
    `).bind(book_id).first();

    // 获取该单词本所有已完成任务中的单词（去重）
    const learnedWords = await c.env.DB.prepare(`
        SELECT DISTINCT json_each.value as word_id
        FROM learning_tasks lt, json_each(lt.word_ids)
        WHERE lt.user_id = ? AND lt.book_id = ? AND lt.status = 'completed'
    `).bind(user_id, book_id).all();

    const learnedWordIds = learnedWords.results.map((w: any) => parseInt(w.word_id));

    // 检查 study_plans 状态
    const studyPlan = await c.env.DB.prepare(`
        SELECT status FROM study_plans WHERE user_id = ? AND book_id = ?
    `).bind(user_id, book_id).first();

    let newWords: any;

    if (studyPlan?.status === 'completed') {
        // 已完成的单词本：随机选择 20 个
        newWords = await c.env.DB.prepare(`
            SELECT id FROM words WHERE book_id = ? AND tenant_id = ?
            ORDER BY RANDOM()
            LIMIT 20
        `).bind(book_id, tenantId).all();
    } else {
        // 未完成的单词本：选择未学过的单词
        if (learnedWordIds.length === 0) {
            newWords = await c.env.DB.prepare(`
                SELECT id FROM words WHERE book_id = ? AND tenant_id = ?
                ORDER BY id ASC LIMIT 20
            `).bind(book_id, tenantId).all();
        } else {
            const excludePlaceholders = learnedWordIds.map(() => '?').join(',');
            newWords = await c.env.DB.prepare(`
                SELECT id FROM words 
                WHERE book_id = ? AND tenant_id = ? AND id NOT IN (${excludePlaceholders})
                ORDER BY id ASC LIMIT 20
            `).bind(book_id, tenantId, ...learnedWordIds).all();
        }
    }

    if (newWords.results.length === 0) {
        // 所有单词都已学完
        return c.json({
            success: true,
            allCompleted: true,
            message: '该单词本所有单词都已学习完成，可以点击"完成学习"'
        });
    }

    const wordIds = newWords.results.map((w: any) => w.id);
    const wordIdsJson = JSON.stringify(wordIds);
    const now = getNowUTC8();

    // 创建学习任务
    const result = await c.env.DB.prepare(`
        INSERT INTO learning_tasks (tenant_id, user_id, book_id, word_ids, total_count, status, started_at, created_at)
        VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?)
    `).bind(tenantId, user_id, book_id, wordIdsJson, wordIds.length, now, now).run();

    // 获取单词详情
    const placeholders = wordIds.map(() => '?').join(',');
    const wordsResult = await c.env.DB.prepare(`
        SELECT * FROM words WHERE id IN (${placeholders}) AND tenant_id = ?
    `).bind(...wordIds, tenantId).all();

    return c.json({
        success: true,
        data: {
            id: result.meta.last_row_id,
            word_ids: wordIdsJson,
            total_count: wordIds.length,
            words: wordsResult.results,
            book_id
        }
    });
});

// 获取任务详情
app.get('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    const task = await c.env.DB.prepare(`
        SELECT lt.*, wb.name as book_name
        FROM learning_tasks lt
        JOIN word_books wb ON lt.book_id = wb.id
        WHERE lt.id = ? AND lt.tenant_id = ?
    `).bind(parseInt(id), tenantId).first();

    if (!task) {
        return c.json({ error: '任务不存在' }, 404);
    }

    // 获取单词详情
    const wordIds = JSON.parse(task.word_ids || '[]');
    let words: any[] = [];
    if (wordIds.length > 0) {
        const placeholders = wordIds.map(() => '?').join(',');
        const wordsResult = await c.env.DB.prepare(`
            SELECT * FROM words WHERE id IN (${placeholders}) AND tenant_id = ?
        `).bind(...wordIds, tenantId).all();
        words = wordsResult.results;
    }

    return c.json({
        success: true,
        data: {
            ...task,
            words
        }
    });
});

// 更新任务进度和统计
app.put('/:id/update', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const { correct_count, wrong_count, hint_count, status } = await c.req.json();

    const updates: string[] = [];
    const params: any[] = [];

    if (correct_count !== undefined) {
        updates.push('correct_count = ?');
        params.push(correct_count);
    }
    if (wrong_count !== undefined) {
        updates.push('wrong_count = ?');
        params.push(wrong_count);
    }
    if (hint_count !== undefined) {
        updates.push('hint_count = ?');
        params.push(hint_count);
    }
    if (status) {
        updates.push('status = ?');
        params.push(status);
        if (status === 'completed') {
            updates.push('ended_at = ?');
            params.push(getNowUTC8());
        }
    }

    if (updates.length === 0) {
        return c.json({ error: '没有要更新的字段' }, 400);
    }

    // 计算时长
    const task = await c.env.DB.prepare(`
        SELECT started_at FROM learning_tasks WHERE id = ? AND tenant_id = ?
    `).bind(parseInt(id), tenantId).first();

    if (task && status === 'completed') {
        const startTime = new Date(task.started_at as string).getTime();
        const duration = Math.round((Date.now() - startTime) / 1000);
        updates.push('duration_seconds = ?');
        params.push(duration);
    }

    const query = `UPDATE learning_tasks SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`;
    params.push(parseInt(id), tenantId);

    await c.env.DB.prepare(query).bind(...params).run();

    return c.json({ success: true });
});

export default app;
