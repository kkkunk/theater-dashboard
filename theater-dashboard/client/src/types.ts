export type Metric = { value: number; changePct: number | null; unit?: string; available?: boolean };
export type DateRange = { start: string; end: string; days: number };
export type Summary = {
  range: DateRange;
  metrics: {
    totalRevenue: Metric;
    complimentaryTickets: Metric;
    occupancyRate: Metric;
    salesCompletionRate: Metric;
    boxOfficeCompletionRate: Metric;
    mediaVolume: Metric;
    mediaFollowerGrowth: Metric;
    mediaInteractions: Metric;
  };
};
export type TrendRow = { date: string; revenue: number; tickets: number; orders: number; mediaVolume: number | null };
export type Trends = { range: DateRange; platform: string; rows: TrendRow[] };
export type ChannelRow = { channel: string; revenue: number; sharePct: number; orders?: number; showCount?: number; averageRevenuePerShow?: number };
export type Channels = { range: DateRange; rows: ChannelRow[] };
export type Operations = {
  range: DateRange;
  grain: 'day' | 'week' | 'month';
  rows: Array<{
    periodStart: string; periodEnd: string; totalTickets: number; complimentaryTickets: number; totalRevenue: number;
    totalPublicity: number | null; mediaFollowerGrowth: number | null;
  }>;
};
export type ShowCard = {
  id: number; name: string; type: string; showTime: string; venue: string;
  revenue: number; soldTickets: number; capacity: number | null; occupancyRate: number | null; mediaVolume: number;
  expectedTickets: number | null; salesCompletionRate: number | null;
  complimentaryTickets: number; estimatedRevenue: number | null; boxOfficeCompletionRate: number | null;
};
export type Alert = { projectId: number; level: 'high' | 'medium' | 'low'; type: string; message: string };
export type MediaPlatforms = { range: DateRange; rows: Array<{ platform: string; followerGrowth: number | null; followerDataPoints: number; interactions: number; views: number; contentCount: number; sharePct: number }> };
export type StrategyEvent = {
  id: number; startDate: string; endDate: string; category: string; type: string;
  cost: number; impactAmount: number; roi: number | null; effect: string;
};
export type ShowDetail = {
  show: Record<string, string | number | null> & {
    id: number; project_name: string; troupe_name: string; director: string; lead_actor: string;
    performance_type: string; show_time: string; venue: string; douban_score: number | null;
    revenue: number; soldTickets: number; capacity: number | null; occupancyRate: number | null;
    expectedTickets: number | null; remainingGoal: number | null; salesCompletionRate: number | null;
    estimatedRevenue: number | null; boxOfficeCompletionRate: number | null;
  };
  timeline: Array<{
    date: string; revenue: number; cumulativeRevenue: number; tickets: number;
    mediaVolume: number | null;
  }>;
  strategyEvents: StrategyEvent[];
  channelBreakdown: ChannelRow[];
  period: { firstDay: number; firstWeek: number; middle: number; lastWeek: number; lastDay: number };
};
export type StrategyReview = {
  rows: Array<{ strategyType: string; category: string; usageCount: number; showCount: number; totalCost: number; impactAmount: number; roi: number | null }>;
  bestPractices: Array<{ projectId: number; showName: string; showType: string; strategyMix: string; totalCost: number; impactAmount: number; roi: number }>;
};
export type AgentResult = {
  answer: string;
  visualization: { type: string; rows: Array<Record<string, string | number | null>> };
  meta: { intent: string; mode: string; range?: DateRange };
};
