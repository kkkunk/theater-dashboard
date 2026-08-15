import { channels, round } from './query-utils.js';

export function listShows(db, query = {}) {
  const conditions = [];
  const params = [];
  if (query.type) { conditions.push('p.performance_type = ?'); params.push(query.type); }
  if (query.search) { conditions.push('p.project_name LIKE ?'); params.push(`%${query.search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`
    SELECT p.id, p.project_name name, p.performance_type type, p.show_time showTime,
      p.troupe_name troupe, p.venue, p.douban_score doubanScore,
      ROUND(COALESCE(o.revenue, 0), 0) revenue, COALESCE(o.soldTickets, 0) soldTickets, t.capacity,
      ROUND(100.0 * COALESCE(o.soldTickets, 0) / t.capacity, 1) occupancyRate,
      p.expected_ticket_count expectedTickets,
      ROUND(100.0 * COALESCE(o.soldTickets, 0) / NULLIF(p.expected_ticket_count, 0), 1) salesCompletionRate
    FROM project_ledger p
    LEFT JOIN (SELECT project_id, SUM(total_face_amount) revenue,
      SUM(CASE WHEN is_complimentary = 0 THEN total_tickets ELSE 0 END) soldTickets
      FROM order_detail GROUP BY project_id) o ON o.project_id = p.id
    LEFT JOIN (SELECT project_id, SUM(issued_count) capacity FROM ticket_price GROUP BY project_id) t ON t.project_id = p.id
    ${where} ORDER BY p.show_time
  `).all(...params);
}

export function getShowDetail(db, id) {
  const show = db.prepare(`
    SELECT p.*,
      ROUND(o.revenue, 0) revenue, o.sold_tickets soldTickets, o.complimentary_tickets complimentaryTickets, o.orders,
      p.expected_ticket_count expectedTickets,
      CASE WHEN p.expected_ticket_count IS NULL THEN NULL ELSE MAX(p.expected_ticket_count - o.sold_tickets, 0) END remainingGoal,
      ROUND(100.0 * o.sold_tickets / NULLIF(p.expected_ticket_count, 0), 1) salesCompletionRate,
      COALESCE(p.forecast_retail_revenue, p.target_revenue) estimatedRevenue,
      ROUND(100.0 * o.revenue / NULLIF(COALESCE(p.forecast_retail_revenue, p.target_revenue), 0), 1) boxOfficeCompletionRate,
      t.capacity, t.remaining, ROUND(100.0 * o.sold_tickets / NULLIF(t.capacity, 0), 1) occupancyRate
    FROM project_ledger p
    JOIN (SELECT project_id, SUM(total_face_amount) revenue,
      SUM(CASE WHEN is_complimentary = 0 THEN total_tickets ELSE 0 END) sold_tickets,
      SUM(CASE WHEN is_complimentary = 1 THEN total_tickets ELSE 0 END) complimentary_tickets,
      SUM(CASE WHEN is_complimentary = 0 THEN COALESCE(source_order_count, 0) ELSE 0 END) orders FROM order_detail GROUP BY project_id) o ON o.project_id = p.id
    LEFT JOIN (SELECT project_id, SUM(issued_count) capacity, SUM(remaining_count) remaining FROM ticket_price GROUP BY project_id) t ON t.project_id = p.id
    WHERE p.id = ?
  `).get(id);
  if (!show) return null;

  const timeline = db.prepare(`
    WITH RECURSIVE dates(day) AS (
      SELECT promotion_start_date FROM project_ledger WHERE id = ?
      UNION ALL SELECT date(day, '+1 day') FROM dates
      WHERE day < (SELECT CASE
        WHEN date(show_time) < (SELECT MAX(metric_date) FROM media_daily WHERE project_id = ?)
          THEN date(show_time)
        ELSE (SELECT MAX(metric_date) FROM media_daily WHERE project_id = ?)
      END FROM project_ledger WHERE id = ?)
    ), sales AS (
      SELECT order_date day, SUM(total_face_amount) revenue,
        SUM(CASE WHEN is_complimentary = 0 THEN total_tickets ELSE 0 END) tickets
      FROM order_detail WHERE project_id = ? GROUP BY order_date
    ), media AS (
      SELECT metric_date day,
        wechat_content_count + xiaohongshu_content_count + weibo_content_count + video_content_count + douyin_content_count media_volume
      FROM media_daily WHERE project_id = ?
    )
    SELECT dates.day date, COALESCE(sales.revenue, 0) revenue,
      SUM(COALESCE(sales.revenue, 0)) OVER (ORDER BY dates.day) cumulativeRevenue,
      COALESCE(sales.tickets, 0) tickets, media.media_volume mediaVolume
    FROM dates LEFT JOIN sales ON sales.day = dates.day LEFT JOIN media ON media.day = dates.day
  `).all(id, id, id, id, id, id);

  const strategyEvents = db.prepare(`SELECT id, strategy_start startDate, strategy_end endDate, strategy_category category, strategy_type type, strategy_cost cost, impact_amount impactAmount, CASE WHEN strategy_cost = 0 THEN NULL ELSE ROUND(impact_amount / strategy_cost, 2) END roi, strategy_effect effect FROM promotion_strategy WHERE project_id = ? ORDER BY strategy_start`).all(id);
  const channelSelect = channels.map(([name, column]) => `SELECT '${name}' channel, SUM(${column}) revenue FROM order_detail WHERE project_id = ?`).join(' UNION ALL ');
  const channelRows = db.prepare(`SELECT channel, revenue FROM (${channelSelect}) WHERE revenue > 0 ORDER BY revenue DESC`).all(...channels.map(() => id));
  const channelTotal = channelRows.reduce((sum, item) => sum + item.revenue, 0);
  const channelBreakdown = channelRows.map((item) => ({ ...item, sharePct: round(item.revenue / channelTotal * 100, 1) }));
  const period = {
    firstDay: round(show.first_day_revenue, 0), firstWeek: round(show.first_week_revenue, 0),
    middle: round(show.mid_revenue, 0), lastWeek: round(show.last_week_revenue, 0), lastDay: round(show.last_day_revenue, 0),
  };
  return { show, timeline, strategyEvents, channelBreakdown, period };
}
