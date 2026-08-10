import { initDb, getDb } from './schema.js';

const REPORT_DATE = '2026-08-08';
const DAY = 86_400_000;

function rngFactory(seed = 20260807) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = rngFactory();
const randomInt = (min, max) => Math.floor(rng() * (max - min + 1)) + min;
const pick = (items) => items[Math.floor(rng() * items.length)];
const dateOnly = (value) => new Date(value).toISOString().slice(0, 10);
const addDays = (date, days) => dateOnly(new Date(`${date}T00:00:00Z`).getTime() + days * DAY);
const dayDiff = (start, end) => Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / DAY);

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * total;
  for (const entry of entries) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.value;
  }
  return entries.at(-1).value;
}

const shows = [
  { name: '法语原版音乐剧《巴黎圣母院》', troupe: '法国巴特兰剧团', director: '吕克·普拉蒙东', actor: '伊莲·赛加拉', type: '音乐剧', subtype: '音乐剧', ip: '经典名著改编', subject: '文学', theme: '爱情与命运', style: '经典', mood: '震撼', venue: '大剧场', time: '2026-06-14 19:30', occupancy: .94, media: 1.25, conversion: 1.25, score: 9.3, raters: 28500, capacity: 1800, pred: 1450000, forecast: 1580000 },
  { name: '话剧《雷雨》经典版', troupe: '北京人民艺术剧院', director: '曹禺', actor: '濮存昕', type: '戏剧', subtype: '话剧', ip: '文学经典', subject: '现实主义', theme: '家庭伦理', style: '写实', mood: '压抑', venue: '中剧场', time: '2026-06-22 19:30', occupancy: .84, media: .65, conversion: 1.18, score: 8.9, raters: 15200, capacity: 1200, pred: 760000, forecast: 820000 },
  { name: '杨丽萍导演作品《孔雀》', troupe: '云南杨丽萍文化传播', director: '杨丽萍', actor: '杨丽萍', type: '舞剧', subtype: '舞剧', ip: '原创IP', subject: '民族', theme: '自然之美', style: '民族', mood: '唯美', venue: '大剧场', time: '2026-07-05 19:30', occupancy: .91, media: 1.1, conversion: 1.2, score: 8.7, raters: 12300, capacity: 1800, pred: 1280000, forecast: 1420000 },
  { name: '童话音乐剧《小王子》', troupe: '上海儿童艺术剧院', director: '陈薪伊', actor: '刘畅', type: '儿童剧', subtype: '儿童剧', ip: '世界经典童话', subject: '童话', theme: '成长与爱', style: '奇幻', mood: '温暖', venue: '小剧场', time: '2026-07-12 15:00', occupancy: .62, media: 1.5, conversion: .52, score: 9.0, raters: 9800, capacity: 800, pred: 420000, forecast: 500000, anomaly: '高声量低转化' },
  { name: '维也纳宫廷乐团音乐会', troupe: '维也纳宫廷乐团', director: '约翰·施特劳斯', actor: '', type: '音乐会', subtype: '音乐会', ip: '经典曲目', subject: '古典', theme: '经典', style: '优雅', mood: '庄重', venue: '大剧场', time: '2026-07-20 19:30', occupancy: .88, media: .48, conversion: 1.42, score: 8.4, raters: 4200, capacity: 1800, pred: 1350000, forecast: 1480000 },
  { name: '悬疑话剧《无人生还》', troupe: '上海话剧艺术中心', director: '林奕', actor: '何念', type: '戏剧', subtype: '话剧', ip: '阿加莎经典', subject: '悬疑', theme: '人性拷问', style: '悬疑', mood: '紧张', venue: '中剧场', time: '2026-08-10 19:30', occupancy: .86, media: .95, conversion: 1.08, score: 9.1, raters: 21000, capacity: 1200, pred: 820000, forecast: 900000 },
  { name: '昆曲《牡丹亭》全本', troupe: '江苏省昆剧院', director: '白先勇', actor: '单雯', type: '戏曲', subtype: '昆曲', ip: '古典文学', subject: '古典', theme: '爱情', style: '古典', mood: '缠绵', venue: '中剧场', time: '2026-08-15 19:30', occupancy: .55, media: .35, conversion: .8, score: 9.2, raters: 6800, capacity: 1200, pred: 520000, forecast: 580000, anomaly: '上座率偏低' },
  { name: '音乐剧《粉丝来信》中文版', troupe: '上海文化广场', director: '高瑞嘉', actor: '徐均朔', type: '音乐剧', subtype: '音乐剧', ip: '韩国原创IP', subject: '文艺', theme: '梦想与回忆', style: '文艺', mood: '感动', venue: '大剧场', time: '2026-08-20 19:30', occupancy: .97, media: 1.65, conversion: 1.35, score: 8.6, raters: 18500, capacity: 1800, pred: 1480000, forecast: 1650000 },
  { name: '现代舞剧《春之祭》', troupe: '北京当代芭蕾舞团', director: '王媛媛', actor: '王亚彬', type: '舞剧', subtype: '现代舞', ip: '原创IP', subject: '现代', theme: '生命与轮回', style: '先锋', mood: '震撼', venue: '大剧场', time: '2026-08-25 19:30', occupancy: .48, media: 1.2, conversion: .42, score: 7.9, raters: 3200, capacity: 1800, pred: 950000, forecast: 1080000, anomaly: '高声量低转化' },
  { name: '开心麻花《夏洛特烦恼》', troupe: '开心麻花', director: '闫非', actor: '沈腾', type: '综艺', subtype: '舞台剧', ip: '电影IP改编', subject: '喜剧', theme: '青春', style: '搞笑', mood: '开心', venue: '大剧场', time: '2026-08-30 19:30', occupancy: .92, media: 1.3, conversion: 1.22, score: 8.5, raters: 32000, capacity: 1800, pred: 1380000, forecast: 1520000 },
];

