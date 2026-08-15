import { motion } from 'framer-motion';
import type { Summary } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

export function PerformancePulse({ summary }: { summary: Summary }) {
  const metrics = [
    { label: '售票完成率', value: summary.metrics.salesCompletionRate.available ? `${summary.metrics.salesCompletionRate.value.toFixed(1)}%` : '暂无目标', note: `赠票 ${formatNumber(summary.metrics.complimentaryTickets.value)} 张（已排除）` },
    { label: '票房完成度', value: summary.metrics.boxOfficeCompletionRate.available ? `${summary.metrics.boxOfficeCompletionRate.value.toFixed(1)}%` : '暂无预估', note: '实际票房 / 预计票房' },
    { label: '付费上座率', value: summary.metrics.occupancyRate.available ? `${summary.metrics.occupancyRate.value.toFixed(1)}%` : '暂无数据', note: summary.metrics.occupancyRate.available ? '赠票不计入分子' : '缺少可售座位数' },
  ];
  return <motion.section className="pulse-panel pulse-panel-v3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
    <div className="pulse-revenue">
      <span className="section-index">01 · 经营结果</span>
      <p>周期总票房</p><strong>{formatCurrency(summary.metrics.totalRevenue.value, true)}</strong>
      <small>{summary.metrics.totalRevenue.changePct == null ? '暂无周期对比' : `较上周期 ${summary.metrics.totalRevenue.changePct > 0 ? '+' : ''}${summary.metrics.totalRevenue.changePct}%`}</small>
      <div className="pulse-metric-row">{metrics.map((metric, index) => <motion.div key={metric.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 + index * .08 }}><span>{metric.label}</span><b>{metric.value}</b><small>{metric.note}</small></motion.div>)}</div>
    </div>
    <div className="pulse-media-core">
      <span className="section-index">02 · 新媒体增长</span>
      <div><span>平台净增粉丝</span><strong>{summary.metrics.mediaFollowerGrowth.available ? `${summary.metrics.mediaFollowerGrowth.value > 0 ? '+' : ''}${formatNumber(summary.metrics.mediaFollowerGrowth.value)}` : '暂无数据'}</strong><small>期末粉丝数 − 期初粉丝数</small></div>
      <div><span>平台互动量</span><strong>{summary.metrics.mediaInteractions.available ? formatNumber(summary.metrics.mediaInteractions.value) : '暂无数据'}</strong><small>点赞 + 评论 + 转发</small></div>
      <div><span>总宣传量</span><strong>{formatNumber(summary.metrics.mediaVolume.value)}</strong><small>实际发布内容数</small></div>
    </div>
  </motion.section>;
}
