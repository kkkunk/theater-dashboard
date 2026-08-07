import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowUp, Bot, MessageSquareText, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../api';
import type { AgentResult } from '../types';
import { formatCurrency } from '../utils/format';

type Capabilities = { mode: string; questions: string[] };

export function AgentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const capabilities = useQuery({ queryKey: ['agent-capabilities'], queryFn: ({ signal }) => apiGet<Capabilities>('/api/agent/capabilities', signal), enabled: open });
  const mutation = useMutation({ mutationFn: (text: string) => apiPost<AgentResult>('/api/agent/query', { question: text }) });
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const ask = (text: string) => {
    if (!text.trim() || mutation.isPending) return;
    setQuestion(text); mutation.mutate(text);
  };
  const rows = mutation.data?.visualization.rows || [];
  return <>
    <button className={`drawer-backdrop ${open ? 'visible' : ''}`} onClick={onClose} aria-label="关闭智能问数" tabIndex={open ? 0 : -1} />
    <aside className={`agent-drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="智能问数助手">
      <div className="agent-header">
        <div className="agent-avatar"><Sparkles size={18} /></div>
        <div><strong>演析助手</strong><span><i />受控问数模式</span></div>
        <button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
      </div>
      <div className="agent-body">
        {!mutation.data && !mutation.isPending && !mutation.error && <div className="agent-intro">
          <div className="agent-orb"><Bot size={26} /></div>
          <h2>想从数据里了解什么？</h2>
          <p>我可以查询票房、媒体声量、渠道贡献、复购率和策略 ROI。</p>
          <div className="suggestions">{capabilities.data?.questions.map((item) => <button key={item} onClick={() => ask(item)}><MessageSquareText size={15} />{item}</button>)}</div>
        </div>}
        {mutation.isPending && <div className="agent-thinking"><span /><span /><span />正在分析口径并查询数据</div>}
        {mutation.error && <div className="agent-error">{mutation.error.message}</div>}
        {mutation.data && <div className="agent-result">
          <div className="user-message">{question}</div>
          <div className="assistant-message"><Sparkles size={15} /><p>{mutation.data.answer}</p></div>
          {rows.length > 0 && <div className="agent-table"><div className="agent-table-head">查询结果 <span>{rows.length} 条</span></div>{rows.map((row, index) => {
            const label = String(row.showName || row.strategyType || `结果 ${index + 1}`);
            const value = Number(row.revenue ?? row.douyinRevenue ?? row.roi ?? row.repeatRate ?? row.occupancyRate ?? 0);
            const currency = row.revenue != null || row.douyinRevenue != null;
            return <div className="agent-row" key={`${label}-${index}`}><span>{index + 1}</span><strong>{label}</strong><em>{currency ? formatCurrency(value, true) : value}</em></div>;
          })}</div>}
          <button className="ask-again" onClick={() => { mutation.reset(); setQuestion(''); }}>继续提问</button>
        </div>}
      </div>
      <form className="agent-input" onSubmit={(event) => { event.preventDefault(); ask(question); }}>
        <input ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：最近30天票房最高的5场演出" aria-label="输入数据问题" />
        <button type="submit" disabled={!question.trim() || mutation.isPending} aria-label="发送问题"><ArrowUp size={18} /></button>
      </form>
      <p className="agent-disclaimer">结果来自演示数据库，策略影响金额为人工录入口径</p>
    </aside>
  </>;
}
