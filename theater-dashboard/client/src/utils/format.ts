export function formatCurrency(value: number, compact = false) {
  if (compact && Math.abs(value) >= 10_000) return `¥${(value / 10_000).toFixed(value >= 1_000_000 ? 0 : 1)}万`;
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

export function shortDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function dateTimeLabel(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function showIdentity(fullName: string, shortName?: string | null) {
  const title = shortName?.trim() || fullName.trim();
  if (!fullName || fullName.trim() === title) return { title, subtitle: '' };

  let subtitle = fullName.replace(title, ' ');
  if (subtitle === fullName) {
    const bracketedTitle = title.match(/《[^》]+》/)?.[0];
    if (bracketedTitle && fullName.includes(bracketedTitle)) {
      subtitle = fullName.replace(bracketedTitle, ' ');
      const titlePrefix = title.replace(bracketedTitle, '').trim();
      if (titlePrefix) subtitle = subtitle.replace(titlePrefix, ' ');
    }
  }

  subtitle = subtitle.replace(/\s+/g, ' ').trim();
  return { title, subtitle: subtitle === title ? '' : subtitle };
}
