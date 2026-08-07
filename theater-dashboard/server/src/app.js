import express from 'express';
import cors from 'cors';
import { dashboardRouter } from './routes/dashboard.js';
import { showsRouter } from './routes/shows.js';
import { reviewsRouter } from './routes/reviews.js';
import { agentRouter } from './routes/agent.js';

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const check = db.prepare('SELECT 1 ok').get();
    res.json({ data: { status: check.ok === 1 ? 'ok' : 'error', timestamp: new Date().toISOString() } });
  });
  app.use('/api/dashboard', dashboardRouter(db));
  app.use('/api/shows', showsRouter(db));
  app.use('/api/reviews', reviewsRouter(db));
  app.use('/api/agent', agentRouter(db));

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '接口不存在。' } }));
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST', message: status === 500 ? '服务器内部错误。' : error.message } });
  });
  return app;
}
