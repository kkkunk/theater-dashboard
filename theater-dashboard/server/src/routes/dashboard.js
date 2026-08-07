import { Router } from 'express';
import { getAlerts, getAudience, getChannels, getShowCards, getSummary, getTrends } from '../models/dashboard.js';

export function dashboardRouter(db) {
  const router = Router();
  router.get('/summary', (req, res) => res.json({ data: getSummary(db, req.query) }));
  router.get('/trends', (req, res) => res.json({ data: getTrends(db, req.query) }));
  router.get('/channels', (req, res) => res.json({ data: getChannels(db, req.query) }));
  router.get('/audience', (req, res) => res.json({ data: getAudience(db, req.query) }));
  router.get('/shows', (_req, res) => res.json({ data: getShowCards(db) }));
  router.get('/alerts', (_req, res) => res.json({ data: getAlerts(db) }));
  return router;
}
