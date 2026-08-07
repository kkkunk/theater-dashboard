import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export function Chart({ option, height = 300, ariaLabel }: { option: unknown; height?: number; ariaLabel: string }) {
  return <div role="img" aria-label={ariaLabel}><ReactECharts option={option as EChartsOption} notMerge lazyUpdate style={{ height }} opts={{ renderer: 'canvas' }} /></div>;
}

export const chartText = '#7f8da8';
export const chartGrid = 'rgba(127, 141, 168, .12)';
export const tooltip = {
  backgroundColor: '#182235', borderColor: '#2a3850', textStyle: { color: '#e8eef9', fontSize: 12 },
};
