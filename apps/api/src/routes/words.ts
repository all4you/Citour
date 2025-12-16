import { Hono } from 'hono';
import { tenantMiddleware } from '../middleware/auth';

interface Env {
    DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', tenantMiddleware);

// Get words for a wordbook
app.get('/book/:bookId', async (c) => {
    const tenantId = c.get('tenantId');
    const { bookId } = c.req.param();
    const { page = '1', pageSize = '20' } = c.req.query();
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const words = await c.env.DB.prepare(`
    SELECT * FROM words 
    WHERE book_id = ? AND tenant_id = ?
    ORDER BY id ASC
    LIMIT ? OFFSET ?
  `).bind(parseInt(bookId), tenantId, parseInt(pageSize), offset).all();

    const countResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM words WHERE book_id = ? AND tenant_id = ?
  `).bind(parseInt(bookId), tenantId).first();

    return c.json({
        success: true,
        data: words.results,
        total: countResult?.total || 0
    });
});

// Get single word
app.get('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    const word = await c.env.DB.prepare(`
    SELECT * FROM words WHERE id = ? AND tenant_id = ?
  `).bind(parseInt(id), tenantId).first();

    if (!word) {
        return c.json({ error: '单词不存在' }, 404);
    }

    return c.json({ success: true, data: word });
});

// Create word
app.post('/', async (c) => {
    const tenantId = c.get('tenantId');
    const { book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty } = await c.req.json();

    if (!book_id || !spelling || !meaning) {
        return c.json({ error: '缺少必填字段' }, 400);
    }

    const result = await c.env.DB.prepare(`
    INSERT INTO words (tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
        tenantId, book_id, spelling, meaning,
        sentence || '', phonics_data || '', root_info || '', audio_url || '', difficulty || 1
    ).run();

    // Update word count cache
    await c.env.DB.prepare(`
    UPDATE word_books SET word_count = word_count + 1 WHERE id = ? AND tenant_id = ?
  `).bind(book_id, tenantId).run();

    return c.json({ success: true, id: result.meta.last_row_id });
});

// Update word
app.put('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();
    const { spelling, meaning, sentence, phonics_data, root_info, audio_url, difficulty } = await c.req.json();

    await c.env.DB.prepare(`
    UPDATE words 
    SET spelling = ?, meaning = ?, sentence = ?, phonics_data = ?, root_info = ?, audio_url = ?, difficulty = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(spelling, meaning, sentence || '', phonics_data || '', root_info || '', audio_url || '', difficulty || 1, parseInt(id), tenantId).run();

    return c.json({ success: true });
});

// Delete word
app.delete('/:id', async (c) => {
    const tenantId = c.get('tenantId');
    const { id } = c.req.param();

    // Get book_id first
    const word = await c.env.DB.prepare(`
    SELECT book_id FROM words WHERE id = ? AND tenant_id = ?
  `).bind(parseInt(id), tenantId).first();

    if (word) {
        await c.env.DB.prepare(`
      DELETE FROM words WHERE id = ? AND tenant_id = ?
    `).bind(parseInt(id), tenantId).run();

        // Update word count cache
        await c.env.DB.prepare(`
      UPDATE word_books SET word_count = word_count - 1 WHERE id = ? AND tenant_id = ?
    `).bind(word.book_id, tenantId).run();
    }

    return c.json({ success: true });
});

// Batch import words
app.post('/import', async (c) => {
    const tenantId = c.get('tenantId');
    const { book_id, words: wordList } = await c.req.json();

    if (!book_id || !Array.isArray(wordList)) {
        return c.json({ error: '无效的导入数据' }, 400);
    }

    let imported = 0;
    let failed = 0;

    for (const word of wordList) {
        try {
            if (!word.spelling || !word.meaning) {
                failed++;
                continue;
            }

            await c.env.DB.prepare(`
        INSERT INTO words (tenant_id, book_id, spelling, meaning, sentence, phonics_data, root_info)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
                tenantId, book_id, word.spelling, word.meaning,
                word.sentence || '', word.phonics_data || '', word.root_info || ''
            ).run();

            imported++;
        } catch (err) {
            failed++;
        }
    }

    // Update word count cache
    await c.env.DB.prepare(`
    UPDATE word_books SET word_count = (
      SELECT COUNT(*) FROM words WHERE book_id = ? AND tenant_id = ?
    ) WHERE id = ? AND tenant_id = ?
  `).bind(book_id, tenantId, book_id, tenantId).run();

    return c.json({ success: true, imported, failed });
});

export default app;
