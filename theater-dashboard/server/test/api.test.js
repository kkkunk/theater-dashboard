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
  assert.equal(detail.body.data.show.expectedTickets, 1700);
  assert.equal(detail.body.data.show.salesCompletionRate, 129.8);
  assert.equal(detail.body.data.show.capacity, 2526);
  assert.equal(detail.body.data.show.saleableTickets, 2376);
  assert.equal(detail.body.data.show.workTickets, 176);
  assert.equal(detail.body.data.show.totalIssuedTickets, 2382);
  assert.equal(detail.body.data.show.occupancyRate, 94.3);
  assert.equal(detail.body.data.audience, undefined);
  assert.ok(detail.body.data.period);
});

test('active show detail exposes time progress and sales pace', async () => {
  const detail = await get('/api/shows/7');
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.data.show.dataAsOfDate, '2026-08-13');
  assert.equal(detail.body.data.show.salesElapsedDays, 5);
  assert.equal(detail.body.data.show.daysToShow, 24);
  assert.equal(detail.body.data.show.timeProgressRate, 17.2);
  assert.equal(detail.body.data.show.salesProgressGap, 4.7);
  assert.equal(detail.body.data.show.salesPaceStatus, 'ahead');
});

test('operations master table separates work tickets and exposes total issued tickets', async () => {
  const result = await get('/api/dashboard/operations?days=30&grain=week');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.grain, 'week');
  assert.ok(result.body.data.rows.length >= 4);
  for (const row of result.body.data.rows) {
    assert.equal(typeof row.totalTickets, 'number');
    assert.equal(typeof row.totalRevenue, 'number');
    assert.ok(row.totalPublicity == null || typeof row.totalPublicity === 'number');
    assert.equal(typeof row.workTickets, 'number');
    assert.equal(row.totalIssuedTickets, row.totalTickets + row.workTickets);
    assert.ok(row.mediaFollowerGrowth == null || typeof row.mediaFollowerGrowth === 'number');
  }
});

test('completion rates only compare projects that have verified targets', async () => {
  const result = await get('/api/dashboard/summary?days=365');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.metrics.salesCompletionRate.value, 89.3);
  assert.equal(result.body.data.metrics.boxOfficeCompletionRate.value, 97.5);
  assert.equal(result.body.data.metrics.occupancyRate.value, 89.7);
});

test('completion rates use cumulative actuals through the selected end date', async () => {
  const result = await get('/api/dashboard/summary?start=2025-12-13&end=2025-12-13');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.metrics.salesCompletionRate.value, 118.7);
  assert.equal(result.body.data.metrics.boxOfficeCompletionRate.value, 124.2);
  assert.equal(result.body.data.metrics.occupancyRate.value, 90.5);
  assert.equal(result.body.data.metrics.workTickets.value, 575);
  assert.equal(result.body.data.metrics.totalIssuedTickets.value, 3482);
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
  const missingCapacities = db.prepare('SELECT COUNT(*) FROM project_ledger WHERE issuable_ticket_count IS NULL').pluck().get();
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
  assert.equal(missingTargets, 0);
  assert.equal(missingCapacities, 2);
  assert.equal(memberDays, 6);
  assert.equal(followerSummaries, 10);
  assert.deepEqual(emptySyntheticTables, { audiences: 0, strategies: 0, ticketPrices: 0, externalInfo: 0 });
});

test('zero-value tickets are work tickets, excluded from sales and included in total issued tickets', () => {
  const rows = db.prepare(`
    SELECT p.project_name name,
      SUM(CASE WHEN o.is_work_ticket = 0 THEN o.total_tickets ELSE 0 END) paidTickets,
      SUM(CASE WHEN o.is_work_ticket = 1 THEN o.total_tickets ELSE 0 END) workTickets,
      SUM(o.total_tickets) totalIssuedTickets,
      ROUND(SUM(o.total_face_amount), 2) revenue
    FROM project_ledger p JOIN order_detail o ON o.project_id = p.id
    WHERE p.id <= 6 GROUP BY p.id ORDER BY p.id
  `).all();
  assert.deepEqual(rows.map(({ paidTickets, workTickets, totalIssuedTickets, revenue }) => ({ paidTickets, workTickets, totalIssuedTickets, revenue })), [
    { paidTickets: 2206, workTickets: 176, totalIssuedTickets: 2382, revenue: 1495930.6 },
    { paidTickets: 2040, workTickets: 360, totalIssuedTickets: 2400, revenue: 1106526 },
    { paidTickets: 1953, workTickets: 296, totalIssuedTickets: 2249, revenue: 1252046.15 },
    { paidTickets: 2907, workTickets: 575, totalIssuedTickets: 3482, revenue: 1676518 },
    { paidTickets: 856, workTickets: 124, totalIssuedTickets: 980, revenue: 215877 },
    { paidTickets: 931, workTickets: 91, totalIssuedTickets: 1022, revenue: 327293 },
  ]);
});

test('completed projects expose verified capacity and target values', () => {
  const rows = db.prepare(`
    SELECT issuable_ticket_count issuable, saleable_ticket_count saleable,
      expected_ticket_count expected, forecast_retail_revenue target
    FROM project_ledger WHERE id <= 6 ORDER BY id
  `).all();
  assert.deepEqual(rows, [
    { issuable: 2526, saleable: 2376, expected: 1700, target: 1200000 },
    { issuable: 2564, saleable: 2398, expected: 1500, target: 1100000 },
    { issuable: 2306, saleable: 2122, expected: 1700, target: 1200000 },
    { issuable: 3846, saleable: 3564, expected: 2450, target: 1350000 },
    { issuable: 1153, saleable: 912, expected: 600, target: 200000 },
    { issuable: 1294, saleable: 1254, expected: 1208, target: 410000 },
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
