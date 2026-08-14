import { channels, resolveDateRange, round } from './query-utils.js';

function periodMetrics(db, start, end) {
  return db.prepare(`
    WITH active_projects AS (
      SELECT DISTINCT project_id FROM order_detail WHERE order_date BETWEEN ? AND ?
    ), capacity AS (
      SELECT COALESCE(SUM(issued_count), 0) value FROM ticket_price
      WHERE project_id IN (SELECT project_id FROM active_projects)
    ), target AS (
      SELECT COALESCE(SUM(expected_ticket_count), 0) value FROM project_ledger
      WHERE id IN (SELECT project_id FROM active_projects)
    ), revenue_target AS (
      SELECT COALESCE(SUM(COALESCE(forecast_retail_revenue, target_revenue)), 0) value FROM project_ledger
      WHERE id IN (SELECT project_id FROM active_projects) AND COALESCE(forecast_retail_revenue, target_revenue) IS NOT NULL
    )
    SELECT
      COALESCE(SUM(o.total_face_amount), 0) AS revenue,
      COALESCE(SUM(CASE WHEN o.is_complimentary = 0 THEN o.total_tickets ELSE 0 END), 0) AS sold_tickets,
      COALESCE(SUM(CASE WHEN o.is_complimentary = 1 THEN o.total_tickets ELSE 0 END), 0) AS complimentary_tickets,
      SUM(CASE WHEN o.is_complimentary = 0 THEN 1 ELSE 0 END) AS orders,
      (SELECT value FROM capacity) AS capacity,
      (SELECT value FROM target) AS expected_tickets,
      (SELECT value FROM revenue_target) AS estimated_revenue
    FROM order_detail o
    WHERE o.order_date BETWEEN ? AND ?
  `).get(start, end, start, end);
}

function change(current, previous) {
  if (!previous) return null;
  return round((current - previous) / previous * 100, 1);
}

