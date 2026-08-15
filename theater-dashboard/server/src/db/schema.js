import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(dirname, '..', '..', '..', 'data', 'theater.db');

let db;
let activePath;

export function getDb(dbPath = process.env.THEATER_DB_PATH || defaultDbPath) {
  if (!db || activePath !== dbPath) {
    db?.close();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    activePath = dbPath;
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function ensureColumn(database, table, definition) {
  const name = definition.trim().split(/\s+/)[0];
  const columns = database.pragma(`table_info(${table})`);
  if (!columns.some((column) => column.name === name)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

export function initDb(database = getDb()) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS project_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      standard_project_name TEXT,
      troupe_name TEXT,
      director TEXT,
      lead_actor TEXT,
      performance_subtype TEXT,
      ip_type TEXT,
      environment_type TEXT,
      subject_type TEXT,
      theme_type TEXT,
      style_type TEXT,
      mood_type TEXT,
      theater_name TEXT,
      venue TEXT,
      show_name TEXT,
      performance_type TEXT,
      show_time TEXT NOT NULL,
      promotion_start_date TEXT,
      issuable_ticket_count INTEGER,
      saleable_ticket_count INTEGER,
      wechat_promo_count INTEGER DEFAULT 0,
      xiaohongshu_notes INTEGER DEFAULT 0,
      douyin_likes INTEGER DEFAULT 0,
      ip_score REAL,
      director_douban_avg REAL,
      troupe_douban_avg REAL,
      douban_score REAL,
      douban_raters INTEGER,
      expected_ticket_count INTEGER DEFAULT 0,
      predicted_retail_revenue REAL,
      forecast_retail_revenue REAL,
      target_revenue REAL,
      ticket_source_file TEXT,
      media_source_file TEXT,
      first_day_revenue REAL DEFAULT 0,
      first_week_revenue REAL DEFAULT 0,
      mid_revenue REAL DEFAULT 0,
      last_week_revenue REAL DEFAULT 0,
      last_day_revenue REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audience (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      age_group TEXT NOT NULL CHECK (age_group IN ('青年', '中年', '老年')),
      region_type TEXT NOT NULL CHECK (region_type IN ('本市', '本省', '跨省')),
      fan_segment TEXT NOT NULL,
      first_purchase_date TEXT NOT NULL,
      lifetime_orders INTEGER DEFAULT 0,
      lifetime_amount REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS promotion_strategy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      show_name TEXT,
      strategy_start TEXT NOT NULL,
      strategy_end TEXT NOT NULL,
      strategy_category TEXT,
      strategy_type TEXT,
      strategy_detail TEXT,
      strategy_cost REAL DEFAULT 0,
      impact_amount REAL DEFAULT 0,
      strategy_effect TEXT,
      FOREIGN KEY (project_id) REFERENCES project_ledger(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ticket_price (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      theater_name TEXT,
      show_name TEXT,
      show_time TEXT NOT NULL,
      tier_level TEXT NOT NULL,
      face_price REAL NOT NULL,
      issued_count INTEGER DEFAULT 0,
      remaining_count INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES project_ledger(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_detail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      project_id INTEGER NOT NULL,
      show_time TEXT,
      order_date TEXT,
      phone TEXT,
      tier_level TEXT,
      total_tickets INTEGER DEFAULT 1,
      total_face_amount REAL DEFAULT 0,
      first_purchase INTEGER DEFAULT 0,
      repeat_purchase INTEGER DEFAULT 0,
      wechat_revenue REAL DEFAULT 0,
      app_revenue REAL DEFAULT 0,
      miniapp_revenue REAL DEFAULT 0,
      website_revenue REAL DEFAULT 0,
      douyin_revenue REAL DEFAULT 0,
      counter_revenue REAL DEFAULT 0,
      damai_revenue REAL DEFAULT 0,
      maoyan_revenue REAL DEFAULT 0,
      xiudong_revenue REAL DEFAULT 0,
      piao_star_revenue REAL DEFAULT 0,
      small_ticket_revenue REAL DEFAULT 0,
      organizer_revenue REAL DEFAULT 0,
      other_revenue REAL DEFAULT 0,
      is_complimentary INTEGER DEFAULT 0, -- 旧版兼容字段；新统计以 is_work_ticket 为准
      is_work_ticket INTEGER DEFAULT 0,
      musical_fan INTEGER DEFAULT 0,
      drama_fan INTEGER DEFAULT 0,
      dance_fan INTEGER DEFAULT 0,
      children_fan INTEGER DEFAULT 0,
      concert_fan INTEGER DEFAULT 0,
      order_1_ticket INTEGER DEFAULT 0,
      order_2_tickets INTEGER DEFAULT 0,
      order_3_tickets INTEGER DEFAULT 0,
      order_4plus_tickets INTEGER DEFAULT 0,
      youth_orders INTEGER DEFAULT 0,
      middle_age_orders INTEGER DEFAULT 0,
      senior_orders INTEGER DEFAULT 0,
      high_tier_orders INTEGER DEFAULT 0,
      mid_tier_orders INTEGER DEFAULT 0,
      low_tier_orders INTEGER DEFAULT 0,
      local_city_orders INTEGER DEFAULT 0,
      local_province_orders INTEGER DEFAULT 0,
      first_day_tickets INTEGER DEFAULT 0,
      first_day_orders INTEGER DEFAULT 0,
      first_day_new INTEGER DEFAULT 0,
      first_day_repeat INTEGER DEFAULT 0,
      source_order_count INTEGER,
      FOREIGN KEY (project_id) REFERENCES project_ledger(id) ON DELETE CASCADE,
      FOREIGN KEY (phone) REFERENCES audience(phone)
    );

    CREATE TABLE IF NOT EXISTS media_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      metric_date TEXT NOT NULL,
      xiaohongshu_notes INTEGER DEFAULT 0,
      douyin_likes INTEGER DEFAULT 0,
      wechat_posts INTEGER DEFAULT 0,
      external_comments INTEGER DEFAULT 0,
      follower_growth INTEGER DEFAULT 0,
      wechat_content_count INTEGER DEFAULT 0,
      xiaohongshu_content_count INTEGER DEFAULT 0,
      weibo_content_count INTEGER DEFAULT 0,
      video_content_count INTEGER DEFAULT 0,
      douyin_content_count INTEGER DEFAULT 0,
      interaction_count INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      UNIQUE(project_id, metric_date),
      FOREIGN KEY (project_id) REFERENCES project_ledger(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS external_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT,
      content TEXT,
      comment_count INTEGER DEFAULT 0,
      source_url TEXT,
      source_site TEXT,
      publish_date TEXT,
      FOREIGN KEY (project_id) REFERENCES project_ledger(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS member_growth_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stat_date TEXT NOT NULL UNIQUE,
      new_members INTEGER NOT NULL DEFAULT 0,
      total_members INTEGER
    );

    CREATE TABLE IF NOT EXISTS media_platform_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      start_followers INTEGER,
      end_followers INTEGER,
      interactions INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      content_count INTEGER DEFAULT 0,
      source_level TEXT DEFAULT 'summary',
      is_placeholder INTEGER DEFAULT 0,
      UNIQUE(project_id, platform, period_start, period_end),
      FOREIGN KEY (project_id) REFERENCES project_ledger(id) ON DELETE CASCADE
    );

  `);

  // Non-destructive migrations for databases created by v0.1.
  ensureColumn(database, 'project_ledger', 'promotion_start_date TEXT');
  ensureColumn(database, 'project_ledger', 'expected_ticket_count INTEGER DEFAULT 0');
  ensureColumn(database, 'project_ledger', 'issuable_ticket_count INTEGER');
  ensureColumn(database, 'project_ledger', 'saleable_ticket_count INTEGER');
  ensureColumn(database, 'media_daily', 'follower_growth INTEGER DEFAULT 0');
  ensureColumn(database, 'order_detail', 'order_date TEXT');
  ensureColumn(database, 'order_detail', 'tier_level TEXT');
  ensureColumn(database, 'order_detail', 'other_revenue REAL DEFAULT 0');
  ensureColumn(database, 'order_detail', 'is_complimentary INTEGER DEFAULT 0');
  ensureColumn(database, 'order_detail', 'is_work_ticket INTEGER DEFAULT 0');
  ensureColumn(database, 'project_ledger', 'target_revenue REAL');
  ensureColumn(database, 'project_ledger', 'ticket_source_file TEXT');
  ensureColumn(database, 'project_ledger', 'media_source_file TEXT');
  ensureColumn(database, 'order_detail', 'source_order_count INTEGER');
  ensureColumn(database, 'media_daily', 'wechat_content_count INTEGER DEFAULT 0');
  ensureColumn(database, 'media_daily', 'xiaohongshu_content_count INTEGER DEFAULT 0');
  ensureColumn(database, 'media_daily', 'weibo_content_count INTEGER DEFAULT 0');
  ensureColumn(database, 'media_daily', 'video_content_count INTEGER DEFAULT 0');
  ensureColumn(database, 'media_daily', 'douyin_content_count INTEGER DEFAULT 0');
  ensureColumn(database, 'media_daily', 'interaction_count INTEGER DEFAULT 0');
  ensureColumn(database, 'media_daily', 'view_count INTEGER DEFAULT 0');
  ensureColumn(database, 'member_growth_daily', 'total_members INTEGER');
  ensureColumn(database, 'media_platform_summary', 'views INTEGER DEFAULT 0');

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_order_project_date ON order_detail(project_id, order_date);
    CREATE INDEX IF NOT EXISTS idx_order_date ON order_detail(order_date);
    CREATE INDEX IF NOT EXISTS idx_order_phone ON order_detail(phone);
    CREATE INDEX IF NOT EXISTS idx_media_project_date ON media_daily(project_id, metric_date);
    CREATE INDEX IF NOT EXISTS idx_strategy_project ON promotion_strategy(project_id);
    CREATE INDEX IF NOT EXISTS idx_member_growth_date ON member_growth_daily(stat_date);
    CREATE INDEX IF NOT EXISTS idx_media_summary_period ON media_platform_summary(period_start, period_end);
  `);

  return database;
}

export function closeDb() {
  db?.close();
  db = undefined;
  activePath = undefined;
}

export { defaultDbPath };
