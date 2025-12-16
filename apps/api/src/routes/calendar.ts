import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', tenantMiddleware);

app.get('/', async (c) => {
    const tenantId = c.get('tenantId');
    const { user_id, year, month } = c.req.query();

    if (!user_id || !year || !month) {
        return c.json({ error: 'Missing required parameters: user_id, year, month' }, 400);
    }

    const userId = parseInt(user_id);
    // 格式化月份，保证是两位数字
    const formattedMonth = month.padStart(2, '0');
    // 构建当月起始和结束时间字符串用于筛选，虽然 sqlite strftime 可以直接提取
    const startDate = `${year}-${formattedMonth}-01`;

    try {
        // 统计每日完成的任务数
        // 注意：sqlite 中 substr(ended_at, 1, 10) 提取 YYYY-MM-DD
        const dailyStats = await c.env.DB.prepare(`
            SELECT 
                substr(ended_at, 1, 10) as date,
                COUNT(*) as count
            FROM learning_tasks
            WHERE 
                user_id = ? 
                AND tenant_id = ? 
                AND status = 'completed'
                AND ended_at IS NOT NULL
                AND strftime('%Y', ended_at) = ?
                AND strftime('%m', ended_at) = ?
            GROUP BY date
            ORDER BY date ASC
        `).bind(userId, tenantId, year, formattedMonth).all();

        // 计算当月总打卡次数
        const totalStats = await c.env.DB.prepare(`
            SELECT COUNT(*) as total
            FROM learning_tasks
            WHERE 
                user_id = ? 
                AND tenant_id = ? 
                AND status = 'completed'
                AND ended_at IS NOT NULL
                AND strftime('%Y', ended_at) = ?
                AND strftime('%m', ended_at) = ?
        `).bind(userId, tenantId, year, formattedMonth).first();

        // 转换数据格式为 map: { "2023-10-01": 5, ... }
        const statsMap: Record<string, number> = {};
        dailyStats.results.forEach((row: any) => {
            statsMap[row.date] = row.count;
        });

        return c.json({
            success: true,
            data: {
                daily: statsMap,
                total: totalStats?.total || 0,
                year: parseInt(year),
                month: parseInt(month)
            }
        });
    } catch (e) {
        console.error('Calendar stats error:', e);
        return c.json({ error: 'Failed to fetch calendar stats' }, 500);
    }
});

export default app;