export function getSummary(db, query) {
  const range = resolveDateRange(db, query);
  const duration = db.prepare('SELECT julianday(?) - julianday(?) + 1').pluck().get(range.end, range.start);
  const previousEnd = db.prepare("SELECT date(?, '-1 day')").pluck().get(range.start);
  const previousStart = db.prepare('SELECT date(?, ?)').pluck().get(previousEnd, `-${duration - 1} days`);
  const current = periodMetrics(db, range.start, range.end);
  const previous = periodMetrics(db, previousStart, previousEnd);
  const publicity = db.prepare(`
    SELECT COALESCE(SUM(xiaohongshu_notes + wechat_posts + external_comments) + SUM(douyin_likes) / 100.0, 0) AS volume
    FROM media_daily WHERE metric_date BETWEEN ? AND ?
  `).pluck().get(range.start, range.end);
  const previousPublicity = db.prepare(`
    SELECT COALESCE(SUM(xiaohongshu_notes + wechat_posts + external_comments) + SUM(douyin_likes) / 100.0, 0)
    FROM media_daily WHERE metric_date BETWEEN ? AND ?
  `).pluck().get(previousStart, previousEnd);
  const media = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN start_followers IS NOT NULL AND end_followers IS NOT NULL THEN end_followers - start_followers ELSE 0 END), 0) follower_growth,
      COALESCE(SUM(interactions), 0) interactions
    FROM media_platform_summary
    WHERE is_placeholder = 0 AND period_end >= ? AND period_start <= ?
  `).get(range.start, range.end);

  const occupancy = current.capacity ? current.sold_tickets / current.capacity * 100 : 0;
  const previousOccupancy = previous.capacity ? previous.sold_tickets / previous.capacity * 100 : 0;
  const completion = current.expected_tickets ? current.sold_tickets / current.expected_tickets * 100 : 0;
  const previousCompletion = previous.expected_tickets ? previous.sold_tickets / previous.expected_tickets * 100 : 0;
  return {
    range,
    metrics: {
      totalRevenue: { value: round(current.revenue, 0), changePct: change(current.revenue, previous.revenue) },
      complimentaryTickets: { value: current.complimentary_tickets, changePct: null },
      occupancyRate: { value: round(occupancy, 1), changePct: round(occupancy - previousOccupancy, 1), unit: 'percentage_point' },
      salesCompletionRate: { value: round(completion, 1), changePct: round(completion - previousCompletion, 1), available: Boolean(current.expected_tickets), unit: 'percentage_point' },
      boxOfficeCompletionRate: { value: current.estimated_revenue ? round(current.revenue / current.estimated_revenue * 100, 1) : 0, changePct: null, available: Boolean(current.estimated_revenue), unit: 'percentage_point' },
      mediaVolume: { value: round(publicity, 0), changePct: change(publicity, previousPublicity) },
      mediaFollowerGrowth: { value: media.follower_growth, changePct: null },
      mediaInteractions: { value: media.interactions, changePct: null },
    },
  };
}

export function getOperations(db, query) {
  const range = resolveDateRange(db, query);
  const grain = ['day', 'week', 'month'].includes(query.grain) ? query.grain : 'day';
  const groupExpression = {
    day: 'dates.day',
    week: "date(dates.day, '-' || ((CAST(strftime('%w', dates.day) AS INTEGER) + 6) % 7) || ' days')",
    month: "substr(dates.day, 1, 7) || '-01'",
  }[grain];
  const rows = db.prepare(`
    WITH RECURSIVE dates(day) AS (
      SELECT ? UNION ALL SELECT date(day, '+1 day') FROM dates WHERE day < ?
    ), sales AS (
      SELECT order_date day,
        SUM(CASE WHEN is_complimentary = 0 THEN total_tickets ELSE 0 END) tickets,
        SUM(CASE WHEN is_complimentary = 1 THEN total_tickets ELSE 0 END) complimentary_tickets,
        SUM(total_face_amount) revenue
      FROM order_detail WHERE order_date BETWEEN ? AND ? GROUP BY order_date
    ), publicity AS (
      SELECT metric_date day,
        SUM(xiaohongshu_notes + douyin_likes / 100.0 + wechat_posts + external_comments) volume
      FROM media_daily WHERE metric_date BETWEEN ? AND ? GROUP BY metric_date
    ), summary_growth AS (
      SELECT period_end day,
        SUM(CASE WHEN start_followers IS NOT NULL AND end_followers IS NOT NULL THEN end_followers - start_followers ELSE 0 END) follower_growth
      FROM media_platform_summary
      WHERE is_placeholder = 0 AND period_end BETWEEN ? AND ? GROUP BY period_end
    ), members AS (
      SELECT stat_date day, SUM(new_members) new_members
      FROM member_growth_daily WHERE stat_date BETWEEN ? AND ? GROUP BY stat_date
    ), daily AS (
      SELECT dates.day, COALESCE(sales.tickets, 0) tickets,
        COALESCE(sales.complimentary_tickets, 0) complimentary_tickets, COALESCE(sales.revenue, 0) revenue,
        COALESCE(publicity.volume, 0) publicity,
        COALESCE(summary_growth.follower_growth, 0) follower_growth,
        COALESCE(members.new_members, 0) members
      FROM dates
      LEFT JOIN sales ON sales.day = dates.day
      LEFT JOIN publicity ON publicity.day = dates.day
      LEFT JOIN summary_growth ON summary_growth.day = dates.day
      LEFT JOIN members ON members.day = dates.day
    )
    SELECT ${groupExpression} periodStart, MAX(dates.day) periodEnd,
      SUM(daily.tickets) totalTickets,
      SUM(daily.complimentary_tickets) complimentaryTickets,
      ROUND(SUM(daily.revenue), 0) totalRevenue,
      ROUND(SUM(daily.publicity), 0) totalPublicity,
      SUM(daily.follower_growth) mediaFollowerGrowth
    FROM dates JOIN daily ON daily.day = dates.day
    GROUP BY periodStart ORDER BY periodStart DESC
  `).all(range.start, range.end, range.start, range.end, range.start, range.end, range.start, range.end, range.start, range.end);
  return { range, grain, rows };
}

export function getTrends(db, query) {
  const range = resolveDateRange(db, query);
  const platform = ['all', 'xiaohongshu', 'douyin', 'wechat', 'external'].includes(query.platform) ? query.platform : 'all';
  const mediaExpression = {
    all: 'xiaohongshu_notes + douyin_likes / 100.0 + wechat_posts + external_comments',
    xiaohongshu: 'xiaohongshu_notes', douyin: 'douyin_likes',
    wechat: 'wechat_posts', external: 'external_comments',
  }[platform];
  const rows = db.prepare(`
    WITH RECURSIVE dates(day) AS (
      SELECT ? UNION ALL SELECT date(day, '+1 day') FROM dates WHERE day < ?
    ), sales AS (
      SELECT order_date day, SUM(total_face_amount) revenue,
        SUM(CASE WHEN is_complimentary = 0 THEN total_tickets ELSE 0 END) tickets,
        SUM(CASE WHEN is_complimentary = 0 THEN 1 ELSE 0 END) orders
      FROM order_detail WHERE order_date BETWEEN ? AND ? GROUP BY order_date
    ), media AS (
      SELECT metric_date day, SUM(${mediaExpression}) volume
      FROM media_daily WHERE metric_date BETWEEN ? AND ? GROUP BY metric_date
    )
    SELECT dates.day date, COALESCE(sales.revenue, 0) revenue,
      COALESCE(sales.tickets, 0) tickets, COALESCE(sales.orders, 0) orders,
      ROUND(COALESCE(media.volume, 0), 1) mediaVolume
    FROM dates LEFT JOIN sales ON sales.day = dates.day LEFT JOIN media ON media.day = dates.day
  `).all(range.start, range.end, range.start, range.end, range.start, range.end);
  return { range, platform, rows };
}

export function getChannels(db, query) {
  const range = resolveDateRange(db, query);
  const select = channels.map(([name, column]) => `SELECT '${name}' channel, SUM(${column}) revenue FROM order_detail WHERE order_date BETWEEN ? AND ?`).join(' UNION ALL ');
  const params = channels.flatMap(() => [range.start, range.end]);
  const rows = db.prepare(`SELECT channel, COALESCE(revenue, 0) revenue FROM (${select}) ORDER BY revenue DESC`).all(...params);
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  return { range, rows: rows.map((row) => ({ ...row, revenue: round(row.revenue, 0), sharePct: round(row.revenue / total * 100, 1) })) };
}

export function getMediaPlatforms(db, query) {
  const range = resolveDateRange(db, query);
  const rows = db.prepare(`
    SELECT platform,
      SUM(CASE WHEN start_followers IS NOT NULL AND end_followers IS NOT NULL THEN end_followers - start_followers ELSE 0 END) followerGrowth,
      SUM(interactions) interactions,
      SUM(content_count) contentCount
    FROM media_platform_summary
    WHERE is_placeholder = 0 AND period_end >= ? AND period_start <= ?
    GROUP BY platform ORDER BY interactions DESC
  `).all(range.start, range.end);
  const total = rows.reduce((sum, row) => sum + row.interactions, 0);
  return { range, rows: rows.map((row) => ({ ...row, sharePct: total ? round(row.interactions / total * 100, 1) : 0 })) };
}

export function getShowCards(db) {
  return db.prepare(`
    SELECT p.id, p.project_name name, p.performance_type type, p.show_time showTime,
      p.venue, ROUND(COALESCE(SUM(o.total_face_amount), 0), 0) revenue,
      COALESCE(SUM(o.total_tickets), 0) soldTickets, COALESCE(SUM(o.complimentary_tickets), 0) complimentaryTickets, SUM(t.issued_count) capacity,
      ROUND(100.0 * COALESCE(SUM(o.total_tickets), 0) / SUM(t.issued_count), 1) occupancyRate,
      p.expected_ticket_count expectedTickets,
      ROUND(100.0 * COALESCE(SUM(o.total_tickets), 0) / NULLIF(p.expected_ticket_count, 0), 1) salesCompletionRate,
      COALESCE(p.forecast_retail_revenue, p.target_revenue) estimatedRevenue,
      ROUND(100.0 * COALESCE(SUM(o.total_face_amount), 0) / NULLIF(COALESCE(p.forecast_retail_revenue, p.target_revenue), 0), 1) boxOfficeCompletionRate,
      p.xiaohongshu_notes + p.douyin_likes / 100.0 + p.wechat_promo_count AS mediaVolume
    FROM project_ledger p
    LEFT JOIN (SELECT project_id, SUM(total_face_amount) total_face_amount,
      SUM(CASE WHEN is_complimentary = 0 THEN total_tickets ELSE 0 END) total_tickets,
      SUM(CASE WHEN is_complimentary = 1 THEN total_tickets ELSE 0 END) complimentary_tickets
      FROM order_detail GROUP BY project_id) o ON o.project_id = p.id
    JOIN (SELECT project_id, SUM(issued_count) issued_count FROM ticket_price GROUP BY project_id) t ON t.project_id = p.id
    GROUP BY p.id ORDER BY p.show_time
  `).all();
}

export function getAlerts(db) {
  const shows = getShowCards(db);
  return shows.flatMap((show) => {
    const alerts = [];
    if (show.soldTickets > 0 && show.occupancyRate < 60) alerts.push({ projectId: show.id, level: show.occupancyRate < 40 ? 'high' : 'medium', type: 'low_occupancy', message: `${show.name}付费上座率仅 ${show.occupancyRate}%` });
    if (show.mediaVolume > 700 && show.salesCompletionRate != null && show.salesCompletionRate < 75) alerts.push({ projectId: show.id, level: show.salesCompletionRate < 50 ? 'high' : 'medium', type: 'high_media_low_conversion', message: `${show.name}宣传量较高，但售票完成率仅 ${show.salesCompletionRate}%` });
    const daysToShow = Math.ceil((new Date(show.showTime.slice(0, 10)) - new Date('2026-08-14')) / 86400000);
    if (daysToShow >= 0 && daysToShow <= 21) {
      const classify = (value) => value < 20 ? 'high' : value < 35 ? 'medium' : value < 50 ? 'low' : null;
      const salesLevel = show.expectedTickets ? classify(show.salesCompletionRate) : null;
      if (salesLevel) alerts.push({ projectId: show.id, level: salesLevel, type: 'sales_completion', message: `${show.name}距演出 ${daysToShow} 天，售票完成率 ${show.salesCompletionRate}%` });
      const revenueLevel = show.estimatedRevenue ? classify(show.boxOfficeCompletionRate) : null;
      if (revenueLevel) alerts.push({ projectId: show.id, level: revenueLevel, type: 'box_office_completion', message: `${show.name}距演出 ${daysToShow} 天，票房完成度 ${show.boxOfficeCompletionRate}%` });
    }
    return alerts;
  });
}
