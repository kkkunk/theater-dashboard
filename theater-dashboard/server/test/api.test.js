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
    '/api/dashboard/media-platforms', '/api/dashboard/operations?grain=day', '/api/dashboard/shows', '/api/dashboard/alerts',
  ];
  for (const endpoint of endpoints) {
    const { response, body } = await get(endpoint);
    assert.equal(response.status, 200, endpoint);
    assert.ok(body.data, endpoint);
  }
});

test('show list and detail expose all analysis sections', async () => {
  const list = await get('/api/shows');
  assert.equal(list.body.data.length, 8);
  const detail = await get('/api/shows/1');
  assert.equal(detail.response.status, 200);
  assert.ok(detail.body.data.timeline.length > 20);
  assert.equal(detail.body.data.strategyEvents.length, 0);
  assert.equal(detail.body.data.channelBreakdown.length, 3);
  assert.equal(detail.body.data.show.expectedTickets, null);
  assert.equal(detail.body.data.show.salesCompletionRate, null);
  assert.equal(detail.body.data.show.capacity, null);
  assert.equal(detail.body.data.show.occupancyRate, null);
  assert.equal(detail.body.data.audience, undefined);
  assert.ok(detail.body.data.period);
});

test('operations master table separates complimentary tickets and aggregates media growth', async () => {
  const result = await get('/api/dashboard/operations?days=30&grain=week');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.grain, 'week');
  assert.ok(result.body.data.rows.length >= 4);
  for (const row of result.body.data.rows) {
    assert.equal(typeof row.totalTickets, 'number');
    assert.equal(typeof row.totalRevenue, 'number');
    assert.ok(row.totalPublicity == null || typeof row.totalPublicity === 'number');
    assert.equal(typeof row.complimentaryTickets, 'number');
    assert.ok(row.mediaFollowerGrowth == null || typeof row.mediaFollowerGrowth === 'number');
  }
});

test('completion rates only compare projects that have verified targets', async () => {
  const result = await get('/api/dashboard/summary?days=365');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.metrics.salesCompletionRate.value, 13.6);
  assert.equal(result.body.data.metrics.boxOfficeCompletionRate.value, 9.6);
});

test('review endpoints return channel and strategy rankings', async () => {
  const channels = await get('/api/reviews/channels?days=365');
  assert.equal(channels.body.data.rows.length, 3);
  assert.deepEqual(new Set(channels.body.data.rows.map((row) => row.channel)), new Set(['保利', '大麦', '其他']));
  const strategies = await get('/api/reviews/strategies');
  assert.equal(strategies.body.data.rows.length, 0);
  assert.equal(strategies.body.data.bestPractices.length, 0);
});

test('controlled agent answers supported questions and rejects arbitrary prompts', async () => {
  const supported = await fetch(`${baseUrl}/api/agent/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '最近30天票房最高的5场演出' }),
  });
  const supportedBody = await supported.json();
  assert.equal(supported.status, 200);
  assert.equal(supportedBody.data.meta.intent, 'revenue_ranking');

  const completion = await fetch(`${baseUrl}/api/agent/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '哪些演出的售票完成率低于80%' }),
  });
  const completionBody = await completion.json();
  assert.equal(completion.status, 200);
  assert.equal(completionBody.data.meta.intent, 'sales_completion_below_threshold');

  const operations = await fetch(`${baseUrl}/api/agent/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '本月总售票数、总宣传量和会员增长数分别是多少' }),
  });
  const operationsBody = await operations.json();
  assert.equal(operations.status, 200);
  assert.equal(operationsBody.data.meta.intent, 'operations_summary');

  const unsupported = await fetch(`${baseUrl}/api/agent/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '删除所有数据' }),
  });
  assert.equal(unsupported.status, 422);
});

