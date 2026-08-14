import { initDb, getDb } from './schema.js';

const REPORT_DATE = '2026-08-13';
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
  { name: '《你好，疯子！》', troupe: '数据文件未提供', director: '', actor: '', type: '戏剧', subtype: '话剧', ip: '舞台作品', subject: '现实', theme: '人性', style: '戏剧', mood: '张力', venue: '剧场', time: '2024-11-09 19:30', occupancy: 1, media: .35, conversion: 1, score: 0, raters: 0, capacity: 2558, compRate: 176 / 2558, actualRevenue: 1495930.60 },
  { name: '音乐剧《芝加哥》', troupe: '数据文件未提供', director: '', actor: '', type: '音乐剧', subtype: '音乐剧', ip: '经典音乐剧', subject: '都市', theme: '欲望', style: '百老汇', mood: '热烈', venue: '剧场', time: '2025-05-04 19:30', occupancy: 1, media: 1.15, conversion: 1, score: 0, raters: 0, capacity: 2760, compRate: 360 / 2760, actualRevenue: 1106526 },
  { name: '《温暖的味道》', troupe: '数据文件未提供', director: '', actor: '', type: '戏剧', subtype: '话剧', ip: '现实题材', subject: '乡村', theme: '温暖', style: '现实', mood: '温暖', venue: '剧场', time: '2025-06-28 19:30', occupancy: 1, media: .4, conversion: 1, score: 0, raters: 0, capacity: 2545, compRate: 296 / 2545, actualRevenue: 1252046.15 },
  { name: '杨丽萍作品《孔雀》', troupe: '数据文件未提供', director: '杨丽萍', actor: '', type: '舞剧', subtype: '舞剧', ip: '原创IP', subject: '民族', theme: '生命', style: '民族', mood: '唯美', venue: '剧场', time: '2025-12-13 19:30', occupancy: 1, media: 1.3, conversion: 1, score: 0, raters: 0, capacity: 4055, compRate: 575 / 4055, actualRevenue: 1675750 },
  { name: '话剧《雷雨》', troupe: '数据文件未提供', director: '', actor: '', type: '戏剧', subtype: '话剧', ip: '文学经典', subject: '现实主义', theme: '家庭', style: '经典', mood: '压抑', venue: '剧场', time: '2026-05-10 19:30', occupancy: 1, media: .8, conversion: 1, score: 0, raters: 0, capacity: 1104, compRate: 124 / 1104, actualRevenue: 215877 },
  { name: '吕思清小提琴音乐会', troupe: '数据文件未提供', director: '', actor: '吕思清', type: '音乐会', subtype: '音乐会', ip: '艺术家项目', subject: '古典', theme: '音乐', style: '古典', mood: '典雅', venue: '剧场', time: '2026-07-04 19:30', occupancy: 1, media: .55, conversion: 1, score: 0, raters: 0, capacity: 1113, compRate: 91 / 1113, actualRevenue: 327293 },
  {
    name: '秦腔绝技“主角”同款《秦腔经典专场》巡回演出', troupe: '租场项目', director: '', actor: '', type: '戏曲', subtype: '秦腔', ip: '传统文化', subject: '戏曲', theme: '秦腔经典', style: '传统', mood: '热烈', venue: '待补', time: '2026-09-06 19:30', promotionStart: '2026-08-08', occupancy: 118 / 540, media: .7, conversion: 1, score: 0, raters: 0, capacity: 540, expectedTickets: 540, estimatedRevenue: 100000, compRate: 0, actualRevenue: 24170,
    dailySales: [
      ['2026-08-08', [29, 4888], [29, 5702], [9, 2254]], ['2026-08-09', [6, 1316], [4, 784], [5, 1330]],
      ['2026-08-10', [0, 0], [7, 1582], [3, 658]], ['2026-08-11', [1, 196], [5, 980], [1, 266]],
      ['2026-08-12', [2, 462], [8, 1918], [0, 0]], ['2026-08-13', [2, 392], [6, 1316], [1, 126]],
    ],
    mediaSummary: [
      ['公众号', '2026-08-03', '2026-08-09', 186765, 186829, 644, 2],
      ['小红书', '2026-08-06', '2026-08-08', 12332, 12332, 27, 4],
      ['微博', '2026-08-03', '2026-08-09', 13723, 13720, 15, 2],
      ['视频号', '2026-08-06', '2026-08-08', 3356, 3356, 45, 2],
      ['抖音', '2026-08-06', '2026-08-08', 7156, 7156, 6, 2],
    ],
  },
  {
    name: '《灵笼》动画视听音乐会', troupe: '租场项目', director: '', actor: '', type: '音乐会', subtype: '动画视听音乐会', ip: '动画IP', subject: '科幻', theme: '灵笼', style: '视听音乐会', mood: '沉浸', venue: '待补', time: '2026-10-24 19:30', promotionStart: '2026-08-11', occupancy: 43 / 640, media: 1.05, conversion: 1, score: 0, raters: 0, capacity: 640, expectedTickets: 640, estimatedRevenue: 250000, compRate: 0, actualRevenue: 9440,
    dailySales: [
      ['2026-08-11', [9, 2324], [20, 3900], [3, 938]], ['2026-08-12', [5, 500], [4, 920], [0, 0]],
      ['2026-08-13', [0, 0], [2, 858], [0, 0]],
    ],
  },
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

