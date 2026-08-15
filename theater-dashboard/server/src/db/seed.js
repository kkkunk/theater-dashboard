import fs from 'node:fs';
import { initDb, getDb } from './schema.js';

const verified = JSON.parse(fs.readFileSync(new URL('./verified-data.json', import.meta.url), 'utf8'));
const db = initDb(getDb());
const DAY = 86_400_000;

function dayDiff(start, end) {
  return Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / DAY);
}

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

const insertProject = db.prepare(`
  INSERT INTO project_ledger (
    project_name, standard_project_name, troupe_name, director, lead_actor,
    performance_subtype, theater_name, venue, show_name, performance_type,
    show_time, promotion_start_date, expected_ticket_count,
    forecast_retail_revenue, ticket_source_file, media_source_file
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertOrder = db.prepare(`
  INSERT INTO order_detail (
    order_no, project_id, show_time, order_date, phone, tier_level,
    total_tickets, total_face_amount, is_complimentary,
    organizer_revenue, damai_revenue, other_revenue, source_order_count
  ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMedia = db.prepare(`
  INSERT INTO media_daily (
    project_id, metric_date, xiaohongshu_notes, douyin_likes, wechat_posts,
    external_comments, follower_growth, wechat_content_count,
    xiaohongshu_content_count, weibo_content_count, video_content_count,
    douyin_content_count, interaction_count, view_count
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMediaSummary = db.prepare(`
  INSERT INTO media_platform_summary (
    project_id, platform, period_start, period_end, start_followers,
    end_followers, interactions, views, content_count, source_level, is_placeholder
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified_summary', 0)
`);

const updateProjectStats = db.prepare(`
  UPDATE project_ledger SET
    wechat_promo_count = ?, xiaohongshu_notes = ?, douyin_likes = ?,
    first_day_revenue = ?, first_week_revenue = ?, mid_revenue = ?,
    last_week_revenue = ?, last_day_revenue = ?
  WHERE id = ?
`);

const platformContentColumn = {
  公众号: 'wechat_content_count',
  小红书: 'xiaohongshu_content_count',
  微博: 'weibo_content_count',
  视频号: 'video_content_count',
  抖音: 'douyin_content_count',
};

const projectIds = new Map();

db.transaction(() => {
  verified.projects.forEach((project) => {
    const result = insertProject.run(
      project.name,
      project.name,
      project.troupe,
      project.director,
      project.actor,
      project.type,
      '杭州临平大剧院',
      '杭州临平大剧院',
      project.shortName,
      project.type,
      project.showTime,
      project.openingDate,
      project.expectedTickets ?? null,
      project.estimatedRevenue ?? null,
      project.ticketSource,
      project.mediaSource,
    );
    const projectId = Number(result.lastInsertRowid);
    projectIds.set(project.key, projectId);

    project.ticketGroups.forEach((group, index) => {
      const revenue = Number(group.revenue || 0);
      const channelRevenue = { 保利: [revenue, 0, 0], 大麦: [0, revenue, 0], 其他: [0, 0, revenue] }[group.channel] || [0, 0, revenue];
      insertOrder.run(
        `SRC-${String(projectId).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`,
        projectId,
        project.showTime,
        group.date,
        group.tickets,
        revenue,
        group.complimentary ? 1 : 0,
        ...channelRevenue,
        group.sourceOrders ?? group.orders ?? null,
      );
    });

    project.mediaPlatforms.forEach((platform) => {
      if (!platform.periodStart || !platform.periodEnd) return;
      insertMediaSummary.run(
        projectId,
        platform.platform,
        platform.periodStart,
        platform.periodEnd,
        platform.startFollowers,
        platform.endFollowers,
        platform.interactions ?? 0,
        platform.views ?? 0,
        platform.contentCount ?? 0,
      );
    });

    const mediaByDate = new Map();
    for (const item of project.mediaDaily) {
      const row = mediaByDate.get(item.date) || {
        metric_date: item.date,
        wechat_content_count: 0,
        xiaohongshu_content_count: 0,
        weibo_content_count: 0,
        video_content_count: 0,
        douyin_content_count: 0,
        interaction_count: 0,
        view_count: 0,
        follower_growth: 0,
      };
      row[platformContentColumn[item.platform]] += item.contentCount || 0;
      row.interaction_count += item.interactions || 0;
      row.view_count += item.views || 0;
      mediaByDate.set(item.date, row);
    }
    for (const platform of project.mediaPlatforms) {
      if (platform.startFollowers == null || platform.endFollowers == null || !platform.periodEnd) continue;
      const row = mediaByDate.get(platform.periodEnd) || {
        metric_date: platform.periodEnd,
        wechat_content_count: 0,
        xiaohongshu_content_count: 0,
        weibo_content_count: 0,
        video_content_count: 0,
        douyin_content_count: 0,
        interaction_count: 0,
        view_count: 0,
        follower_growth: 0,
      };
      row.follower_growth += platform.endFollowers - platform.startFollowers;
      mediaByDate.set(platform.periodEnd, row);
    }
    for (const row of mediaByDate.values()) {
      insertMedia.run(
        projectId,
        row.metric_date,
        row.xiaohongshu_content_count,
        0,
        row.wechat_content_count,
        row.interaction_count,
        row.follower_growth,
        row.wechat_content_count,
        row.xiaohongshu_content_count,
        row.weibo_content_count,
        row.video_content_count,
        row.douyin_content_count,
        row.interaction_count,
        row.view_count,
      );
    }

    const paidGroups = project.ticketGroups.filter((group) => !group.complimentary);
    const totalRevenue = paidGroups.reduce((sum, group) => sum + Number(group.revenue || 0), 0);
    const showDate = project.showTime.slice(0, 10);
    const firstDay = paidGroups.filter((group) => group.date === project.openingDate).reduce((sum, group) => sum + Number(group.revenue || 0), 0);
    const firstWeek = paidGroups.filter((group) => dayDiff(project.openingDate, group.date) >= 0 && dayDiff(project.openingDate, group.date) <= 6).reduce((sum, group) => sum + Number(group.revenue || 0), 0);
    const lastWeek = paidGroups.filter((group) => dayDiff(group.date, showDate) >= 0 && dayDiff(group.date, showDate) <= 6).reduce((sum, group) => sum + Number(group.revenue || 0), 0);
    const lastDay = paidGroups.filter((group) => group.date === showDate).reduce((sum, group) => sum + Number(group.revenue || 0), 0);
    const middle = Math.max(0, totalRevenue - firstWeek - lastWeek);
    const wechatCount = project.mediaDaily.filter((item) => item.platform === '公众号').reduce((sum, item) => sum + item.contentCount, 0);
    const xhsCount = project.mediaDaily.filter((item) => item.platform === '小红书').reduce((sum, item) => sum + item.contentCount, 0);
    const douyinInteractions = project.mediaDaily.filter((item) => item.platform === '抖音').reduce((sum, item) => sum + item.interactions, 0);
    updateProjectStats.run(wechatCount, xhsCount, douyinInteractions, firstDay, firstWeek, middle, lastWeek, lastDay, projectId);
  });

  const insertMember = db.prepare('INSERT INTO member_growth_daily (stat_date, new_members, total_members) VALUES (?, ?, ?)');
  verified.memberGrowth.forEach((row) => insertMember.run(row.date, row.newMembers, row.totalMembers));
})();

const counts = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM project_ledger) projects,
    (SELECT COUNT(*) FROM order_detail) order_groups,
    (SELECT COUNT(*) FROM audience) audiences,
    (SELECT COUNT(*) FROM promotion_strategy) strategies,
    (SELECT COUNT(*) FROM ticket_price) ticket_prices,
    (SELECT COUNT(*) FROM media_daily) media_days,
    (SELECT COUNT(*) FROM media_platform_summary) media_summaries,
    (SELECT COUNT(*) FROM member_growth_daily) member_days
`).get();

console.log(`Verified-only seed complete: ${JSON.stringify(counts)}`);
