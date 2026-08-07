import { channels, resolveDateRange, round } from './query-utils.js';

function periodMetrics(db, start, end) {
  return db.prepare(`
    WITH active_projects AS (
      SELECT DISTINCT project_id FROM order_detail WHERE order_date BETWEEN ? AND ?
    ), capacity AS (
      SELECT COALESCE(SUM(issued_count), 0) value FROM ticket_price
      WHERE project_id IN (SELECT project_id FROM active_projects)
    )
    SELECT
      COALESCE(SUM(o.total_face_amount), 0) AS revenue,
      COALESCE(SUM(o.total_tickets), 0) AS sold_tickets,
      COUNT(o.id) AS orders,
      COALESCE(SUM(o.repeat_purchase), 0) AS repeat_orders,
      (SELECT value FROM capacity) AS capacity
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
  const media = db.prepare(`
    SELECT COALESCE(SUM(xiaohongshu_notes + wechat_posts + external_comments) + SUM(douyin_likes) / 100.0, 0) AS volume
    FROM media_daily WHERE metric_date BETWEEN ? AND ?
  `).pluck().get(range.start, range.end);
  const previousMedia = db.prepare(`
    SELECT COALESCE(SUM(xiaohongshu_notes + wechat_posts + external_comments) + SUM(douyin_likes) / 100.0, 0)
    FROM media_daily WHERE metric_date BETWEEN ? AND ?
  `).pluck().get(previousStart, previousEnd);

  const repeatRate = current.orders ? current.repeat_orders / current.orders * 100 : 0;
  const previousRepeatRate = previous.orders ? previous.repeat_orders / previous.orders * 100 : 0;
  const occupancy = current.capacity ? current.sold_tickets / current.capacity * 100 : 0;
  const previousOccupancy = previous.capacity ? previous.sold_tickets / previous.capacity * 100 : 0;
  return {
    range,
    metrics: {
      totalRevenue: { value: round(current.revenue, 0), changePct: change(current.revenue, previous.revenue) },
      occupancyRate: { value: round(occupancy, 1), changePct: round(occupancy - previousOccupancy, 1), unit: 'percentage_point' },
      repeatPurchaseRate: { value: round(repeatRate, 1), changePct: round(repeatRate - previousRepeatRate, 1), unit: 'percentage_point' },
      mediaVolume: { value: round(media, 0), changePct: change(media, previousMedia) },
    },
  };
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
      SELECT order_date day, SUM(total_face_amount) revenue, SUM(total_tickets) tickets, COUNT(*) orders
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

export function getAudience(db, query) {
  const range = resolveDateRange(db, query);
  const baseParams = [range.start, range.end];
  const dimensions = {
    age: [['青年', 'youth_orders'], ['中年', 'middle_age_orders'], ['老年', 'senior_orders']],
    region: [['本市', 'local_city_orders'], ['本省', 'local_province_orders'], ['跨省', '1 - local_city_orders - local_province_orders']],
    segment: [['剧迷', 'musical_fan'], ['话剧爱好者', 'drama_fan'], ['舞蹈爱好者', 'dance_fan'], ['亲子家庭', 'children_fan'], ['古典乐迷', 'concert_fan'], ['其他受众', '1 - musical_fan - drama_fan - dance_fan - children_fan - concert_fan']],
  };
  const result = {};
  for (const [key, entries] of Object.entries(dimensions)) {
    const rows = entries.map(([name, expression]) => ({
      name,
      value: db.prepare(`SELECT COALESCE(SUM(${expression}), 0) FROM order_detail WHERE order_date BETWEEN ? AND ?`).pluck().get(...baseParams),
    }));
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    result[key] = rows.map((row) => ({ ...row, sharePct: total ? round(row.value / total * 100, 1) : 0 }));
  }
  const loyalty = db.prepare(`SELECT SUM(first_purchase) newOrders, SUM(repeat_purchase) repeatOrders FROM order_detail WHERE order_date BETWEEN ? AND ?`).get(...baseParams);
  return { range, ...result, loyalty };
}

export function getShowCards(db) {
  return db.prepare(`
    SELECT p.id, p.project_name name, p.performance_type type, p.show_time showTime,
      p.venue, ROUND(SUM(o.total_face_amount), 0) revenue,
      SUM(o.total_tickets) soldTickets, SUM(t.issued_count) capacity,
      ROUND(100.0 * SUM(o.total_tickets) / SUM(t.issued_count), 1) occupancyRate,
      p.xiaohongshu_notes + p.douyin_likes / 100.0 + p.wechat_promo_count AS mediaVolume
    FROM project_ledger p
    JOIN (SELECT project_id, SUM(total_face_amount) total_face_amount, SUM(total_tickets) total_tickets FROM order_detail GROUP BY project_id) o ON o.project_id = p.id
    JOIN (SELECT project_id, SUM(issued_count) issued_count FROM ticket_price GROUP BY project_id) t ON t.project_id = p.id
    GROUP BY p.id ORDER BY p.show_time
  `).all();
}

export function getAlerts(db) {
  const shows = getShowCards(db);
  return shows.flatMap((show) => {
    const alerts = [];
    if (show.occupancyRate < 60) alerts.push({ projectId: show.id, level: 'high', type: 'low_occupancy', message: `${show.name}上座率仅 ${show.occupancyRate}%` });
    if (show.mediaVolume > 700 && show.occupancyRate < 70) alerts.push({ projectId: show.id, level: 'high', type: 'high_media_low_conversion', message: `${show.name}声量较高但票房转化偏低` });
    return alerts;
  });
}
