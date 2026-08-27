import { motion } from 'framer-motion';
import type { Summary } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

export function PerformancePulse({ summary, mediaSummary, scopeDays, onScopeChange }: { summary: Summary; mediaSummary: Summary; scopeDays: 180 | 365; onScopeChange: (days: 180 | 365) => void }) {
  const cutoffLabel = summary.range.end.slice(5).replace('-', '.');
  const metrics = [
    { label: '售票完成率', value: summary.metrics.salesCompletionRate.available ? `${summary.metrics.salesCompletionRate.value.toFixed(1)}%` : '暂无目标', note: `全部项目累计至 ${cutoffLabel} · 工作票 ${formatNumber(summary.metrics.workTickets.value)} 张已排除`, formula: '累计付费售票数 ÷ 预计售票数 × 100%；金额为 0 的工作票不计入付费售票数。' },
    { label: '票房完成度', value: summary.metrics.boxOfficeCompletionRate.available ? `${summary.metrics.boxOfficeCompletionRate.value.toFixed(1)}%` : '暂无预估', note: `全部项目累计至 ${cutoffLabel}`, formula: '累计实际票房 ÷ 目标票房 × 100%；工作票金额为 0，不计入实际票房。' },
    { label: '上座率完成度', value: summary.metrics.occupancyRate.available ? `${summary.metrics.occupancyRate.value.toFixed(1)}%` : '-', note: summary.metrics.occupancyRate.available ? `有容量项目累计出票 ${formatNumber(summary.metrics.totalIssuedTickets.value)} 张` : '缺少可出票数', formula: '有可出票数据项目的累计总出票数 ÷ 可出票数 × 100%；总出票数包含工作票。' },
  ];
  return <motion.section className="pulse-panel pulse-panel-v3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
    <div className="pulse-revenue">
      <span className="section-index">01 · 经营结果</span>
      <div className="pulse-scope"><span>总票房范围</span><div className="segmented compact-segmented" aria-label="总票房统计范围">{([180, 365] as const).map((period) => <button key={period} aria-pressed={scopeDays === period} className={scopeDays === period ? 'active' : ''} onClick={() => onScopeChange(period)}>{period === 180 ? '半年' : '一年'}</button>)}</div></div>
      <p>{scopeDays === 180 ? '半年总票房' : '年度总票房'}</p><strong>{formatCurrency(summary.metrics.totalRevenue.value, true)}</strong>
      <small>{summary.metrics.totalRevenue.changePct == null ? '暂无周期对比' : `较上周期 ${summary.metrics.totalRevenue.changePct > 0 ? '+' : ''}${summary.metrics.totalRevenue.changePct}%`}</small>
      <div className="pulse-metric-row">{metrics.map((metric, index) => <motion.div className="formula-metric" data-formula={metric.formula} tabIndex={0} aria-label={`${metric.label}：${metric.value}。计算公式：${metric.formula}`} key={metric.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15 + index * .08 }}><span>{metric.label}</span><b>{metric.value}</b><small>{metric.note}</small></motion.div>)}</div>
    </div>
    <div className="pulse-media-core">
      <span className="section-index">02 · 新媒体累计</span>
      <div><span>平台净增粉丝</span><strong>{mediaSummary.metrics.mediaFollowerGrowth.available ? `${mediaSummary.metrics.mediaFollowerGrowth.value > 0 ? '+' : ''}${formatNumber(mediaSummary.metrics.mediaFollowerGrowth.value)}` : '-'}</strong><small>全部项目累计：期末粉丝数 − 期初粉丝数</small></div>
      <div><span>平台互动量</span><strong>{mediaSummary.metrics.mediaInteractions.available ? formatNumber(mediaSummary.metrics.mediaInteractions.value) : '-'}</strong><small>全部项目累计：点赞 + 评论 + 转发</small></div>
      <div><span>总宣传量</span><strong>{formatNumber(mediaSummary.metrics.mediaVolume.value)}</strong><small>全部项目累计：实际发布内容数</small></div>
    </div>
  </motion.section>;
}
