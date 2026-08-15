import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, ChevronRight, CircleGauge, Maximize2, Megaphone, Radio, Search, Target, Ticket, UsersRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiGet } from '../api';
import type { Alert, Channels, MediaPlatforms, Operations, ShowCard, Summary, Trends } from '../types';
import { useShell } from '../components/AppShell';
import { useRouter } from '../router';
import { PageHeader } from '../components/PageHeader';
import { PerformancePulse } from '../components/PerformancePulse';
import { Panel } from '../components/Panel';
import { Chart, chartGrid, chartText, tooltip } from '../components/Chart';
import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { dateTimeLabel, formatCurrency, formatNumber, shortDate, showIdentity } from '../utils/format';

const analysisDays = 30;
const trendDays = 365;
const platformOptions = [{ value: 'all', label: '综合' }, { value: 'xiaohongshu', label: '小红书' }, { value: 'douyin', label: '抖音' }, { value: 'wechat', label: '公众号' }, { value: 'weibo', label: '微博' }, { value: 'video', label: '视频号' }] as const;
const grainOptions = [{ value: 'day', label: '日' }, { value: 'week', label: '周' }, { value: 'month', label: '月' }] as const;
const typeColors: Record<string, string> = { 音乐剧: '#183525', 戏剧: '#60755f', 舞剧: '#94a58b', 儿童剧: '#b5c7a7', 音乐会: '#496850', 戏曲: '#7f9076', 综艺: '#a5b59a' };
const alertLabels: Record<string, string> = { low_occupancy: '上座率预警', sales_completion: '售票完成预警', box_office_completion: '票房完成预警', high_media_low_conversion: '转化效率预警' };

