import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';
import { getNowUTC8 } from '../utils/time';

interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', tenantMiddleware);

// 获取用户所有单词本及学习状态
app.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const { user_id } = c.req.query();

  if (!user_id) {
    return c.json({ error: 'Missing user_id' }, 400);
  }

  const userId = parseInt(user_id);

  // 获取所有上线的单词本，关联学习计划和学习进度
  // 已完成的单词：统计已完成的 learning_tasks 中的单词数
  // 练习次数：统计该单词本的 learning_tasks 数量
  // 如果需要将已完成的单词本排到最后，则在ORDER BY语句中增加下面的排序逻辑
  // CASE COALESCE(sp.status, 'not_started')
  //   WHEN 'learning' THEN 1
  //   WHEN 'not_started' THEN 2
  //   WHEN 'completed' THEN 3
  // END,
  const books = await c.env.DB.prepare(`
    SELECT 
      wb.id,
      wb.name,
      wb.description,
      wb.word_count,
      COALESCE(sp.status, 'not_started') as status,
      sp.id as plan_id,
      sp.started_at,
      sp.completed_at,
      (
        SELECT COUNT(DISTINCT json_each.value) 
        FROM learning_tasks lt, json_each(lt.word_ids) 
        WHERE lt.user_id = ? AND lt.book_id = wb.id AND lt.status = 'completed'
      ) as completed_words,
      (
        SELECT COUNT(*) 
        FROM learning_tasks lt 
        WHERE lt.user_id = ? AND lt.book_id = wb.id
      ) as practice_count
    FROM word_books wb
    LEFT JOIN study_plans sp ON wb.id = sp.book_id AND sp.user_id = ? AND sp.tenant_id = ?
    WHERE wb.tenant_id = ? AND wb.status = 'online'
    ORDER BY 
      CASE COALESCE(sp.status, 'not_started')
       WHEN 'learning' THEN 1
       WHEN 'not_started' THEN 2
       WHEN 'completed' THEN 3
      END ASC
  `).bind(userId, userId, userId, tenantId, tenantId).all();

  return c.json({
    success: true,
    data: books.results
  });
});

// 获取当前学习中的单词本
app.get('/current', async (c) => {
  const tenantId = c.get('tenantId');
  const { user_id } = c.req.query();

  if (!user_id) {
    return c.json({ error: 'Missing user_id' }, 400);
  }

  const userId = parseInt(user_id);

  const current = await c.env.DB.prepare(`
    SELECT 
      wb.id,
      wb.name,
      wb.description,
      wb.word_count,
      sp.id as plan_id,
      sp.status,
      sp.started_at,
      (
        SELECT COUNT(DISTINCT json_each.value) 
        FROM learning_tasks lt, json_each(lt.word_ids) 
        WHERE lt.user_id = ? AND lt.book_id = wb.id AND lt.status = 'completed'
      ) as completed_words
    FROM study_plans sp
    JOIN word_books wb ON sp.book_id = wb.id
    WHERE sp.user_id = ? AND sp.tenant_id = ? AND sp.status = 'learning'
    LIMIT 1
  `).bind(userId, userId, tenantId).first();

  // 总是查询最近完成的单词本（无论是否有正在学习的）
  const lastCompleted = await c.env.DB.prepare(`
    SELECT 
      wb.id,
      wb.name,
      wb.word_count,
      sp.id as plan_id,
      sp.status,
      sp.completed_at,
      (
        SELECT COUNT(DISTINCT json_each.value) 
        FROM learning_tasks lt, json_each(lt.word_ids) 
        WHERE lt.user_id = ? AND lt.book_id = wb.id AND lt.status = 'completed'
      ) as completed_words,
      (
        SELECT COUNT(*) 
        FROM learning_tasks lt 
        WHERE lt.user_id = ? AND lt.book_id = wb.id
      ) as practice_count
    FROM study_plans sp
    JOIN word_books wb ON sp.book_id = wb.id
    WHERE sp.user_id = ? AND sp.tenant_id = ? AND sp.status = 'completed'
    ORDER BY sp.completed_at DESC
    LIMIT 1
  `).bind(userId, userId, userId, tenantId).first();

  return c.json({
    success: true,
    data: current,
    lastCompleted
  });
});

