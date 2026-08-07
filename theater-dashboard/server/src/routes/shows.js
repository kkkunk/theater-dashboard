import { Router } from 'express';
import { getShowDetail, listShows } from '../models/shows.js';

export function showsRouter(db) {
  const router = Router();
  router.get('/', (req, res) => res.json({ data: listShows(db, req.query) }));
  router.get('/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: { code: 'INVALID_ID', message: '演出 ID 无效。' } });
    const detail = getShowDetail(db, id);
    if (!detail) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '未找到该演出。' } });
    return res.json({ data: detail });
  });
  return router;
}
