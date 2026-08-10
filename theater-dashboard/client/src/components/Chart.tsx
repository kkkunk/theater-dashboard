import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export function Chart({ option, height = 300, ariaLabel }: { option: unknown; height?: number; ariaLabel: string }) {
  return <div role="img" aria-label={ariaLabel}><ReactECharts option={option as EChartsOption} notMerge lazyUpdate style={{ height }} opts={{ renderer: 'canvas' }} /></div>;
}

export const chartText = '#718071';
export const chartGrid = 'rgba(24, 53, 37, .11)';
export const tooltip = {
  backgroundColor: '#183525', borderColor: '#183525', borderWidth: 1, textStyle: { color: '#f5f6f1', fontSize: 12 }, extraCssText: 'border-radius: 12px; box-shadow: 0 12px 28px rgba(24,53,37,.18);',
};
