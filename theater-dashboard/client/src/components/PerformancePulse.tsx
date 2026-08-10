import { motion } from 'framer-motion';
import { Chart } from './Chart';
import type { Summary } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

const pulseColors = ['#183525', '#94A58B', '#B9D9B8'];

export function PerformancePulse({ summary }: { summary: Summary }) {
  const rings = [
    { label: '售票完成率', value: summary.metrics.salesCompletionRate.value, note: '目标进度', color: pulseColors[0] },
    { label: '上座率', value: summary.metrics.occupancyRate.value, note: '座席转化', color: pulseColors[1] },
    { label: '票房增幅', value: Math.max(0, summary.metrics.totalRevenue.changePct || 0), note: '较上周期', color: pulseColors[2] },
  ];
  const option = {
    animationDuration: 1100,
    animationEasing: 'cubicOut',
    series: rings.map((ring, index) => ({
      type: 'gauge' as const,
      startAngle: 215,
      endAngle: -35,
      radius: `${94 - index * 20}%`,
      center: ['50%', '52%'],
      min: 0,
      max: 100,
      splitNumber: 1,
      pointer: { show: false },
      progress: { show: true, roundCap: true, width: 13, itemStyle: { color: ring.color } },
      axisLine: { roundCap: true, lineStyle: { width: 13, color: [[1, '#E2E5DC']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: { show: false },
      data: [{ value: Math.min(ring.value, 100) }],
    })),
    graphic: [
      { type: 'text', left: 'center', top: '42%', style: { text: formatCurrency(summary.metrics.totalRevenue.value, true), fill: '#183525', font: '700 25px ui-monospace, monospace', textAlign: 'center' } },
      { type: 'text', left: 'center', top: '55%', style: { text: '30 日总票房', fill: '#6F7D70', font: '11px sans-serif', textAlign: 'center' } },
    ],
  };

  return <motion.section className="pulse-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
    <div className="pulse-visual">
      <span className="section-index">01 · 经营脉冲</span>
      <Chart option={option} height={270} ariaLabel="票房、售票完成率和上座率经营脉冲图" />
    </div>
    <div className="pulse-copy">
      <span className="eyebrow">PERFORMANCE PULSE</span>
      <h2>一眼读懂<br />经营健康度</h2>
      <p>同心环把票房增长、目标进度与座席转化放在同一视野，先判断售票是否跟上计划，再进入演出复盘。</p>
      <div className="pulse-legend">{rings.map((ring, index) => <motion.div key={ring.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .25 + index * .1 }}>
        <i style={{ background: ring.color }} />
        <span><strong>{ring.label}</strong><small>{ring.note}</small></span>
        <b>{ring.value.toFixed(1)}%</b>
      </motion.div>)}</div>
      <div className="pulse-media"><span>总宣传量</span><strong>{formatNumber(summary.metrics.mediaVolume.value)}</strong><small>{summary.metrics.mediaVolume.changePct == null ? '暂无周期对比' : `较上周期 ${summary.metrics.mediaVolume.changePct > 0 ? '+' : ''}${summary.metrics.mediaVolume.changePct}%`}</small></div>
    </div>
  </motion.section>;
}
