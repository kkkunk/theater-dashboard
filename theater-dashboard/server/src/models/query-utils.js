const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveDateRange(db, query = {}) {
  const latest = db.prepare(`
    SELECT MAX(value) FROM (
      SELECT MAX(order_date) AS value FROM order_detail
      UNION ALL SELECT MAX(metric_date) FROM media_daily
    )
  `).pluck().get();
  const allScope = query.scope === 'all';
  const earliest = allScope ? db.prepare(`
    SELECT MIN(value) FROM (
      SELECT MIN(order_date) AS value FROM order_detail
      UNION ALL SELECT MIN(metric_date) AS value FROM media_daily
    )
  `).pluck().get() : null;
  const end = query.end || latest;
  const days = Math.min(Math.max(Number.parseInt(query.days, 10) || 30, 1), 365);
  const start = query.start || (allScope ? earliest : db.prepare("SELECT date(?, ?)").pluck().get(end, `-${days - 1} days`));
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
    const error = new Error('日期参数无效，请使用 YYYY-MM-DD，且 start 不得晚于 end。');
    error.status = 400;
    throw error;
  }
  const resolvedDays = allScope ? Math.floor((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) + 1 : days;
  return { start, end, days: resolvedDays };
}

export function round(value, digits = 2) {
  if (value == null) return 0;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

export const channels = [
  ['保利', 'organizer_revenue'], ['大麦', 'damai_revenue'], ['其他', 'other_revenue'],
];

export function channelRevenueSql(alias = 'o') {
  return channels.map(([, column]) => `COALESCE(${alias}.${column}, 0)`).join(' + ');
}
