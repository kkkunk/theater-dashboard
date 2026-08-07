import { Router } from 'express';
import { getChannelReview, getStrategyReview } from '../models/reviews.js';

export function reviewsRouter(db) {
  const router = Router();
  router.get('/channels', (req, res) => res.json({ data: getChannelReview(db, req.query) }));
  router.get('/strategies', (req, res) => res.json({ data: getStrategyReview(db, req.query) }));
  return router;
}
