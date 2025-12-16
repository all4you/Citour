import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';

interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', tenantMiddleware);

// Get dashboard statistics
app.get('/stats', async (c) => {
  const tenantId = c.get('tenantId');

  // Word book count
  const bookCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM word_books WHERE tenant_id = ?
  `).bind(tenantId).first();

  // Online word book count
  const onlineBookCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM word_books WHERE tenant_id = ? AND status = 'online'
  `).bind(tenantId).first();

  // Word count
  const wordCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM words WHERE tenant_id = ?
  `).bind(tenantId).first();

  // Student count
  const studentCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM users WHERE tenant_id = ? AND role = 'student'
  `).bind(tenantId).first();

  // Practice session count
  const practiceCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM practice_sessions WHERE tenant_id = ?
  `).bind(tenantId).first();

  // Total correct attempts
  const correctAttempts = await c.env.DB.prepare(`
    SELECT SUM(correct_count) as total FROM practice_sessions WHERE tenant_id = ?
  `).bind(tenantId).first();

  return c.json({
    success: true,
    data: {
      wordbookCount: bookCount?.total || 0,
      onlineWordbookCount: onlineBookCount?.total || 0,
      wordCount: wordCount?.total || 0,
      studentCount: studentCount?.total || 0,
      practiceCount: practiceCount?.total || 0,
      totalCorrect: correctAttempts?.total || 0
    }
  });
});

// Get user statistics (for student app)
app.get('/user-stats', async (c) => {
  const tenantId = c.get('tenantId');
  const { user_id } = c.req.query();

  if (!user_id) {
    return c.json({ error: 'Missing user_id' }, 400);
  }

  const userId = parseInt(user_id);

  // 已学单词数（从已完成的 learning_tasks 中统计）
  const wordsLearned = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT json_each.value) as total
    FROM learning_tasks lt, json_each(lt.word_ids)
    WHERE lt.user_id = ? AND lt.tenant_id = ? AND lt.status = 'completed'
  `).bind(userId, tenantId).first();

  // 完成任务数
  const tasksCompleted = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM learning_tasks 
    WHERE user_id = ? AND tenant_id = ? AND status = 'completed'
  `).bind(userId, tenantId).first();

  // 正确率
  const accuracyData = await c.env.DB.prepare(`
    SELECT SUM(correct_count) as correct, SUM(correct_count + wrong_count) as total
    FROM learning_tasks 
    WHERE user_id = ? AND tenant_id = ?
  `).bind(userId, tenantId).first();

  const accuracy = accuracyData?.total
    ? Math.round((accuracyData.correct as number / (accuracyData.total as number)) * 100)
    : 0;

  // 学习天数
  const streakDays = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT DATE(created_at)) as days
    FROM learning_tasks
    WHERE user_id = ? AND tenant_id = ? AND status = 'completed'
    AND created_at >= datetime('now', '-30 days')
  `).bind(userId, tenantId).first();

  // 错词数
  const wrongWordsCount = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM wrong_words 
    WHERE user_id = ? AND tenant_id = ?
  `).bind(userId, tenantId).first();

  return c.json({
    success: true,
    data: {
      wordsLearned: wordsLearned?.total || 0,
      tasksCompleted: tasksCompleted?.total || 0,
      accuracy,
      streakDays: streakDays?.days || 0,
      wrongWordsCount: wrongWordsCount?.total || 0
    }
  });
});

export default app;
