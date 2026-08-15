import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ArrowLeft, Building2, CalendarDays, ChevronDown, MapPin, Users, WalletCards } from 'lucide-react';
import { apiGet } from '../api';
import { useShell } from '../components/AppShell';
import { useRouter } from '../router';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { Chart, chartGrid, chartText, tooltip } from '../components/Chart';
import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import type { ShowCard, ShowDetail } from '../types';
import { dateTimeLabel, formatCurrency, formatNumber, shortDate } from '../utils/format';

export function ShowDetailPage() {
  const { pathname, navigate } = useRouter();
  const id = pathname.match(/^\/shows\/(\d+)$/)?.[1] || '1';
  const { openAgent } = useShell();
  const detail = useQuery({ queryKey: ['show-detail', id], queryFn: ({ signal }) => apiGet<ShowDetail>(`/api/shows/${id}`, signal) });
  const shows = useQuery({ queryKey: ['shows'], queryFn: ({ signal }) => apiGet<ShowCard[]>('/api/shows', signal) });

  const timelineOption = useMemo(() => {
    const data = detail.data;
    return {
      animationDuration: 700,
      color: ['#183525', '#94a58b'],
      tooltip: { ...tooltip, trigger: 'axis' as const, formatter: (items: Array<{ seriesName: string; value: number; axisValue: string; marker: string }>) => {
        const lines = items.map((item) => `${item.marker}${item.seriesName}：${item.seriesName.includes('票房') ? formatCurrency(item.value) : formatNumber(item.value)}`);
        return `<strong>${items[0]?.axisValue || ''}</strong><br/>${lines.join('<br/>')}`;
      } },
      legend: { top: 0, right: 0, textStyle: { color: chartText }, itemWidth: 18, itemHeight: 3 },
      grid: { top: 48, left: 52, right: 52, bottom: 28 },
      xAxis: { type: 'category' as const, boundaryGap: true, data: data?.timeline.map((row) => shortDate(row.date)), axisLine: { lineStyle: { color: chartGrid } }, axisTick: { show: false }, axisLabel: { color: chartText, interval: 6 } },
      yAxis: [
        { type: 'value' as const, name: '累计票房', nameTextStyle: { color: chartText }, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => `${Math.round(value / 10000)}万` } },
        { type: 'value' as const, name: '日声量', nameTextStyle: { color: chartText }, splitLine: { show: false }, axisLabel: { color: chartText } },
      ],
      series: [
        { name: '累计票房', type: 'line' as const, smooth: .25, showSymbol: false, data: data?.timeline.map((row) => row.cumulativeRevenue), lineStyle: { width: 3 }, areaStyle: { color: 'rgba(148,165,139,.13)' }, markLine: { silent: true, symbol: 'none', label: { color: '#7b6a3f', formatter: '{b}', fontSize: 10 }, lineStyle: { color: 'rgba(123,106,63,.55)', type: 'dashed' as const }, data: data?.strategyEvents.map((event) => ({ name: event.type, xAxis: shortDate(event.startDate) })) } },
        { name: '宣传内容数', type: 'bar' as const, yAxisIndex: 1, barMaxWidth: 11, data: data?.timeline.map((row) => row.mediaVolume), itemStyle: { color: '#B9D9B8', borderColor: '#183525', borderWidth: 1, borderRadius: [7, 7, 0, 0] } },
      ],
    };
  }, [detail.data]);

  const channelOption = useMemo(() => ({
    grid: { top: 6, left: 58, right: 48, bottom: 20 },
    tooltip: { ...tooltip, trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    xAxis: { type: 'value' as const, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => `${value / 10000}万` } },
    yAxis: { type: 'category' as const, inverse: true, data: detail.data?.channelBreakdown.slice(0, 8).map((row) => row.channel), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#526353' } },
    series: [{ type: 'bar' as const, barWidth: 11, data: detail.data?.channelBreakdown.slice(0, 8).map((row) => row.revenue), itemStyle: { color: '#94A58B', borderColor: '#183525', borderWidth: 1, borderRadius: [0, 8, 8, 0] }, label: { show: true, position: 'right' as const, color: chartText, formatter: (item: { value: number }) => formatCurrency(item.value, true) } }],
  }), [detail.data]);

  if (detail.isLoading) return <div className="page"><LoadingState /></div>;
  if (detail.error || !detail.data) return <div className="page"><ErrorState message={detail.error?.message || '未找到演出'} onRetry={() => detail.refetch()} /></div>;
  const { show, period } = detail.data;
  const totalRevenue = show.revenue || 1;
  const periodCards = [
    ['开售首日', period.firstDay, '启动势能'], ['开售首周', period.firstWeek, '早期转化'],
    ['常规销售', period.middle, '长尾贡献'], ['演前尾周', period.lastWeek, '压哨转化'],
  ] as const;
  const remainingTickets = show.salesCompletionRate == null || show.expectedTickets == null
    ? null
    : show.salesCompletionRate > 100 ? show.soldTickets - show.expectedTickets : show.remainingGoal;
  const paceLabel = show.salesPaceStatus === 'ahead' ? '领先计划' : show.salesPaceStatus === 'on_track' ? '基本同步' : show.salesPaceStatus === 'behind' ? '落后计划' : '暂无判断';
  const progressGapLabel = show.salesProgressGap == null ? '暂无数据' : `${show.salesProgressGap > 0 ? '+' : ''}${show.salesProgressGap} 个百分点`;

  return <div className="page show-detail-page">
    <button className="back-link" onClick={() => navigate('/')}><ArrowLeft size={15} />返回总览</button>
    <PageHeader eyebrow="单场项目复盘" title={show.project_name} description={`${dateTimeLabel(show.show_time)} · ${show.venue}`} onOpenAgent={openAgent} action={<label className="show-select"><span>切换演出</span><select value={id} onChange={(event) => navigate(`/shows/${event.target.value}`)}>{shows.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></label>} />

    <section className="show-hero">
      <div className="show-identity"><span className="type-kicker">{show.performance_type}</span><h2>{show.project_name}</h2><div className="show-meta"><span><Building2 size={15} />{show.troupe_name || '暂无数据'}</span><span><Users size={15} />{[show.director, show.lead_actor].filter(Boolean).join(' · ') || '暂无数据'}</span><span><MapPin size={15} />{show.venue || '暂无数据'}</span><span><CalendarDays size={15} />{dateTimeLabel(show.show_time)}</span></div></div>
      <div className="show-score"><strong>{show.boxOfficeCompletionRate == null ? '暂无数据' : `${show.boxOfficeCompletionRate}%`}</strong><span>票房完成度</span></div>
      <div className="hero-metric"><span>累计票房</span><strong>{formatCurrency(show.revenue, true)}</strong><small>{formatNumber(show.soldTickets)} 张票</small></div>
      <div className="hero-metric"><span>上座率完成度</span><strong className={show.occupancyRate != null && show.occupancyRate < 60 ? 'danger-text' : ''}>{show.occupancyRate == null ? '暂无数据' : `${show.occupancyRate}%`}</strong><small>{show.capacity == null ? '缺少可出票数' : `总出票 ${formatNumber(show.totalIssuedTickets)} / 可出票 ${formatNumber(show.capacity)}`}</small></div>
      <div className="hero-metric"><span>售票完成率</span><strong className={show.salesCompletionRate != null && show.salesCompletionRate < 60 ? 'danger-text' : ''}>{show.salesCompletionRate == null ? '暂无目标' : `${show.salesCompletionRate}%`}</strong><small>{show.expectedTickets ? `目标 ${formatNumber(show.expectedTickets)} 张` : '目标售票数待补'}</small></div>
    </section>

    <Panel title="声量 → 票房时间线" eyebrow="宣发事件与销售曲线对齐" action={<span className="legend-note"><i className="green" />累计票房<i className="blue" />媒体声量<i className="orange" />策略节点</span>}>
      <Chart option={timelineOption} height={390} ariaLabel={`${show.project_name}宣发声量和票房时间线`} />
    </Panel>

    <div className="detail-two-column">
      <Panel title="渠道转化拆解" eyebrow="票房贡献"><>{detail.data.channelBreakdown.length ? <Chart option={channelOption} height={310} ariaLabel="单场演出渠道票房排名" /> : <EmptyState label="暂无真实渠道数据" />}</></Panel>
      <Panel title="售票目标完成进度" eyebrow="实际售票 / 预计售票">
        <div className="sales-goal" aria-label={show.salesCompletionRate == null ? '预计售票目标待补' : `售票完成率 ${show.salesCompletionRate}%`}>
          <div className="goal-orbit" style={{ background: `conic-gradient(#183525 ${Math.min(show.salesCompletionRate ?? 0, 100) * 3.6}deg, #dce2d7 0deg)` }}><div><strong>{show.salesCompletionRate == null ? '—' : `${show.salesCompletionRate}%`}</strong><span>{show.salesCompletionRate == null ? '暂无目标' : show.salesCompletionRate > 100 ? `超额 ${Math.round(show.salesCompletionRate - 100)}%` : '当前完成率'}</span></div></div>
          <div className="goal-ledger"><div><span>预计售票</span><strong>{show.expectedTickets ? formatNumber(show.expectedTickets) : '待补'}{show.expectedTickets ? <small>张</small> : null}</strong></div><div><span>实际付费售票</span><strong>{formatNumber(show.soldTickets)}<small>张</small></strong></div><div><span>可售 / 工作票</span><strong>{show.saleableTickets == null ? '待补' : formatNumber(show.saleableTickets)}<small>{show.saleableTickets == null ? '' : ` 张 / 工作票 ${formatNumber(show.workTickets)} 张`}</small></strong></div><div><span>{show.salesCompletionRate != null && show.salesCompletionRate > 100 ? '超额售票' : '剩余目标'}</span><strong>{remainingTickets == null ? '—' : formatNumber(remainingTickets)}{remainingTickets == null ? null : <small>张</small>}</strong></div><div className="pace-row"><span>销售时间进度</span><strong>{show.timeProgressRate == null ? '—' : `${show.timeProgressRate}%`}<small>{show.salesElapsedDays == null ? '缺少开票日期' : ` 已开售 ${show.salesElapsedDays} 天 · 距演出 ${show.daysToShow} 天`}</small></strong></div><div className={`pace-row ${show.salesPaceStatus || ''}`}><span>售票节奏</span><strong>{paceLabel}<small>{progressGapLabel}</small></strong></div></div>
        </div>
      </Panel>
    </div>

    <div className="period-grid">{periodCards.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{formatCurrency(value, true)}</strong><div className="period-progress"><i style={{ width: `${Math.min(value / totalRevenue * 100, 100)}%` }} /></div><small>{note} · 占总票房 {Math.round(value / totalRevenue * 100)}%</small></article>)}</div>

    <Panel title="策略 ROI 复盘" eyebrow="影响金额为运营人工记录" action={<span className="range-note"><WalletCards size={14} />{detail.data.strategyEvents.length} 项策略</span>}>
      {detail.data.strategyEvents.length ? <div className="table-wrap"><table><thead><tr><th>策略</th><th>类型</th><th>执行周期</th><th>花费</th><th>影响金额</th><th>ROI</th><th>效果</th></tr></thead><tbody>{detail.data.strategyEvents.map((strategy) => <tr key={strategy.id}><td><strong>{strategy.type}</strong></td><td>{strategy.category}</td><td>{strategy.startDate.slice(5)} — {strategy.endDate.slice(5)}</td><td>{formatCurrency(strategy.cost)}</td><td>{formatCurrency(strategy.impactAmount)}</td><td><b className={(strategy.roi || 0) < 1 ? 'danger-text' : 'positive-text'}>{strategy.roi == null ? '—' : `${strategy.roi}×`}</b></td><td><span className={`status-badge ${strategy.effect === '未达预期' ? 'risk' : strategy.effect === '优秀' ? 'healthy' : 'attention'}`}>{strategy.effect}</span></td></tr>)}</tbody></table></div> : <EmptyState label="暂无真实策略投入与效果数据" />}
    </Panel>
  </div>;
}
