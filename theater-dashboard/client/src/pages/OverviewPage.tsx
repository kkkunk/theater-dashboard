import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, ChevronRight, CircleGauge, Radio, Ticket, UsersRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet } from '../api';
import type { Alert, Audience, Channels, ShowCard, Summary, Trends } from '../types';
import { useShell } from '../components/AppShell';
import { useRouter } from '../router';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { Panel } from '../components/Panel';
import { Chart, chartGrid, chartText, tooltip } from '../components/Chart';
import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { dateTimeLabel, formatCurrency, formatNumber, shortDate } from '../utils/format';

const periodOptions = [30, 60, 90];
const typeColors: Record<string, string> = { 音乐剧: '#35d0ad', 戏剧: '#62a8ff', 舞剧: '#ae8bff', 儿童剧: '#f2a65a', 音乐会: '#5ed1f2', 戏曲: '#ef8aa0', 综艺: '#d6db63' };

export function OverviewPage() {
  const { openAgent } = useShell();
  const { navigate } = useRouter();
  const [days, setDays] = useState(30);
  const suffix = `?days=${days}`;
  const summary = useQuery({ queryKey: ['summary', days], queryFn: ({ signal }) => apiGet<Summary>(`/api/dashboard/summary${suffix}`, signal) });
  const trends = useQuery({ queryKey: ['trends', days], queryFn: ({ signal }) => apiGet<Trends>(`/api/dashboard/trends${suffix}`, signal) });
  const channels = useQuery({ queryKey: ['channels', days], queryFn: ({ signal }) => apiGet<Channels>(`/api/dashboard/channels${suffix}`, signal) });
  const audience = useQuery({ queryKey: ['audience', days], queryFn: ({ signal }) => apiGet<Audience>(`/api/dashboard/audience${suffix}`, signal) });
  const shows = useQuery({ queryKey: ['show-cards'], queryFn: ({ signal }) => apiGet<ShowCard[]>('/api/dashboard/shows', signal) });
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: ({ signal }) => apiGet<Alert[]>('/api/dashboard/alerts', signal) });

  const sparks = useMemo(() => {
    const rows = trends.data?.rows || [];
    const chunks = 10;
    const group = (key: 'revenue' | 'tickets' | 'orders' | 'mediaVolume') => Array.from({ length: chunks }, (_, index) => {
      const start = Math.floor(index * rows.length / chunks); const end = Math.floor((index + 1) * rows.length / chunks);
      return rows.slice(start, end).reduce((sum, row) => sum + row[key], 0);
    });
    return { revenue: group('revenue'), occupancy: group('tickets'), repeat: group('orders'), media: group('mediaVolume') };
  }, [trends.data]);

  const trendOption = useMemo(() => ({
    animationDuration: 700,
    color: ['#35d0ad', '#62a8ff'],
    tooltip: { ...tooltip, trigger: 'axis' as const, valueFormatter: (value: unknown) => formatNumber(Number(value)) },
    legend: { top: 0, right: 0, textStyle: { color: chartText }, itemWidth: 18, itemHeight: 3 },
    grid: { top: 44, left: 44, right: 48, bottom: 28 },
    xAxis: { type: 'category' as const, boundaryGap: false, data: trends.data?.rows.map((row) => shortDate(row.date)), axisLine: { lineStyle: { color: chartGrid } }, axisTick: { show: false }, axisLabel: { color: chartText, fontSize: 11, interval: Math.max(Math.floor((trends.data?.rows.length || 1) / 6) - 1, 0) } },
    yAxis: [
      { type: 'value' as const, name: '票房（元）', nameTextStyle: { color: chartText }, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => value >= 10000 ? `${value / 10000}万` : value } },
      { type: 'value' as const, name: '声量指数', nameTextStyle: { color: chartText }, splitLine: { show: false }, axisLabel: { color: chartText } },
    ],
    series: [
      { name: '日票房', type: 'line' as const, smooth: .32, symbol: 'none', data: trends.data?.rows.map((row) => row.revenue), lineStyle: { width: 2.4 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(53,208,173,.24)' }, { offset: 1, color: 'rgba(53,208,173,0)' }] } } },
      { name: '媒体声量', type: 'bar' as const, yAxisIndex: 1, barMaxWidth: 9, data: trends.data?.rows.map((row) => row.mediaVolume), itemStyle: { color: 'rgba(98,168,255,.58)', borderRadius: [3, 3, 0, 0] } },
    ],
  }), [trends.data]);

  const channelOption = useMemo(() => ({
    tooltip: { ...tooltip, trigger: 'item' as const, formatter: '{b}<br/>{c} 元 · {d}%' },
    legend: { type: 'scroll' as const, bottom: 0, textStyle: { color: chartText, fontSize: 11 }, itemWidth: 8, itemHeight: 8 },
    series: [{ type: 'pie' as const, radius: ['55%', '76%'], center: ['50%', '43%'], padAngle: 2, itemStyle: { borderRadius: 4, borderColor: '#111827', borderWidth: 2 }, label: { show: false }, data: channels.data?.rows.slice(0, 8).map((row) => ({ name: row.channel, value: row.revenue })) }],
  }), [channels.data]);

  const audienceOption = useMemo(() => ({
    color: ['#35d0ad', '#62a8ff', '#ae8bff'],
    tooltip: { ...tooltip, trigger: 'item' as const, formatter: '{b}<br/>{c} 单 · {d}%' },
    legend: { bottom: 0, textStyle: { color: chartText, fontSize: 11 }, itemWidth: 8, itemHeight: 8 },
    series: [{ type: 'pie' as const, radius: ['52%', '74%'], center: ['50%', '42%'], padAngle: 3, label: { show: false }, data: audience.data?.age.map((row) => ({ name: row.name, value: row.value })) }],
  }), [audience.data]);

  const metricLoading = summary.isLoading || trends.isLoading;
  return <div className="page overview-page">
    <PageHeader eyebrow="运营驾驶舱" title="演出宣发转化总览" description="从媒体声量到票房结果，快速识别需要关注的演出。" onOpenAgent={openAgent} action={<div className="segmented" aria-label="统计周期">{periodOptions.map((period) => <button key={period} className={days === period ? 'active' : ''} onClick={() => setDays(period)}>{period}天</button>)}</div>} />

    {metricLoading ? <div className="metric-grid"><LoadingState /><LoadingState /><LoadingState /><LoadingState /></div> : summary.error ? <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} /> : summary.data && <div className="metric-grid">
      <MetricCard label="总票房" valueLabel={formatCurrency(summary.data.metrics.totalRevenue.value, true)} metric={summary.data.metrics.totalRevenue} spark={sparks.revenue} accent="#35d0ad" />
      <MetricCard label="上座率" valueLabel={`${summary.data.metrics.occupancyRate.value}%`} metric={summary.data.metrics.occupancyRate} spark={sparks.occupancy} accent="#62a8ff" delay={.05} />
      <MetricCard label="复购率" valueLabel={`${summary.data.metrics.repeatPurchaseRate.value}%`} metric={summary.data.metrics.repeatPurchaseRate} spark={sparks.repeat} accent="#ae8bff" delay={.1} />
      <MetricCard label="媒体声量" valueLabel={formatNumber(summary.data.metrics.mediaVolume.value)} metric={summary.data.metrics.mediaVolume} spark={sparks.media} accent="#f2a65a" delay={.15} />
    </div>}

    <div className="overview-primary-grid">
      <Panel title="票房与媒体声量" eyebrow={`${days}日联动趋势`} action={<span className="range-note"><CalendarDays size={14} />{summary.data?.range.start.slice(5).replace('-', '.')}—{summary.data?.range.end.slice(5).replace('-', '.')}</span>}>
        {trends.isLoading ? <LoadingState /> : trends.error ? <ErrorState message={trends.error.message} onRetry={() => trends.refetch()} /> : trends.data?.rows.length ? <Chart option={trendOption} height={330} ariaLabel="票房和媒体声量双轴趋势图" /> : <EmptyState />}
      </Panel>
      <Panel title="异常雷达" eyebrow="优先处理" action={<span className="alert-count">{alerts.data?.length || 0} 项</span>} className="alerts-panel">
        {alerts.isLoading ? <LoadingState compact /> : alerts.error ? <ErrorState message={alerts.error.message} /> : alerts.data?.length ? <div className="alert-list">{alerts.data.map((alert, index) => <button key={`${alert.projectId}-${alert.type}`} onClick={() => navigate(`/shows/${alert.projectId}`)}>
          <span className="alert-icon"><AlertTriangle size={17} /></span><span><strong>{alert.type === 'low_occupancy' ? '上座率预警' : '转化效率预警'}</strong><small>{alert.message}</small></span><ChevronRight size={16} />
        </button>)}</div> : <div className="healthy-state"><CircleGauge size={25} /><strong>当前状态健康</strong><span>暂无需要立即处理的异常</span></div>}
        <div className="alert-foot"><Radio size={14} />基于声量与累计售票自动检测</div>
      </Panel>
    </div>

    <div className="overview-secondary-grid">
      <Panel title="渠道贡献" eyebrow="票房来源" action={<button className="text-link" onClick={() => navigate('/reviews')}>查看复盘<ArrowRight size={14} /></button>}>
        {channels.isLoading ? <LoadingState /> : channels.data?.rows.length ? <Chart option={channelOption} height={280} ariaLabel="渠道票房贡献环形图" /> : <EmptyState />}
      </Panel>
      <Panel title="观众结构" eyebrow="订单年龄分层" action={<span className="subtle-chip"><UsersRound size={13} />新客 {audience.data ? Math.round(audience.data.loyalty.newOrders / (audience.data.loyalty.newOrders + audience.data.loyalty.repeatOrders) * 100) : 0}%</span>}>
        {audience.isLoading ? <LoadingState /> : audience.data?.age.length ? <Chart option={audienceOption} height={280} ariaLabel="观众年龄结构环形图" /> : <EmptyState />}
      </Panel>
    </div>

    <Panel title="近期演出" eyebrow="按演出日期排列" action={<span className="range-note"><Ticket size={14} />{shows.data?.length || 0} 个项目</span>} className="shows-panel">
      {shows.isLoading ? <LoadingState /> : shows.error ? <ErrorState message={shows.error.message} /> : <div className="show-card-row">{shows.data?.map((show, index) => {
        const risk = show.occupancyRate < 60; const attention = show.occupancyRate < 70;
        return <motion.button key={show.id} className="show-card" onClick={() => navigate(`/shows/${show.id}`)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .025 }}>
          <div className="show-card-accent" style={{ background: typeColors[show.type] || '#62a8ff' }} />
          <div className="show-card-top"><span style={{ color: typeColors[show.type] || '#62a8ff' }}>{show.type}</span><em className={risk ? 'risk' : attention ? 'attention' : 'healthy'}>{risk ? '风险' : attention ? '关注' : '健康'}</em></div>
          <strong>{show.name}</strong><small>{dateTimeLabel(show.showTime)} · {show.venue}</small>
          <div className="progress-head"><span>售票进度</span><b>{show.occupancyRate}%</b></div><div className="progress"><i style={{ width: `${show.occupancyRate}%`, background: risk ? '#ef6b73' : attention ? '#f2a65a' : '#35d0ad' }} /></div>
          <div className="show-card-foot"><span>{formatCurrency(show.revenue, true)}</span><span>声量 {formatNumber(show.mediaVolume)}</span></div>
        </motion.button>;
      })}</div>}
    </Panel>
  </div>;
}
