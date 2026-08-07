import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Chart } from './Chart';
import type { Metric } from '../types';

export function MetricCard({ label, valueLabel, metric, spark, accent, delay = 0 }: { label: string; valueLabel: string; metric: Metric; spark: number[]; accent: string; delay?: number }) {
  const direction = metric.changePct == null ? 'flat' : metric.changePct > 0 ? 'up' : metric.changePct < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const good = label === '上座率' || label === '总票房' || label === '复购率' || label === '媒体声量';
  const changeClass = direction === 'flat' ? 'neutral' : (direction === 'up') === good ? 'positive' : 'negative';
  const option = {
    animation: true, grid: { left: 0, right: 0, top: 4, bottom: 0 },
    xAxis: { type: 'category' as const, show: false, data: spark.map((_, index) => index) },
    yAxis: { type: 'value' as const, show: false, scale: true },
    series: [{ type: 'line' as const, data: spark, smooth: .35, symbol: 'none', lineStyle: { width: 2, color: accent }, areaStyle: { color: `${accent}18` } }],
  };
  return <motion.article className="metric-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: .35 }}>
    <div className="metric-top"><span>{label}</span><span className={`metric-change ${changeClass}`}><Icon size={13} />{metric.changePct == null ? '暂无对比' : `${Math.abs(metric.changePct)}${metric.unit === 'percentage_point' ? 'pt' : '%'}`}</span></div>
    <strong>{valueLabel}</strong>
    <div className="metric-spark"><Chart option={option} height={48} ariaLabel={`${label}迷你趋势`} /></div>
  </motion.article>;
}
