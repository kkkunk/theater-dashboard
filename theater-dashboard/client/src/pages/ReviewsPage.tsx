import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Filter, Lightbulb, Medal, Sparkles, Target } from 'lucide-react';
import { apiGet } from '../api';
import { useShell } from '../components/AppShell';
import { useRouter } from '../router';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { Chart, chartGrid, chartText, tooltip } from '../components/Chart';
import { ErrorState, LoadingState } from '../components/DataState';
import type { Channels, StrategyReview } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

const showTypes = ['', '音乐剧', '戏剧', '舞剧', '儿童剧', '音乐会', '戏曲', '综艺'];
const strategyColors: Record<string, string> = { 新媒体投放: '#62a8ff', 票务促销: '#35d0ad', 社群运营: '#ae8bff' };

export function ReviewsPage() {
  const { openAgent } = useShell();
  const { navigate } = useRouter();
  const [type, setType] = useState('');
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const channels = useQuery({ queryKey: ['channel-review', type], queryFn: ({ signal }) => apiGet<Channels>(`/api/reviews/channels${query}`, signal) });
  const strategies = useQuery({ queryKey: ['strategy-review', type], queryFn: ({ signal }) => apiGet<StrategyReview>(`/api/reviews/strategies${query}`, signal) });

  const channelOption = useMemo(() => ({
    grid: { top: 12, left: 56, right: 56, bottom: 22 },
    tooltip: { ...tooltip, trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
    xAxis: { type: 'value' as const, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => `${value / 10000}万` } },
    yAxis: { type: 'category' as const, inverse: true, data: channels.data?.rows.map((row) => row.channel), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#c4cede' } },
    series: [{ type: 'bar' as const, barWidth: 12, data: channels.data?.rows.map((row, index) => ({ value: row.revenue, itemStyle: { color: index < 3 ? '#35d0ad' : 'rgba(98,168,255,.62)', borderRadius: [0, 4, 4, 0] } })), label: { show: true, position: 'right' as const, color: chartText, formatter: (item: { value: number }) => formatCurrency(item.value, true) } }],
  }), [channels.data]);

  const strategyOption = useMemo(() => ({
    color: ['#62a8ff', '#35d0ad', '#ae8bff'],
    tooltip: { ...tooltip, formatter: (item: { data: { name: string; value: number[]; category: string } }) => `<strong>${item.data.name}</strong><br/>投入：${formatCurrency(item.data.value[0])}<br/>影响金额：${formatCurrency(item.data.value[1])}<br/>使用 ${item.data.value[2]} 次` },
    grid: { top: 20, left: 56, right: 28, bottom: 46 },
    xAxis: { type: 'value' as const, name: '累计投入', nameLocation: 'middle' as const, nameGap: 30, nameTextStyle: { color: chartText }, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => `${value / 10000}万` } },
    yAxis: { type: 'value' as const, name: '影响金额', nameTextStyle: { color: chartText }, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => `${value / 10000}万` } },
    series: [{ type: 'scatter' as const, symbolSize: (value: number[]) => 18 + value[2] * 3, data: strategies.data?.rows.map((row) => ({ name: row.strategyType, category: row.category, value: [row.totalCost, row.impactAmount, row.usageCount], itemStyle: { color: strategyColors[row.category] || '#62a8ff' }, label: { show: row.usageCount >= 8, formatter: row.strategyType, position: 'top' as const, color: '#b9c5d8', fontSize: 10 } })) }],
  }), [strategies.data]);

  const totalChannelRevenue = channels.data?.rows.reduce((sum, row) => sum + row.revenue, 0) || 0;
  const averageRoi = strategies.data?.rows.filter((row) => row.roi != null).reduce((sum, row) => sum + (row.roi || 0), 0) || 0;
  const validStrategies = strategies.data?.rows.filter((row) => row.roi != null).length || 1;
  return <div className="page reviews-page">
    <PageHeader eyebrow="跨项目复盘" title="渠道与策略效率" description="把单场经验沉淀为可复用的宣发决策依据。" onOpenAgent={openAgent} action={<label className="filter-select"><Filter size={15} /><select value={type} onChange={(event) => setType(event.target.value)}>{showTypes.map((item) => <option key={item || 'all'} value={item}>{item || '全部演出类型'}</option>)}</select></label>} />

    <div className="review-summary">
      <article><span><Target size={16} />渠道总票房</span><strong>{formatCurrency(totalChannelRevenue, true)}</strong><small>{channels.data?.rows.length || 0} 个有效渠道</small></article>
      <article><span><Sparkles size={16} />平均策略 ROI</span><strong>{(averageRoi / validStrategies).toFixed(1)}×</strong><small>不含零成本策略</small></article>
      <article><span><Medal size={16} />最佳渠道</span><strong>{channels.data?.rows[0]?.channel || '—'}</strong><small>贡献 {channels.data?.rows[0]?.sharePct || 0}% 票房</small></article>
      <article><span><Lightbulb size={16} />最佳策略</span><strong>{strategies.data?.rows[0]?.strategyType || '—'}</strong><small>ROI {strategies.data?.rows[0]?.roi || 0}×</small></article>
    </div>

    <div className="review-grid">
      <Panel title="渠道效率排行榜" eyebrow="累计票房贡献">
        {channels.isLoading ? <LoadingState /> : channels.error ? <ErrorState message={channels.error.message} onRetry={() => channels.refetch()} /> : <Chart option={channelOption} height={390} ariaLabel="渠道效率排行榜" />}
      </Panel>
      <Panel title="策略投入与影响" eyebrow="气泡大小代表使用次数" action={<div className="chart-legend"><span><i style={{ background: '#62a8ff' }} />新媒体</span><span><i style={{ background: '#35d0ad' }} />票务</span><span><i style={{ background: '#ae8bff' }} />社群</span></div>}>
        {strategies.isLoading ? <LoadingState /> : strategies.error ? <ErrorState message={strategies.error.message} onRetry={() => strategies.refetch()} /> : <Chart option={strategyOption} height={390} ariaLabel="策略投入影响金额气泡图" />}
      </Panel>
    </div>

    <Panel title="渠道经营明细" eyebrow="支持按指标横向比较">
      {channels.isLoading ? <LoadingState /> : <div className="table-wrap"><table><thead><tr><th>排名</th><th>渠道</th><th>累计销售额</th><th>占比</th><th>订单数</th><th>参与演出</th><th>场均销售额</th></tr></thead><tbody>{channels.data?.rows.map((row, index) => <tr key={row.channel}><td><span className={`rank ${index < 3 ? 'top' : ''}`}>{index + 1}</span></td><td><strong>{row.channel}</strong></td><td>{formatCurrency(row.revenue)}</td><td><div className="inline-progress"><i style={{ width: `${row.sharePct}%` }} /><span>{row.sharePct}%</span></div></td><td>{formatNumber(row.orders || 0)}</td><td>{row.showCount} 场</td><td>{formatCurrency(row.averageRevenuePerShow || 0)}</td></tr>)}</tbody></table></div>}
    </Panel>

    <Panel title="历史最佳实践" eyebrow="按项目策略组合 ROI 排名" className="practices-panel">
      {strategies.isLoading ? <LoadingState /> : <div className="practice-grid">{strategies.data?.bestPractices.map((item, index) => <button key={item.projectId} onClick={() => navigate(`/shows/${item.projectId}`)}>
        <div className="practice-rank">0{index + 1}</div><span className="practice-type">{item.showType}</span><h3>{item.showName}</h3><p>{item.strategyMix}</p><div><span>累计投入 <strong>{formatCurrency(item.totalCost, true)}</strong></span><span>组合 ROI <strong>{item.roi}×</strong></span></div><em>查看项目<ArrowUpRight size={14} /></em>
      </button>)}</div>}
    </Panel>
  </div>;
}
