import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Route imports
import auth from './routes/auth';
import sys from './routes/sys';
import wordbooks from './routes/wordbooks';
import words from './routes/words';
import students from './routes/students';
import plans from './routes/plans';
import tasks from './routes/tasks';
import practice from './routes/practice';
import dashboard from './routes/dashboard';
import calendar from './routes/calendar';

// ... (imports)

// Types
export interface Env {
    DB: D1Database;
    ENVIRONMENT: string;
}

// Create app
const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
}));

// Health check
app.get('/', (c) => {
    return c.json({
        message: 'Citour API is running!',
        version: '1.0.0',
        environment: c.env.ENVIRONMENT
    });
});

// Mount routes
app.route('/api/auth', auth);
app.route('/api/sys', sys);
app.route('/api/wordbooks', wordbooks);
app.route('/api/words', words);
app.route('/api/students', students);
app.route('/api/plans', plans);
app.route('/api/tasks', tasks);
app.route('/api/practice', practice);
app.route('/api/dashboard', dashboard);
app.route('/api/calendar', calendar);

// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
    console.error('Error:', err);
    return c.json({ error: err.message }, 500);
});

export default app;
