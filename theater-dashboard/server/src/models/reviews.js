import { channels, resolveDateRange, round } from './query-utils.js';

export function getChannelReview(db, query) {
  const range = resolveDateRange(db, query);
  const unions = channels.map(([name, column]) => `
    SELECT '${name}' channel, SUM(o.${column}) revenue,
      SUM(CASE WHEN o.${column} > 0 THEN 1 ELSE 0 END) orders,
      COUNT(DISTINCT CASE WHEN o.${column} > 0 THEN o.project_id END) showCount
    FROM order_detail o JOIN project_ledger p ON p.id = o.project_id
    WHERE o.order_date BETWEEN ? AND ? ${query.type ? 'AND p.performance_type = ?' : ''}
  `).join(' UNION ALL ');
  const params = channels.flatMap(() => query.type ? [range.start, range.end, query.type] : [range.start, range.end]);
  const rows = db.prepare(`SELECT * FROM (${unions}) WHERE revenue > 0 ORDER BY revenue DESC`).all(...params)
    .map((row) => ({ ...row, revenue: round(row.revenue, 0), averageRevenuePerShow: round(row.revenue / row.showCount, 0) }));
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  return { range, rows: rows.map((row) => ({ ...row, sharePct: round(row.revenue / total * 100, 1) })) };
}

export function getStrategyReview(db, query) {
  const conditions = [];
  const params = [];
  if (query.type) { conditions.push('p.performance_type = ?'); params.push(query.type); }
  if (query.start) { conditions.push('s.strategy_start >= ?'); params.push(query.start); }
  if (query.end) { conditions.push('s.strategy_start <= ?'); params.push(query.end); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT s.strategy_type strategyType, s.strategy_category category,
      COUNT(*) usageCount, COUNT(DISTINCT s.project_id) showCount,
      SUM(s.strategy_cost) totalCost, SUM(s.impact_amount) impactAmount,
      CASE WHEN SUM(s.strategy_cost) = 0 THEN NULL ELSE ROUND(SUM(s.impact_amount) / SUM(s.strategy_cost), 2) END roi
    FROM promotion_strategy s JOIN project_ledger p ON p.id = s.project_id
    ${where} GROUP BY s.strategy_type, s.strategy_category ORDER BY roi DESC
  `).all(...params);
  const bestPractices = db.prepare(`
    SELECT p.id projectId, p.project_name showName, p.performance_type showType,
      GROUP_CONCAT(s.strategy_type, ' + ') strategyMix,
      SUM(s.strategy_cost) totalCost, SUM(s.impact_amount) impactAmount,
      ROUND(SUM(s.impact_amount) / NULLIF(SUM(s.strategy_cost), 0), 2) roi
    FROM promotion_strategy s JOIN project_ledger p ON p.id = s.project_id
    GROUP BY p.id ORDER BY roi DESC LIMIT 5
  `).all();
  return { rows, bestPractices };
}