export function OverviewPage() {
  const { openAgent } = useShell();
  const { navigate } = useRouter();
  const [summaryDays, setSummaryDays] = useState<180 | 365>(365);
  const [platform, setPlatform] = useState<(typeof platformOptions)[number]['value']>('all');
  const [grain, setGrain] = useState<(typeof grainOptions)[number]['value']>('day');
  const [salesMetric, setSalesMetric] = useState<'tickets' | 'revenue'>('tickets');
  const [search, setSearch] = useState('');
  const analysisSuffix = `?days=${analysisDays}`;
  const summary = useQuery({ queryKey: ['summary', summaryDays], queryFn: ({ signal }) => apiGet<Summary>(`/api/dashboard/summary?days=${summaryDays}`, signal) });
  const analysisSummary = useQuery({ queryKey: ['analysis-summary', analysisDays], queryFn: ({ signal }) => apiGet<Summary>(`/api/dashboard/summary?days=${analysisDays}`, signal) });
  const trends = useQuery({ queryKey: ['trends', trendDays, platform], queryFn: ({ signal }) => apiGet<Trends>(`/api/dashboard/trends?days=${trendDays}&platform=${platform}`, signal) });
  const channels = useQuery({ queryKey: ['channels', analysisDays], queryFn: ({ signal }) => apiGet<Channels>(`/api/dashboard/channels${analysisSuffix}`, signal) });
  const mediaPlatforms = useQuery({ queryKey: ['media-platforms', analysisDays], queryFn: ({ signal }) => apiGet<MediaPlatforms>(`/api/dashboard/media-platforms${analysisSuffix}`, signal) });
  const operations = useQuery({ queryKey: ['operations', analysisDays, grain], queryFn: ({ signal }) => apiGet<Operations>(`/api/dashboard/operations${analysisSuffix}&grain=${grain}`, signal) });
  const shows = useQuery({ queryKey: ['show-cards'], queryFn: ({ signal }) => apiGet<ShowCard[]>('/api/dashboard/shows', signal) });
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: ({ signal }) => apiGet<Alert[]>('/api/dashboard/alerts', signal) });

  const trendOption = useMemo(() => {
    const rows = trends.data?.rows || [];
    const startValue = Math.max(rows.length - 30, 0);
    return ({
    animationDuration: 700,
    color: ['#183525', '#94a58b'],
    tooltip: { ...tooltip, trigger: 'axis' as const, valueFormatter: (value: unknown) => value == null || value === '-' || !Number.isFinite(Number(value)) ? '暂无数据' : formatNumber(Number(value)) },
    legend: { top: 0, right: 0, textStyle: { color: chartText }, itemWidth: 18, itemHeight: 3 },
    grid: { top: 44, left: 44, right: 48, bottom: 62 },
    xAxis: { type: 'category' as const, boundaryGap: false, data: rows.map((row) => shortDate(row.date)), axisLine: { lineStyle: { color: chartGrid } }, axisTick: { show: false }, axisLabel: { color: chartText, fontSize: 11, hideOverlap: true } },
    yAxis: [
      { type: 'value' as const, name: '票房（元）', nameTextStyle: { color: chartText }, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => value >= 10000 ? `${value / 10000}万` : value } },
      { type: 'value' as const, name: '宣传内容数', nameTextStyle: { color: chartText }, splitLine: { show: false }, axisLabel: { color: chartText } },
    ],
    dataZoom: [
      { type: 'inside' as const, startValue, endValue: Math.max(rows.length - 1, 0), zoomOnMouseWheel: true, moveOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'slider' as const, startValue, endValue: Math.max(rows.length - 1, 0), height: 18, bottom: 7, brushSelect: false, borderColor: 'transparent', backgroundColor: '#eef0e9', fillerColor: 'rgba(36,94,134,.18)', handleSize: 18, handleStyle: { color: '#245e86', borderColor: '#fff', borderWidth: 2 }, moveHandleStyle: { color: '#245e86' }, dataBackground: { lineStyle: { color: '#94a58b', opacity: .45 }, areaStyle: { color: '#dfe7da', opacity: .55 } }, selectedDataBackground: { lineStyle: { color: '#245e86' }, areaStyle: { color: '#a9c8d9', opacity: .5 } }, textStyle: { color: chartText, fontSize: 9 } },
    ],
    series: [
      { name: '日票房', type: 'line' as const, smooth: .32, symbol: 'none', data: rows.map((row) => row.revenue), lineStyle: { width: 3 }, areaStyle: { color: 'rgba(148,165,139,.12)' } },
      { name: '宣传内容数', type: 'bar' as const, yAxisIndex: 1, barMaxWidth: 12, data: rows.map((row) => row.mediaVolume), itemStyle: { color: '#B9D9B8', borderRadius: [8, 8, 0, 0], borderColor: '#183525', borderWidth: 1 } },
    ],
  });
  }, [trends.data]);

  const channelOption = useMemo(() => ({
    tooltip: { ...tooltip, trigger: 'item' as const, formatter: '{b}<br/>{c} 元 · {d}%' },
    legend: { type: 'scroll' as const, bottom: 0, textStyle: { color: chartText, fontSize: 11 }, itemWidth: 8, itemHeight: 8 },
    color: ['#183525', '#5f735d', '#94a58b', '#b9d9b8', '#d5dacd', '#7d9276', '#aec0a4', '#e3e6dd'],
    series: [{ type: 'pie' as const, radius: ['54%', '78%'], center: ['50%', '43%'], padAngle: 3, itemStyle: { borderRadius: 8, borderColor: '#F8F8F4', borderWidth: 4 }, label: { show: false }, data: channels.data?.rows.slice(0, 8).map((row) => ({ name: row.channel, value: row.revenue })) }],
  }), [channels.data]);

  const mediaOption = useMemo(() => ({
    tooltip: { ...tooltip, trigger: 'item' as const, formatter: '{b}<br/>{c} 次 · {d}%' },
    legend: { type: 'scroll' as const, bottom: 0, textStyle: { color: chartText, fontSize: 11 }, itemWidth: 8, itemHeight: 8 },
    color: ['#245E86', '#4B86AE', '#78A8C4', '#A9C8D9', '#D5E5ED'],
    series: [{ type: 'pie' as const, radius: ['54%', '78%'], center: ['50%', '43%'], padAngle: 3, itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 4 }, label: { show: false }, data: mediaPlatforms.data?.rows.map((row) => ({ name: row.platform, value: row.interactions })) }],
  }), [mediaPlatforms.data]);

  const metricLoading = summary.isLoading || analysisSummary.isLoading;
  return <div className="page overview-page">
    <PageHeader eyebrow="THEATER INTELLIGENCE" title="营销数据看板" description="把宣发声量、会员数据与票房结果连成一张可行动的信息图。" onOpenAgent={openAgent} />
    <div className="project-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索项目，直达单场分析" aria-label="搜索项目" />{search && <div className="project-search-results">{shows.data?.filter((show) => `${show.title || ''}${show.name}`.includes(search)).slice(0, 6).map((show) => { const identity = showIdentity(show.name, show.title); return <button key={show.id} onClick={() => navigate(`/shows/${show.id}`)}><span><strong>{identity.title}</strong>{identity.subtitle && <small>{identity.subtitle}</small>}<em>{dateTimeLabel(show.showTime)}</em></span><ArrowRight size={15} /></button>; })}{!shows.data?.some((show) => `${show.title || ''}${show.name}`.includes(search)) && <p>没有匹配项目</p>}</div>}</div>

    {metricLoading ? <LoadingState /> : summary.error || analysisSummary.error ? <ErrorState message={(summary.error || analysisSummary.error)?.message || '数据加载失败'} onRetry={() => { summary.refetch(); analysisSummary.refetch(); }} /> : summary.data && analysisSummary.data && <PerformancePulse summary={summary.data} mediaSummary={analysisSummary.data} scopeDays={summaryDays} onScopeChange={setSummaryDays} />}

    <div className="overview-primary-grid">
      <Panel title="票房与媒体声量" eyebrow="365日联动趋势" action={<div className="trend-actions"><div className="platform-pills" aria-label="媒体平台">{platformOptions.map((item) => <button key={item.value} aria-pressed={platform === item.value} className={platform === item.value ? 'active' : ''} onClick={() => setPlatform(item.value)}>{item.label}</button>)}</div><button className="chart-open-button" aria-label="展开票房与媒体声量表" data-tooltip="展开" onClick={() => navigate('/trends')}><Maximize2 size={15} /></button></div>}>
        {trends.isLoading ? <LoadingState /> : trends.error ? <ErrorState message={trends.error.message} onRetry={() => trends.refetch()} /> : trends.data?.rows.length ? <Chart option={trendOption} height={330} ariaLabel="365日票房和媒体声量双轴趋势图" /> : <EmptyState />}
      </Panel>
      <Panel title="异常雷达" eyebrow="优先处理" action={<span className="alert-count">{alerts.data?.length || 0} 项</span>} className="alerts-panel">
        {alerts.isLoading ? <LoadingState compact /> : alerts.error ? <ErrorState message={alerts.error.message} /> : alerts.data?.length ? <div className="alert-list">{alerts.data.map((alert) => <button className={`alert-${alert.level}`} key={`${alert.projectId}-${alert.type}`} onClick={() => navigate(`/shows/${alert.projectId}`)}>
          <span className="alert-icon"><AlertTriangle size={17} /></span><span><strong>{alertLabels[alert.type] || '经营预警'}</strong><small>{alert.message}</small></span><ChevronRight size={16} />
        </button>)}</div> : <div className="healthy-state"><CircleGauge size={25} /><strong>当前状态健康</strong><span>暂无需要立即处理的异常</span></div>}
        <div className="alert-foot"><Radio size={14} />基于声量与累计售票自动检测</div>
      </Panel>
    </div>

    <div className="overview-secondary-grid">
      <Panel title="平台互动量占比" eyebrow="新媒体表现" action={<span className="subtle-chip media-chip">五个平台</span>}>
        {mediaPlatforms.isLoading ? <LoadingState /> : mediaPlatforms.data?.rows.length ? <Chart option={mediaOption} height={280} ariaLabel="五个平台互动量占比环形图" /> : <EmptyState />}
      </Panel>
      <Panel title="渠道贡献" eyebrow="票房来源" action={<button className="text-link" onClick={() => navigate('/reviews')}>查看复盘<ArrowRight size={14} /></button>}>
        {channels.isLoading ? <LoadingState /> : channels.data?.rows.length ? <Chart option={channelOption} height={280} ariaLabel="渠道票房贡献环形图" /> : <EmptyState />}
      </Panel>
      <Panel title="售票完成率排行" eyebrow="实际售票 / 预计售票" action={<span className="subtle-chip"><Target size={13} />目标进度</span>}>
        {shows.isLoading ? <LoadingState /> : shows.data?.length ? <div className="completion-ranking">{[...shows.data].sort((a, b) => (b.salesCompletionRate ?? -1) - (a.salesCompletionRate ?? -1)).slice(0, 6).map((show, index) => { const identity = showIdentity(show.name, show.title); return <button key={show.id} onClick={() => navigate(`/shows/${show.id}`)}>
          <span className="completion-rank">{String(index + 1).padStart(2, '0')}</span><span className="completion-name"><strong>{identity.title}</strong><small>{show.expectedTickets ? `${formatNumber(show.soldTickets)} / ${formatNumber(show.expectedTickets)} 张` : `${formatNumber(show.soldTickets)} 张 · 目标待补`}</small></span><span className="completion-bar"><i style={{ width: `${Math.min(show.salesCompletionRate ?? 0, 100)}%` }} /></span><b>{show.salesCompletionRate == null ? '暂无目标' : `${show.salesCompletionRate}%`}</b>
        </button>; })}</div> : <EmptyState />}
      </Panel>
    </div>

    <Panel title="经营总表" eyebrow="时间维度经营脉络" action={<div className="segmented compact-segmented" aria-label="经营总表时间粒度">{grainOptions.map((item) => <button key={item.value} aria-pressed={grain === item.value} className={grain === item.value ? 'active' : ''} onClick={() => setGrain(item.value)}>{item.label}</button>)}</div>} className="operations-panel">
      {operations.isLoading ? <LoadingState /> : operations.error ? <ErrorState message={operations.error.message} onRetry={() => operations.refetch()} /> : operations.data?.rows.length ? <div className="operations-table-wrap"><table className="operations-table"><thead><tr><th><CalendarDays size={13} />时间</th><th className="sales-switch-cell"><div className="sales-metric-switch" role="group" aria-label="切换售票指标"><button className={salesMetric === 'revenue' ? 'active' : ''} aria-pressed={salesMetric === 'revenue'} onClick={() => setSalesMetric('revenue')}>总售票金额</button><span aria-hidden="true">/</span><button className={salesMetric === 'tickets' ? 'active' : ''} aria-pressed={salesMetric === 'tickets'} onClick={() => setSalesMetric('tickets')}>总售票数</button></div></th><th><Ticket size={13} />总出票数</th><th>工作票</th><th><Megaphone size={13} />总宣传量</th><th><UsersRound size={13} />平台净增粉丝</th></tr></thead><tbody>{operations.data.rows.map((row) => <tr key={row.periodStart}><td><strong>{grain === 'month' ? row.periodStart.slice(0, 7) : grain === 'week' ? `${row.periodStart.slice(5)} 起` : row.periodStart.slice(5)}</strong><small>{grain === 'day' ? shortDate(row.periodStart) : `${row.periodStart.slice(5)}—${row.periodEnd.slice(5)}`}</small></td><td><motion.b key={`${row.periodStart}-${salesMetric}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>{formatNumber(salesMetric === 'tickets' ? row.totalTickets : row.totalRevenue)}</motion.b><span>{salesMetric === 'tickets' ? '张' : '元'}</span></td><td><b>{formatNumber(row.totalIssuedTickets)}</b><span>张</span></td><td><b>{formatNumber(row.workTickets)}</b><span>张</span></td><td><b>{row.totalPublicity == null ? '暂无数据' : formatNumber(row.totalPublicity)}</b>{row.totalPublicity == null ? null : <span>次</span>}</td><td><b>{row.mediaFollowerGrowth == null ? '暂无数据' : `${row.mediaFollowerGrowth > 0 ? '+' : ''}${formatNumber(row.mediaFollowerGrowth)}`}</b>{row.mediaFollowerGrowth == null ? null : <span>人</span>}</td></tr>)}</tbody></table></div> : <EmptyState />}
    </Panel>

    <Panel title="近期演出" eyebrow="按演出日期排列" action={<span className="range-note"><Ticket size={14} />{shows.data?.length || 0} 个项目</span>} className="shows-panel">
      {shows.isLoading ? <LoadingState /> : shows.error ? <ErrorState message={shows.error.message} /> : <div className="show-card-row">{shows.data?.map((show, index) => {
        const pending = show.salesCompletionRate == null; const risk = show.salesCompletionRate != null && show.salesCompletionRate < 60; const attention = show.salesCompletionRate != null && show.salesCompletionRate < 80;
        const identity = showIdentity(show.name, show.title);
        return <motion.button key={show.id} className="show-card" onClick={() => navigate(`/shows/${show.id}`)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .025 }}>
          <div className="show-card-accent" style={{ background: typeColors[show.type] || '#62a8ff' }} />
          <div className="show-card-top"><span style={{ color: typeColors[show.type] || '#62a8ff' }}>{show.type}</span><em className={pending ? 'pending' : risk ? 'risk' : attention ? 'attention' : 'healthy'}>{pending ? '目标待补' : risk ? '风险' : attention ? '关注' : '健康'}</em></div>
          <strong>{identity.title}</strong>{identity.subtitle && <small className="show-card-subtitle">{identity.subtitle}</small>}<small className="show-card-date">{dateTimeLabel(show.showTime)} · {show.venue}</small>
          <div className="progress-head"><span>目标进度</span><b>{show.salesCompletionRate == null ? '暂无目标' : `${show.salesCompletionRate}%`}</b></div><div className="progress"><i style={{ width: `${Math.min(show.salesCompletionRate ?? 0, 100)}%`, background: risk ? '#a95d50' : attention ? '#9a7642' : '#183525' }} /></div>
          <div className="show-card-foot"><span>总出票 {formatNumber(show.totalIssuedTickets)} · 工作票 {formatNumber(show.workTickets)}</span><span>宣传量 {formatNumber(show.mediaVolume)}</span></div>
        </motion.button>;
      })}</div>}
    </Panel>
  </div>;
}
