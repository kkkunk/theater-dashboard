import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiGet } from '../api';
import { Chart, chartGrid, chartText, tooltip } from '../components/Chart';
import { EmptyState, ErrorState, LoadingState } from '../components/DataState';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { useShell } from '../components/AppShell';
import { useRouter } from '../router';
import type { Trends } from '../types';
import { formatCurrency, formatNumber, shortDate } from '../utils/format';

const platformOptions = [{ value: 'all', label: '综合' }, { value: 'xiaohongshu', label: '小红书' }, { value: 'douyin', label: '抖音' }, { value: 'wechat', label: '公众号' }, { value: 'weibo', label: '微博' }, { value: 'video', label: '视频号' }] as const;

export function TrendDetailPage() {
  const { openAgent } = useShell();
  const { navigate } = useRouter();
  const [platform, setPlatform] = useState<(typeof platformOptions)[number]['value']>('all');
  const trends = useQuery({ queryKey: ['trend-detail', platform], queryFn: ({ signal }) => apiGet<Trends>(`/api/dashboard/trends?days=365&platform=${platform}`, signal) });
  const trendRows = useMemo(() => trends.data?.rows || [], [trends.data]);
  const chartOption = useMemo(() => {
    const startValue = Math.max(trendRows.length - 30, 0);
    return ({
    animationDuration: 650,
    color: ['#183525', '#94a58b'],
    tooltip: { ...tooltip, trigger: 'axis' as const, valueFormatter: (value: unknown) => value == null || value === '-' || !Number.isFinite(Number(value)) ? '暂无数据' : formatNumber(Number(value)) },
    legend: { top: 0, right: 0, textStyle: { color: chartText }, itemWidth: 18, itemHeight: 3 },
    grid: { top: 48, left: 58, right: 62, bottom: 68 },
    xAxis: { type: 'category' as const, boundaryGap: false, data: trendRows.map((row) => shortDate(row.date)), axisLine: { lineStyle: { color: chartGrid } }, axisTick: { show: false }, axisLabel: { color: chartText, fontSize: 11, hideOverlap: true } },
    yAxis: [
      { type: 'value' as const, name: '票房（元）', nameTextStyle: { color: chartText }, splitLine: { lineStyle: { color: chartGrid } }, axisLabel: { color: chartText, formatter: (value: number) => value >= 10000 ? `${value / 10000}万` : value } },
      { type: 'value' as const, name: '宣传内容数', nameTextStyle: { color: chartText }, splitLine: { show: false }, axisLabel: { color: chartText } },
    ],
    dataZoom: [
      { type: 'inside' as const, startValue, endValue: Math.max(trendRows.length - 1, 0), zoomOnMouseWheel: true, moveOnMouseWheel: true, moveOnMouseMove: true },
      { type: 'slider' as const, startValue, endValue: Math.max(trendRows.length - 1, 0), height: 20, bottom: 9, brushSelect: false, borderColor: 'transparent', backgroundColor: '#eef0e9', fillerColor: 'rgba(36,94,134,.18)', handleSize: 20, handleStyle: { color: '#245e86', borderColor: '#fff', borderWidth: 2 }, moveHandleStyle: { color: '#245e86' }, dataBackground: { lineStyle: { color: '#94a58b', opacity: .45 }, areaStyle: { color: '#dfe7da', opacity: .55 } }, selectedDataBackground: { lineStyle: { color: '#245e86' }, areaStyle: { color: '#a9c8d9', opacity: .5 } }, textStyle: { color: chartText, fontSize: 9 } },
    ],
    series: [
      { name: '日票房', type: 'line' as const, smooth: .32, symbol: 'circle', showSymbol: false, data: trendRows.map((row) => row.revenue), lineStyle: { width: 3 }, areaStyle: { color: 'rgba(148,165,139,.12)' } },
      { name: '宣传内容数', type: 'bar' as const, yAxisIndex: 1, barMaxWidth: 16, data: trendRows.map((row) => row.mediaVolume), itemStyle: { color: '#B9D9B8', borderRadius: [8, 8, 0, 0], borderColor: '#183525', borderWidth: 1 } },
    ],
  });
  }, [trendRows]);

  return <div className="page trend-detail-page">
    <PageHeader eyebrow="DAILY PERFORMANCE LEDGER" title="票房与媒体声量表" description="按日对照票房、付费售票与五平台内容发布，默认从最近日期开始。" onOpenAgent={openAgent} action={<button className="secondary-back-button" onClick={() => navigate('/')}><ArrowLeft size={15} />返回总览</button>} />

    <Panel title="最近30日走势" eyebrow="票房与宣传内容联动" action={<div className="platform-pills" aria-label="媒体平台">{platformOptions.map((item) => <button key={item.value} aria-pressed={platform === item.value} className={platform === item.value ? 'active' : ''} onClick={() => setPlatform(item.value)}>{item.label}</button>)}</div>} className="trend-detail-chart-panel">
      {trends.isLoading ? <LoadingState /> : trends.error ? <ErrorState message={trends.error.message} onRetry={() => trends.refetch()} /> : trendRows.length ? <Chart option={chartOption} height={470} ariaLabel="票房和媒体声量日趋势图，默认显示最近30日并支持时间轴缩放" /> : <EmptyState />}
    </Panel>

    <Panel title="每日明细" eyebrow="最近日期优先" action={<span className="range-note"><CalendarDays size={14} />{trends.data?.rows.length || 0} 日</span>} className="trend-detail-table-panel">
      {trends.isLoading ? <LoadingState /> : trends.error ? <ErrorState message={trends.error.message} onRetry={() => trends.refetch()} /> : trends.data?.rows.length ? <div className="trend-detail-table-wrap"><table className="trend-detail-table"><thead><tr><th>日期</th><th>日票房</th><th>付费售票</th><th>订单数</th><th>宣传内容数</th></tr></thead><tbody>{[...trends.data.rows].reverse().map((row) => <tr key={row.date}><td><strong>{shortDate(row.date)}</strong><small>{row.date}</small></td><td><b>{formatCurrency(row.revenue)}</b></td><td><b>{formatNumber(row.tickets)}</b><span>张</span></td><td><b>{formatNumber(row.orders)}</b><span>单</span></td><td>{row.mediaVolume == null ? <em>暂无数据</em> : <><b>{formatNumber(row.mediaVolume)}</b><span>条</span></>}</td></tr>)}</tbody></table></div> : <EmptyState />}
    </Panel>
  </div>;
}