const tierTemplates = {
  1800: [
    ['一等票', 880, 120], ['二等票', 680, 240], ['三等票', 480, 360],
    ['四等票', 380, 420], ['五等票', 280, 420], ['六等票', 180, 240],
  ],
  1200: [
    ['一等票', 680, 100], ['二等票', 580, 180], ['三等票', 380, 260],
    ['四等票', 280, 360], ['五等票', 180, 300],
  ],
  800: [
    ['一等票', 480, 80], ['二等票', 380, 140], ['三等票', 280, 220],
    ['四等票', 180, 360],
  ],
};

const channelWeights = [
  ['damai_revenue', .30], ['maoyan_revenue', .20], ['wechat_revenue', .11],
  ['douyin_revenue', .09], ['miniapp_revenue', .08], ['app_revenue', .06],
  ['website_revenue', .04], ['counter_revenue', .04], ['xiudong_revenue', .025],
  ['piao_star_revenue', .025], ['small_ticket_revenue', .02], ['organizer_revenue', .02],
];

const db = initDb(getDb());

db.exec(`
  DELETE FROM media_daily;
  DELETE FROM external_info;
  DELETE FROM member_growth_daily;
  DELETE FROM order_detail;
  DELETE FROM audience;
  DELETE FROM promotion_strategy;
  DELETE FROM ticket_price;
  DELETE FROM project_ledger;
  DELETE FROM sqlite_sequence;
`);

