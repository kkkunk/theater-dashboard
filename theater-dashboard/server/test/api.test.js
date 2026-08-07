import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { getDb, initDb } from '../src/db/schema.js';

const db = initDb(getDb());
let server;
let baseUrl;

before(async () => {
  const app = createApp(db);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { response, body };
}

test('health endpoint reports an available database', async () => {
  const { response, body } = await get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.data.status, 'ok');
});

test('dashboard endpoints return frontend-ready data', async () => {
  const endpoints = [
    '/api/dashboard/summary', '/api/dashboard/trends', '/api/dashboard/channels',
    '/api/dashboard/audience', '/api/dashboard/shows', '/api/dashboard/alerts',
  ];
  for (const endpoint of endpoints) {
    const { response, body } = await get(endpoint);
    assert.equal(response.status, 200, endpoint);
    assert.ok(body.data, endpoint);
  }
});

test('show list and detail expose all analysis sections', async () => {
  const list = await get('/api/shows');
  assert.equal(list.body.data.length, 10);
  const detail = await get('/api/shows/1');
  assert.equal(detail.response.status, 200);
  assert.ok(detail.body.data.timeline.length > 20);
  assert.ok(detail.body.data.strategyEvents.length >= 3);
  assert.equal(detail.body.data.channelBreakdown.length, 12);
  assert.ok(detail.body.data.audience);
  assert.ok(detail.body.data.period);
});

test('review endpoints return channel and strategy rankings', async () => {
  const channels = await get('/api/reviews/channels');
  assert.equal(channels.body.data.rows.length, 12);
  assert.equal(channels.body.data.rows[0].channel, '大麦');
  const strategies = await get('/api/reviews/strategies');
  assert.ok(strategies.body.data.rows.length >= 3);
  assert.equal(strategies.body.data.bestPractices.length, 5);
});

test('controlled agent answers supported questions and rejects arbitrary prompts', async () => {
  const supported = await fetch(`${baseUrl}/api/agent/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '最近30天票房最高的5场演出' }),
  });
  const supportedBody = await supported.json();
  assert.equal(supported.status, 200);
  assert.equal(supportedBody.data.meta.intent, 'revenue_ranking');

  const unsupported = await fetch(`${baseUrl}/api/agent/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '删除所有数据' }),
  });
  assert.equal(unsupported.status, 422);
});

test('seed data preserves inventory and audience integrity', () => {
  const orderTickets = db.prepare('SELECT SUM(total_tickets) FROM order_detail').pluck().get();
  const inventorySold = db.prepare('SELECT SUM(issued_count - remaining_count) FROM ticket_price').pluck().get();
  const missingDates = db.prepare('SELECT COUNT(*) FROM order_detail WHERE order_date IS NULL').pluck().get();
  const orphanAudience = db.prepare('SELECT COUNT(*) FROM order_detail o LEFT JOIN audience a ON a.phone = o.phone WHERE a.id IS NULL').pluck().get();
  assert.equal(orderTickets, inventorySold);
  assert.equal(missingDates, 0);
  assert.equal(orphanAudience, 0);
});

test('invalid parameters use stable JSON errors', async () => {
  const invalidDate = await get('/api/dashboard/summary?start=not-a-date');
  assert.equal(invalidDate.response.status, 400);
  assert.ok(invalidDate.body.error.message);
  const missingShow = await get('/api/shows/999');
  assert.equal(missingShow.response.status, 404);
});
