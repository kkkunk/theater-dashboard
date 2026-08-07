const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveDateRange(db, query = {}) {
  const latest = db.prepare(`
    SELECT MAX(value) FROM (
      SELECT MAX(order_date) AS value FROM order_detail
      UNION ALL SELECT MAX(metric_date) FROM media_daily
    )
  `).pluck().get();
  const end = query.end || latest;
  const days = Math.min(Math.max(Number.parseInt(query.days, 10) || 30, 1), 365);
  const start = query.start || db.prepare("SELECT date(?, ?)").pluck().get(end, `-${days - 1} days`);
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
    const error = new Error('日期参数无效，请使用 YYYY-MM-DD，且 start 不得晚于 end。');
    error.status = 400;
    throw error;
  }
  return { start, end, days };
}

export function round(value, digits = 2) {
  if (value == null) return 0;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

export const channels = [
  ['大麦', 'damai_revenue'], ['猫眼', 'maoyan_revenue'], ['公众号', 'wechat_revenue'],
  ['抖音', 'douyin_revenue'], ['小程序', 'miniapp_revenue'], ['App', 'app_revenue'],
  ['网站', 'website_revenue'], ['窗口', 'counter_revenue'], ['秀动', 'xiudong_revenue'],
  ['票星球', 'piao_star_revenue'], ['小票点', 'small_ticket_revenue'], ['主办', 'organizer_revenue'],
];

export function channelRevenueSql(alias = 'o') {
  return channels.map(([, column]) => `COALESCE(${alias}.${column}, 0)`).join(' + ');
}