// 获取单词本学习统计
app.get('/:bookId/stats', async (c) => {
  const tenantId = c.get('tenantId');
  const { bookId } = c.req.param();
  const { user_id } = c.req.query();

  if (!user_id) {
    return c.json({ error: 'Missing user_id' }, 400);
  }

  const userId = parseInt(user_id);
  const bookIdNum = parseInt(bookId);

  // 学习任务统计
  const taskStats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(correct_count) as total_correct,
      SUM(wrong_count) as total_wrong,
      SUM(duration_seconds) as total_duration
    FROM learning_tasks
    WHERE user_id = ? AND book_id = ? AND tenant_id = ?
  `).bind(userId, bookIdNum, tenantId).first();

  // 已学单词数
  const wordStats = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT json_each.value) as learned_words
    FROM learning_tasks lt, json_each(lt.word_ids)
    WHERE lt.user_id = ? AND lt.book_id = ? AND lt.status = 'completed'
  `).bind(userId, bookIdNum).first();

  // 单词本总数
  const bookInfo = await c.env.DB.prepare(`
    SELECT word_count FROM word_books WHERE id = ?
  `).bind(bookIdNum).first();

  // 错词数
  const wrongCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM wrong_words
    WHERE user_id = ? AND book_id = ? AND tenant_id = ?
  `).bind(userId, bookIdNum, tenantId).first();

  const totalCorrect = (taskStats?.total_correct as number) || 0;
  const totalWrong = (taskStats?.total_wrong as number) || 0;
  const totalAttempts = totalCorrect + totalWrong;
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return c.json({
    success: true,
    data: {
      totalWords: bookInfo?.word_count || 0,
      learnedWords: wordStats?.learned_words || 0,
      totalTasks: taskStats?.total_tasks || 0,
      completedTasks: taskStats?.completed_tasks || 0,
      totalCorrect,
      totalWrong,
      accuracy,
      totalDuration: taskStats?.total_duration || 0,
      wrongWordsCount: wrongCount?.count || 0
    }
  });
});

// 开始学习单词本
app.put('/:bookId/start', async (c) => {
  const tenantId = c.get('tenantId');
  const { bookId } = c.req.param();
  const { user_id } = await c.req.json();

  if (!user_id) {
    return c.json({ error: '缺少 user_id' }, 400);
  }

  const bookIdNum = parseInt(bookId);

  // 检查是否已有学习中的单词本
  const activePlan = await c.env.DB.prepare(`
    SELECT sp.id, wb.name as book_name 
    FROM study_plans sp
    JOIN word_books wb ON sp.book_id = wb.id
    WHERE sp.user_id = ? AND sp.tenant_id = ? AND sp.status = 'learning'
  `).bind(user_id, tenantId).first();

  if (activePlan && activePlan.id) {
    // 如果开始的就是当前学习中的单词本，直接返回成功
    const currentBookId = await c.env.DB.prepare(`
      SELECT book_id FROM study_plans WHERE id = ?
    `).bind(activePlan.id).first();

    if (currentBookId?.book_id === bookIdNum) {
      return c.json({ success: true, id: activePlan.id });
    }

    return c.json({
      error: `请先完成或暂停当前学习的单词本「${activePlan.book_name}」`,
      hasActivePlan: true,
      activePlanId: activePlan.id
    }, 400);
  }

  // 检查是否已有该单词本的计划
  const existing = await c.env.DB.prepare(`
    SELECT id, status FROM study_plans WHERE user_id = ? AND book_id = ?
  `).bind(user_id, bookIdNum).first();

  const now = getNowUTC8();

  if (existing) {
    // 更新状态为 learning
    await c.env.DB.prepare(`
      UPDATE study_plans SET status = 'learning', started_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, now, existing.id).run();

    return c.json({ success: true, id: existing.id });
  } else {
    // 创建新的学习计划
    const result = await c.env.DB.prepare(`
      INSERT INTO study_plans (tenant_id, user_id, book_id, status, started_at, created_at, updated_at)
      VALUES (?, ?, ?, 'learning', ?, ?, ?)
    `).bind(tenantId, user_id, bookIdNum, now, now, now).run();

    return c.json({ success: true, id: result.meta.last_row_id });
  }
});

// 暂停学习单词本
app.put('/:bookId/pause', async (c) => {
  const tenantId = c.get('tenantId');
  const { bookId } = c.req.param();
  const { user_id } = await c.req.json();

  if (!user_id) {
    return c.json({ error: '缺少 user_id' }, 400);
  }

  const now = getNowUTC8();

  await c.env.DB.prepare(`
    UPDATE study_plans 
    SET status = 'not_started', updated_at = ?
    WHERE user_id = ? AND book_id = ? AND tenant_id = ?
  `).bind(now, user_id, parseInt(bookId), tenantId).run();

  return c.json({ success: true });
});

// 标记单词本学习完成
app.put('/:bookId/complete', async (c) => {
  const tenantId = c.get('tenantId');
  const { bookId } = c.req.param();
  const { user_id } = await c.req.json();

  if (!user_id) {
    return c.json({ error: '缺少 user_id' }, 400);
  }

  const now = getNowUTC8();

  await c.env.DB.prepare(`
    UPDATE study_plans 
    SET status = 'completed', completed_at = ?, updated_at = ?
    WHERE user_id = ? AND book_id = ? AND tenant_id = ?
  `).bind(now, now, user_id, parseInt(bookId), tenantId).run();

  return c.json({ success: true });
});

// 删除学习计划
app.delete('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const planId = parseInt(id);

  try {
    const plan = await c.env.DB.prepare(`
      SELECT book_id FROM study_plans WHERE id = ? AND tenant_id = ?
    `).bind(planId, tenantId).first();

    if (!plan) {
      return c.json({ error: '计划不存在' }, 404);
    }

    await c.env.DB.prepare(`
      DELETE FROM learning_tasks WHERE book_id = ? AND tenant_id = ?
    `).bind(plan.book_id, tenantId).run();

    await c.env.DB.prepare(`
      DELETE FROM study_plans WHERE id = ? AND tenant_id = ?
    `).bind(planId, tenantId).run();

    return c.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete plan:', err);
    return c.json({ error: err.message || '删除失败' }, 500);
  }
});

export default app;