function buildTierTemplate(capacity) {
  const shares = [.07, .13, .2, .24, .22];
  const prices = [880, 680, 480, 280, 180, 100];
  let allocated = 0;
  return prices.map((price, index) => {
    const issued = index === prices.length - 1 ? capacity - allocated : Math.round(capacity * shares[index]);
    allocated += issued;
    return [`${index + 1}等票`, price, issued];
  });
}

const channelWeights = [
  ['organizer_revenue', .46], ['damai_revenue', .44], ['other_revenue', .10],
];

const db = initDb(getDb());

db.exec(`
  DELETE FROM media_platform_summary;
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
    forecast_retail_revenue, target_revenue
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMedia = db.prepare(`
  INSERT INTO media_daily
  (project_id, metric_date, xiaohongshu_notes, douyin_likes, wechat_posts, external_comments, follower_growth)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insertMediaSummary = db.prepare(`
  INSERT INTO media_platform_summary
  (project_id, platform, period_start, period_end, start_followers, end_followers, interactions, content_count, source_level, is_placeholder)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'summary', 0)
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
    total_face_amount, is_complimentary, first_purchase, repeat_purchase, ${channelColumns.join(', ')},
    musical_fan, drama_fan, dance_fan, children_fan, concert_fan,
    order_1_ticket, order_2_tickets, order_3_tickets, order_4plus_tickets,
    youth_orders, middle_age_orders, senior_orders,
    high_tier_orders, mid_tier_orders, low_tier_orders,
    local_city_orders, local_province_orders,
    first_day_tickets, first_day_orders, first_day_new, first_day_repeat
  ) VALUES (${Array(35).fill('?').join(', ')})
`);

const rawOrders = [];
const showState = [];

db.transaction(() => {
  shows.forEach((show, index) => {
    const showDate = show.time.slice(0, 10);
    const promotionStart = show.promotionStart || addDays(showDate, -44);
    const result = insertShow.run(
      show.name, show.name, show.troupe, show.director, show.actor, show.subtype,
      show.ip, show.venue, show.subject, show.theme, show.style, show.mood,
      '杭州临平大剧院', show.venue, show.name, show.type, show.time,
      promotionStart, show.score + .2, show.score - .2, show.score - .3,
      show.score, show.raters, show.expectedTickets || 0, null, show.estimatedRevenue || null, null,
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

    const mediaTotal = [...mediaByDate.values()].reduce((sum, value) => sum + value, 0);
    if (show.mediaSummary) {
      show.mediaSummary.forEach(([platform, periodStart, periodEnd, startFollowers, endFollowers, interactions, contentCount]) => {
        insertMediaSummary.run(projectId, platform, periodStart, periodEnd, startFollowers, endFollowers, interactions, contentCount);
      });
    } else {
      const platformMix = [['公众号', .18], ['小红书', .28], ['微博', .12], ['视频号', .16], ['抖音', .26]];
      platformMix.forEach(([platform, share], platformIndex) => {
        const startFollowers = 8000 + projectId * 600 + platformIndex * 1700;
        const growth = Math.max(0, Math.round(mediaTotal * Number(share) * .35));
        insertMediaSummary.run(projectId, platform, promotionStart, lastMetricDate, startFollowers, startFollowers + growth, Math.round(mediaTotal * Number(share) * 3.2), Math.round(mediaTotal * Number(share) / 8));
      });
    }

    const targetSold = Math.round(show.capacity * show.occupancy);
    const tiers = (tierTemplates[show.capacity] || buildTierTemplate(show.capacity)).map(([level, price, issued]) => ({ level, price, issued, sold: 0 }));
    const salesDates = [...mediaByDate.keys()].map((date) => {
      const laggedMedia = mediaByDate.get(addDays(date, -3)) || mediaByDate.get(date) || 1;
      const daysToShow = dayDiff(date, showDate);
      const launchBoost = date === promotionStart ? 22 : 0;
      const deadlineBoost = daysToShow >= 0 && daysToShow <= 7 ? (8 - daysToShow) * 6 : 0;
      return { value: date, weight: 5 + laggedMedia * show.conversion + launchBoost + deadlineBoost };
    });

    let sold = 0;
    if (show.dailySales) {
      const channelNames = ['organizer_revenue', 'damai_revenue', 'other_revenue'];
      show.dailySales.forEach(([orderDate, ...channelSales]) => channelSales.forEach(([ticketCount, revenue], channelIndex) => {
        let ticketsLeft = ticketCount;
        let revenueLeft = revenue;
        while (ticketsLeft > 0) {
          const tier = tiers.find((item) => item.issued > item.sold);
          const tickets = Math.min(ticketsLeft, tier.issued - tier.sold);
          const amount = tickets === ticketsLeft ? revenueLeft : Math.round(revenue * tickets / ticketCount * 100) / 100;
          tier.sold += tickets;
          sold += tickets;
          ticketsLeft -= tickets;
          revenueLeft = Math.round((revenueLeft - amount) * 100) / 100;
          rawOrders.push({ projectId, show, showDate, promotionStart, orderDate, tier: tier.level, price: amount / tickets, tickets, amount, channel: channelNames[channelIndex] });
        }
      }));
    }
    while (!show.dailySales && sold < targetSold) {
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
const complimentaryRemaining = new Map(shows.map((show) => [show.name, Math.round(show.capacity * (show.compRate || 0))]));

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
    const remainingComplimentary = complimentaryRemaining.get(order.show.name) || 0;
    const complimentary = remainingComplimentary >= order.tickets ? 1 : 0;
    if (complimentary) complimentaryRemaining.set(order.show.name, remainingComplimentary - order.tickets);
    const amount = complimentary ? 0 : (order.amount ?? order.price * order.tickets);
    const channel = order.channel || weightedPick(channelWeights.map(([value, weight]) => ({ value, weight })));
    const revenues = Object.fromEntries(channelColumns.map((name) => [name, name === channel ? amount : 0]));
    const type = order.show.type;
    const tierToken = order.tier.match(/\d|一|二|三|四|五|六/)?.[0] || '三';
    const tierNumber = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 }[tierToken] || Number(tierToken);
    const firstDay = order.orderDate === order.promotionStart;

    insertOrder.run(
      `ORD${String(index + 1).padStart(7, '0')}`, order.projectId, order.show.time,
      order.orderDate, customer.phone, order.tier, order.tickets, amount, complimentary, isFirst, 1 - isFirst,
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

db.transaction(() => {
  showState.forEach(({ projectId, show }) => {
    if (!show.actualRevenue) return;
    const currentRevenue = db.prepare('SELECT SUM(total_face_amount) FROM order_detail WHERE project_id = ?').pluck().get(projectId);
    if (!currentRevenue) return;
    const factor = show.actualRevenue / currentRevenue;
    db.prepare(`UPDATE order_detail SET
      total_face_amount = ROUND(total_face_amount * ?, 2),
      organizer_revenue = ROUND(organizer_revenue * ?, 2),
      damai_revenue = ROUND(damai_revenue * ?, 2),
      other_revenue = ROUND(other_revenue * ?, 2)
      WHERE project_id = ? AND is_complimentary = 0
    `).run(factor, factor, factor, factor, projectId);
    const scaledRevenue = db.prepare('SELECT SUM(total_face_amount) FROM order_detail WHERE project_id = ?').pluck().get(projectId);
    const adjustment = Math.round((show.actualRevenue - scaledRevenue) * 100) / 100;
    if (adjustment) {
      const finalOrder = db.prepare('SELECT id, organizer_revenue, damai_revenue, other_revenue FROM order_detail WHERE project_id = ? AND is_complimentary = 0 ORDER BY id DESC LIMIT 1').get(projectId);
      const channelColumn = ['organizer_revenue', 'damai_revenue', 'other_revenue'].find((column) => finalOrder[column] > 0);
      db.prepare(`UPDATE order_detail SET total_face_amount = total_face_amount + ?, ${channelColumn} = ${channelColumn} + ? WHERE id = ?`).run(adjustment, adjustment, finalOrder.id);
    }
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
