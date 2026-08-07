import { AlertCircle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';

export function LoadingState({ compact = false }: { compact?: boolean }) {
  return <div className={`data-state ${compact ? 'compact' : ''}`} role="status"><LoaderCircle className="spin" size={20} /><span>正在整理数据…</span></div>;
}

export function EmptyState({ label = '当前筛选范围内没有数据' }: { label?: string }) {
  return <div className="data-state"><Inbox size={20} /><span>{label}</span></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="data-state error" role="alert"><AlertCircle size={20} /><span>{message}</span>{onRetry && <button className="text-button" onClick={onRetry}><RefreshCw size={14} />重试</button>}</div>;
}