test('seed contains verified records only and leaves unavailable datasets empty', () => {
  const missingDates = db.prepare('SELECT COUNT(*) FROM order_detail WHERE order_date IS NULL').pluck().get();
  const phoneRows = db.prepare('SELECT COUNT(*) FROM order_detail WHERE phone IS NOT NULL').pluck().get();
  const missingTargets = db.prepare('SELECT COUNT(*) FROM project_ledger WHERE expected_ticket_count IS NULL').pluck().get();
  const memberDays = db.prepare('SELECT COUNT(*) FROM member_growth_daily').pluck().get();
  const followerSummaries = db.prepare('SELECT COUNT(*) FROM media_platform_summary WHERE start_followers IS NOT NULL AND end_followers IS NOT NULL').pluck().get();
  const emptySyntheticTables = db.prepare(`SELECT
    (SELECT COUNT(*) FROM audience) audiences,
    (SELECT COUNT(*) FROM promotion_strategy) strategies,
    (SELECT COUNT(*) FROM ticket_price) ticketPrices,
    (SELECT COUNT(*) FROM external_info) externalInfo
  `).get();
  assert.equal(missingDates, 0);
  assert.equal(phoneRows, 0);
  assert.equal(missingTargets, 6);
  assert.equal(memberDays, 6);
  assert.equal(followerSummaries, 10);
  assert.deepEqual(emptySyntheticTables, { audiences: 0, strategies: 0, ticketPrices: 0, externalInfo: 0 });
});

test('completed project totals match the source order workbooks and exclude complimentary tickets', () => {
  const rows = db.prepare(`
    SELECT p.project_name name,
      SUM(CASE WHEN o.is_complimentary = 0 THEN o.total_tickets ELSE 0 END) paidTickets,
      SUM(CASE WHEN o.is_complimentary = 1 THEN o.total_tickets ELSE 0 END) complimentaryTickets,
      ROUND(SUM(o.total_face_amount), 2) revenue
    FROM project_ledger p JOIN order_detail o ON o.project_id = p.id
    WHERE p.id <= 6 GROUP BY p.id ORDER BY p.id
  `).all();
  assert.deepEqual(rows.map(({ paidTickets, complimentaryTickets, revenue }) => ({ paidTickets, complimentaryTickets, revenue })), [
    { paidTickets: 2206, complimentaryTickets: 176, revenue: 1495930.6 },
    { paidTickets: 2040, complimentaryTickets: 360, revenue: 1106526 },
    { paidTickets: 1953, complimentaryTickets: 296, revenue: 1252046.15 },
    { paidTickets: 2907, complimentaryTickets: 575, revenue: 1676518 },
    { paidTickets: 856, complimentaryTickets: 124, revenue: 215877 },
    { paidTickets: 931, complimentaryTickets: 91, revenue: 327293 },
  ]);
});

test('active project opening dates, targets and channel totals match the daily ticket source', () => {
  const rows = db.prepare(`
    SELECT p.project_name name, p.show_time showTime, p.promotion_start_date openingDate,
      p.expected_ticket_count expectedTickets, p.forecast_retail_revenue estimatedRevenue,
      SUM(o.total_tickets) soldTickets, ROUND(SUM(o.total_face_amount), 2) revenue,
      ROUND(SUM(o.organizer_revenue), 2) polyRevenue,
      ROUND(SUM(o.damai_revenue), 2) damaiRevenue,
      ROUND(SUM(o.other_revenue), 2) otherRevenue
    FROM project_ledger p JOIN order_detail o ON o.project_id = p.id
    WHERE p.project_name LIKE '%秦腔经典专场%' OR p.project_name = '《灵笼》动画视听音乐会'
    GROUP BY p.id ORDER BY p.show_time
  `).all();
  assert.deepEqual(rows, [
    { name: '秦腔绝技“主角”同款《秦腔经典专场》巡回演出', showTime: '2026-09-06 19:30', openingDate: '2026-08-08', expectedTickets: 540, estimatedRevenue: 100000, soldTickets: 118, revenue: 24170, polyRevenue: 7254, damaiRevenue: 12282, otherRevenue: 4634 },
    { name: '《灵笼》动画视听音乐会', showTime: '2026-10-24 19:30', openingDate: '2026-08-11', expectedTickets: 640, estimatedRevenue: 250000, soldTickets: 43, revenue: 9440, polyRevenue: 2824, damaiRevenue: 5678, otherRevenue: 938 },
  ]);
});

test('invalid parameters use stable JSON errors', async () => {
  const invalidDate = await get('/api/dashboard/summary?start=not-a-date');
  assert.equal(invalidDate.response.status, 400);
  assert.ok(invalidDate.body.error.message);
  const missingShow = await get('/api/shows/999');
  assert.equal(missingShow.response.status, 404);
});
