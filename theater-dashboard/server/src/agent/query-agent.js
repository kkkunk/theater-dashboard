import { resolveDateRange, round } from '../models/query-utils.js';

function result(answer, chartType, rows, meta = {}) {
  return { answer, visualization: { type: chartType, rows }, meta: { mode: 'controlled-template', ...meta } };
}

export function answerQuestion(db, question, query = {}) {
  const text = question.trim();
  if (!text) {
    const error = new Error('question 不能为空。');
    error.status = 400;
    throw error;
  }
  const range = resolveDateRange(db, query);

  if (/票房.*(最高|排名|前\s*\d)|最高.*票房/.test(text)) {
    const limit = Math.min(Number(text.match(/前\s*(\d+)/)?.[1] || 5), 10);
    const rows = db.prepare(`
      SELECT p.id projectId, p.project_name showName, ROUND(SUM(o.total_face_amount), 0) revenue
      FROM order_detail o JOIN project_ledger p ON p.id = o.project_id
      WHERE o.order_date BETWEEN ? AND ? GROUP BY p.id ORDER BY revenue DESC LIMIT ?
    `).all(range.start, range.end, limit);
    return result(`${range.start} 至 ${range.end} 票房最高的是${rows[0]?.showName || '暂无数据'}，票房 ¥${(rows[0]?.revenue || 0).toLocaleString('zh-CN')}。`, 'bar', rows, { intent: 'revenue_ranking', range });
  }

  if (/小红书.*(前\s*\d|上座率|声量)/.test(text)) {
    const limit = Math.min(Number(text.match(/前\s*(\d+)/)?.[1] || 3), 10);
    const rows = db.prepare(`
      SELECT p.id projectId, p.project_name showName, SUM(m.xiaohongshu_notes) xiaohongshuNotes,
        ROUND(100.0 * o.sold / t.capacity, 1) occupancyRate
      FROM project_ledger p JOIN media_daily m ON m.project_id = p.id
      JOIN (SELECT project_id, SUM(total_tickets) sold FROM order_detail GROUP BY project_id) o ON o.project_id = p.id
      JOIN (SELECT project_id, SUM(issued_count) capacity FROM ticket_price GROUP BY project_id) t ON t.project_id = p.id
      WHERE m.metric_date BETWEEN ? AND ? GROUP BY p.id ORDER BY xiaohongshuNotes DESC LIMIT ?
    `).all(range.start, range.end, limit);
    return result(`已找出小红书声量前 ${rows.length} 的演出并对齐上座率。`, 'bar', rows, { intent: 'xiaohongshu_vs_occupancy', range });
  }

  if (/抖音.*(贡献|渠道|前\s*\d|最高)/.test(text)) {
    const limit = Math.min(Number(text.match(/前\s*(\d+)/)?.[1] || 5), 10);
    const rows = db.prepare(`
      SELECT p.id projectId, p.project_name showName, ROUND(SUM(o.douyin_revenue), 0) douyinRevenue
      FROM order_detail o JOIN project_ledger p ON p.id = o.project_id
      WHERE o.order_date BETWEEN ? AND ? GROUP BY p.id HAVING douyinRevenue > 0
      ORDER BY douyinRevenue DESC LIMIT ?
    `).all(range.start, range.end, limit);
    return result(`抖音渠道贡献最高的是${rows[0]?.showName || '暂无数据'}。`, 'bar', rows, { intent: 'douyin_ranking', range });
  }

  if (/(售票.*(完成率|进度).*(低于|不足))|(完成率.*(低于|不足))/.test(text)) {
    const threshold = Math.min(Number(text.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || 80), 200);
    const rows = db.prepare(`
      WITH show_rates AS (
        SELECT p.id projectId, p.project_name showName, p.expected_ticket_count expectedTickets,
          SUM(o.total_tickets) soldTickets,
          100.0 * SUM(o.total_tickets) / NULLIF(p.expected_ticket_count, 0) completionRate
        FROM order_detail o JOIN project_ledger p ON p.id = o.project_id
        GROUP BY p.id
      )
      SELECT projectId, showName, expectedTickets, soldTickets,
        ROUND(completionRate, 1) completionRate
      FROM show_rates WHERE completionRate < ? ORDER BY completionRate
    `).all(threshold);
    return result(`共有 ${rows.length} 场演出的售票完成率低于 ${threshold}%。`, 'table', rows, { intent: 'sales_completion_below_threshold', threshold });
  }

  if (/(总售票数|总宣传量|会员增长).*(分别|多少|汇总)|本月.*(售票|宣传|会员)/.test(text)) {
    let aggregateRange = range;
    if (/本月/.test(text)) {
      const latest = db.prepare(`
        SELECT MAX(day) FROM (
          SELECT MAX(order_date) day FROM order_detail
          UNION ALL SELECT MAX(metric_date) FROM media_daily
          UNION ALL SELECT MAX(stat_date) FROM member_growth_daily
        )
      `).pluck().get();
      aggregateRange = { start: `${latest.slice(0, 7)}-01`, end: latest };
    }
    const row = db.prepare(`
      SELECT
        (SELECT COALESCE(SUM(total_tickets), 0) FROM order_detail WHERE order_date BETWEEN ? AND ?) totalTickets,
        (SELECT ROUND(COALESCE(SUM(xiaohongshu_notes + douyin_likes / 100.0 + wechat_posts + external_comments), 0), 0)
          FROM media_daily WHERE metric_date BETWEEN ? AND ?) totalPublicity,
        (SELECT COALESCE(SUM(new_members), 0) FROM member_growth_daily WHERE stat_date BETWEEN ? AND ?) memberGrowth
    `).get(aggregateRange.start, aggregateRange.end, aggregateRange.start, aggregateRange.end, aggregateRange.start, aggregateRange.end);
    return result(`${aggregateRange.start} 至 ${aggregateRange.end} 共售出 ${row.totalTickets} 张票，宣传量 ${row.totalPublicity}，新增会员 ${row.memberGrowth} 人。`, 'table', [row], { intent: 'operations_summary', range: aggregateRange });
  }

  if (/策略.*(ROI|回报|效果)/i.test(text)) {
    const rows = db.prepare(`
      SELECT strategy_type strategyType, COUNT(*) usageCount,
        ROUND(SUM(impact_amount), 0) impactAmount, ROUND(SUM(strategy_cost), 0) cost,
        ROUND(SUM(impact_amount) / NULLIF(SUM(strategy_cost), 0), 2) roi
      FROM promotion_strategy GROUP BY strategy_type ORDER BY roi DESC
    `).all();
    return result(`当前 ROI 最高的策略类型是${rows[0]?.strategyType || '暂无数据'}。`, 'bubble', rows, { intent: 'strategy_roi' });
  }

  const error = new Error('当前 V1 仅支持票房排名、小红书声量与上座率、抖音渠道贡献、售票完成率、经营汇总和策略 ROI 查询。');
  error.status = 422;
  throw error;
}