const insertShow = db.prepare(`
  INSERT INTO project_ledger (
    project_name, standard_project_name, troupe_name, director, lead_actor,
    performance_subtype, ip_type, environment_type, subject_type, theme_type,
    style_type, mood_type, theater_name, venue, show_name, performance_type,
    show_time, promotion_start_date, ip_score, director_douban_avg,
    troupe_douban_avg, douban_score, douban_raters, expected_ticket_count, predicted_retail_revenue,
    forecast_retail_revenue
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMedia = db.prepare(`
  INSERT INTO media_daily
  (project_id, metric_date, xiaohongshu_notes, douyin_likes, wechat_posts, external_comments, follower_growth)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertPrice = db.prepare(`
  INSERT INTO ticket_price
  (project_id, theater_name, show_name, show_time, tier_level, face_price, issued_count, remaining_count)
  VALUES (?, '杭州临平大剧院', ?, ?, ?, ?, ?, ?)
`);
const insertStrategy = db.prepare(`
  INSERT INTO promotion_strategy
  (project_id, show_name, strategy_start, strategy_end, strategy_category, strategy_type,
   strategy_detail, strategy_cost, impact_amount, strategy_effect)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertExternal = db.prepare(`
  INSERT INTO external_info
  (project_id, title, content, comment_count, source_url, source_site, publish_date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertAudience = db.prepare(`
  INSERT INTO audience
  (phone, age_group, region_type, fan_segment, first_purchase_date, lifetime_orders, lifetime_amount)
  VALUES (?, ?, ?, ?, ?, 0, 0)
`);
const updateAudience = db.prepare(`
  UPDATE audience SET lifetime_orders = lifetime_orders + 1, lifetime_amount = lifetime_amount + ?
  WHERE phone = ?
`);

const channelColumns = channelWeights.map(([name]) => name);
const insertOrder = db.prepare(`
  INSERT INTO order_detail (
    order_no, project_id, show_time, order_date, phone, tier_level, total_tickets,
    total_face_amount, first_purchase, repeat_purchase, ${channelColumns.join(', ')},
    musical_fan, drama_fan, dance_fan, children_fan, concert_fan,
    order_1_ticket, order_2_tickets, order_3_tickets, order_4plus_tickets,
    youth_orders, middle_age_orders, senior_orders,
    high_tier_orders, mid_tier_orders, low_tier_orders,
    local_city_orders, local_province_orders,
    first_day_tickets, first_day_orders, first_day_new, first_day_repeat
  ) VALUES (${Array(43).fill('?').join(', ')})
`);

const rawOrders = [];
const showState = [];

db.transaction(() => {
  shows.forEach((show, index) => {
    const showDate = show.time.slice(0, 10);
    const promotionStart = addDays(showDate, -44);
    const result = insertShow.run(
      show.name, show.name, show.troupe, show.director, show.actor, show.subtype,
      show.ip, show.venue, show.subject, show.theme, show.style, show.mood,
      '杭州临平大剧院', show.venue, show.name, show.type, show.time,
      promotionStart, show.score + .2, show.score - .2, show.score - .3,
      show.score, show.raters, Math.round(show.capacity * .9), show.pred, show.forecast,
    );
    const projectId = Number(result.lastInsertRowid);
    const lastMetricDate = showDate < REPORT_DATE ? showDate : REPORT_DATE;
    const mediaByDate = new Map();

    for (let date = promotionStart; date <= lastMetricDate; date = addDays(date, 1)) {
      const offset = dayDiff(promotionStart, date);
      const launchPulse = offset < 3 ? 1.7 : 1;
      const campaignPulse = [10, 11, 24, 25, 34].includes(offset) ? 2.8 : 1;
      const xhs = Math.max(0, Math.round((2 + rng() * 5) * show.media * launchPulse * campaignPulse));
      const douyin = Math.max(0, Math.round((450 + rng() * 1300) * show.media * launchPulse * campaignPulse));
      const wechat = (offset % 9 === 0 || offset === 24) ? randomInt(1, 2) : 0;
      const comments = Math.round((8 + rng() * 45) * show.media * campaignPulse);
      const followerGrowth = Math.max(0, Math.round(1 + xhs * .35 + douyin / 900 + comments * .08 + wechat * 2));
      insertMedia.run(projectId, date, xhs, douyin, wechat, comments, followerGrowth);
      mediaByDate.set(date, xhs + douyin / 250 + wechat * 8 + comments / 5);
    }

    const targetSold = Math.round(show.capacity * show.occupancy);
    const tiers = tierTemplates[show.capacity].map(([level, price, issued]) => ({ level, price, issued, sold: 0 }));
    const salesDates = [...mediaByDate.keys()].map((date) => {
      const laggedMedia = mediaByDate.get(addDays(date, -3)) || mediaByDate.get(date) || 1;
      const daysToShow = dayDiff(date, showDate);
      const launchBoost = date === promotionStart ? 22 : 0;
      const deadlineBoost = daysToShow >= 0 && daysToShow <= 7 ? (8 - daysToShow) * 6 : 0;
      return { value: date, weight: 5 + laggedMedia * show.conversion + launchBoost + deadlineBoost };
    });

    let sold = 0;
    while (sold < targetSold) {
      const requested = weightedPick([
        { value: 1, weight: .52 }, { value: 2, weight: .34 },
        { value: 3, weight: .1 }, { value: 4, weight: .04 },
      ]);
      const tickets = Math.min(requested, targetSold - sold);
      const availableTiers = tiers.filter((tier) => tier.issued - tier.sold >= tickets);
      const tier = weightedPick(availableTiers.map((item, tierIndex) => ({ value: item, weight: 7 - tierIndex })));
      tier.sold += tickets;
      sold += tickets;
      rawOrders.push({
        projectId, show, showDate, promotionStart, orderDate: weightedPick(salesDates),
        tier: tier.level, price: tier.price, tickets,
      });
    }

    tiers.forEach((tier) => insertPrice.run(
      projectId, show.name, show.time, tier.level, tier.price, tier.issued, tier.issued - tier.sold,
    ));

    const strategies = [
      ['新媒体投放', '小红书达人种草', 5800, Math.round(32000 * show.conversion), '良好', 10],
      ['票务促销', '早鸟限时折扣', 2500, Math.round(42000 * show.conversion), '优秀', 24],
      ['社群运营', '粉丝社群裂变', 1800, Math.round(21000 * show.conversion), '良好', 34],
    ];
    if (show.anomaly === '高声量低转化') {
      strategies[0] = ['新媒体投放', '抖音达人矩阵', 18000, 9000, '未达预期', 10];
    }
    strategies.forEach(([category, type, cost, impact, effect, offset]) => {
      insertStrategy.run(projectId, show.name, addDays(promotionStart, offset), addDays(promotionStart, offset + 6), category, type, `${type}｜${show.name}`, cost, impact, effect);
    });

    for (let itemIndex = 0; itemIndex < 6; itemIndex += 1) {
      const source = pick(['小红书', '抖音', '公众号', '豆瓣', '微博']);
      const publishDate = addDays(promotionStart, 5 + itemIndex * 6);
      insertExternal.run(projectId, `${show.name}｜${source}内容 ${itemIndex + 1}`, `关于${show.name}的宣发及观演讨论。`, randomInt(12, 240), `https://example.com/${projectId}/${itemIndex}`, source, publishDate);
    }

    showState.push({ projectId, show, promotionStart, tiers });
  });
})();

rawOrders.sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.projectId - b.projectId);

const customers = [];
let phoneSequence = 13_800_000_000;
const getLifetimeOrders = db.prepare('SELECT lifetime_orders FROM audience WHERE phone = ?').pluck();
const ageChoices = [{ value: '青年', weight: .48 }, { value: '中年', weight: .37 }, { value: '老年', weight: .15 }];
const regionChoices = [{ value: '本市', weight: .56 }, { value: '本省', weight: .25 }, { value: '跨省', weight: .19 }];

db.transaction(() => {
  rawOrders.forEach((order, index) => {
    const canRepeat = customers.length > 30 && rng() < .41;
    let customer;
    if (canRepeat) {
      customer = pick(customers);
    } else {
      const phone = String(phoneSequence++);
      const age = weightedPick(ageChoices);
      const region = weightedPick(regionChoices);
      const segmentMap = { 音乐剧: '剧迷', 戏剧: '话剧爱好者', 舞剧: '舞蹈爱好者', 儿童剧: '亲子家庭', 音乐会: '古典乐迷', 戏曲: '传统文化爱好者', 综艺: '大众观众' };
      customer = { phone, age, region, fan: segmentMap[order.show.type] || '大众观众' };
      insertAudience.run(phone, age, region, customer.fan, order.orderDate);
      customers.push(customer);
    }

    const isFirst = getLifetimeOrders.get(customer.phone) === 0 ? 1 : 0;
    const amount = order.price * order.tickets;
    const channel = weightedPick(channelWeights.map(([value, weight]) => ({ value, weight })));
    const revenues = Object.fromEntries(channelColumns.map((name) => [name, name === channel ? amount : 0]));
    const type = order.show.type;
    const tierToken = order.tier.match(/\d|一|二|三|四|五|六/)?.[0] || '三';
    const tierNumber = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }[tierToken] || Number(tierToken);
    const firstDay = order.orderDate === order.promotionStart;

    insertOrder.run(
      `ORD${String(index + 1).padStart(7, '0')}`, order.projectId, order.show.time,
      order.orderDate, customer.phone, order.tier, order.tickets, amount, isFirst, 1 - isFirst,
      ...channelColumns.map((name) => revenues[name]),
      type === '音乐剧' ? 1 : 0, type === '戏剧' ? 1 : 0, type === '舞剧' ? 1 : 0,
      type === '儿童剧' ? 1 : 0, type === '音乐会' ? 1 : 0,
      order.tickets === 1 ? 1 : 0, order.tickets === 2 ? 1 : 0,
      order.tickets === 3 ? 1 : 0, order.tickets >= 4 ? 1 : 0,
      customer.age === '青年' ? 1 : 0, customer.age === '中年' ? 1 : 0,
      customer.age === '老年' ? 1 : 0,
      tierNumber <= 2 ? 1 : 0, tierNumber > 2 && tierNumber <= 4 ? 1 : 0,
      tierNumber > 4 ? 1 : 0,
      customer.region === '本市' ? 1 : 0, customer.region === '本省' ? 1 : 0,
      firstDay ? order.tickets : 0, firstDay ? 1 : 0,
      firstDay && isFirst ? 1 : 0, firstDay && !isFirst ? 1 : 0,
    );
    updateAudience.run(amount, customer.phone);
  });
})();

const insertMemberGrowth = db.prepare(`
  INSERT INTO member_growth_daily (stat_date, new_members) VALUES (?, ?)
`);
const dailyNewOrders = db.prepare('SELECT COALESCE(SUM(first_purchase), 0) FROM order_detail WHERE order_date = ?').pluck();
const dailyPublicity = db.prepare(`
  SELECT COALESCE(SUM(xiaohongshu_notes + douyin_likes / 100.0 + wechat_posts + external_comments), 0)
  FROM media_daily WHERE metric_date = ?
`).pluck();

db.transaction(() => {
  const startDate = addDays(REPORT_DATE, -89);
  for (let date = startDate; date <= REPORT_DATE; date = addDays(date, 1)) {
    const newOrders = dailyNewOrders.get(date);
    const publicity = dailyPublicity.get(date);
    const baseline = 3 + dayDiff(startDate, date) % 5;
    insertMemberGrowth.run(date, Math.max(0, Math.round(baseline + newOrders * .45 + publicity * .015)));
  }
})();

const updateShow = db.prepare(`
  UPDATE project_ledger SET
    wechat_promo_count = (SELECT SUM(wechat_posts) FROM media_daily WHERE project_id = ?),
    xiaohongshu_notes = (SELECT SUM(xiaohongshu_notes) FROM media_daily WHERE project_id = ?),
    douyin_likes = (SELECT SUM(douyin_likes) FROM media_daily WHERE project_id = ?),
    first_day_revenue = ?, first_week_revenue = ?, mid_revenue = ?,
    last_week_revenue = ?, last_day_revenue = ?
  WHERE id = ?
`);

db.transaction(() => {
  showState.forEach(({ projectId, show, promotionStart }) => {
    const rows = db.prepare('SELECT order_date, total_face_amount FROM order_detail WHERE project_id = ?').all(projectId);
    const showDate = show.time.slice(0, 10);
    const sum = (predicate) => rows.filter(predicate).reduce((total, row) => total + row.total_face_amount, 0);
    const firstDay = sum((row) => row.order_date === promotionStart);
    const firstWeek = sum((row) => dayDiff(promotionStart, row.order_date) >= 0 && dayDiff(promotionStart, row.order_date) <= 6);
    const lastWeek = sum((row) => dayDiff(row.order_date, showDate) >= 0 && dayDiff(row.order_date, showDate) <= 7);
    const lastDay = sum((row) => row.order_date === showDate);
    const total = rows.reduce((value, row) => value + row.total_face_amount, 0);
    const mid = total - firstWeek - lastWeek;
    updateShow.run(projectId, projectId, projectId, firstDay, firstWeek, mid, lastWeek, lastDay, projectId);
  });
})();

const counts = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM project_ledger) AS shows,
    (SELECT COUNT(*) FROM audience) AS audiences,
    (SELECT COUNT(*) FROM order_detail) AS orders,
    (SELECT SUM(total_tickets) FROM order_detail) AS tickets,
    (SELECT COUNT(*) FROM media_daily) AS media_days,
    (SELECT COUNT(*) FROM member_growth_daily) AS member_days
`).get();

console.log(`Seed complete: ${counts.shows} shows, ${counts.audiences} audiences, ${counts.orders} orders, ${counts.tickets} tickets, ${counts.media_days} media-day rows, ${counts.member_days} member-day rows.`);
