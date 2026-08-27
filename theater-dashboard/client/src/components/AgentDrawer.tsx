import { useMutation } from '@tanstack/react-query';
import { ArrowUp, Bot, MessageSquareText, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../api';
import type { AgentResult } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

const quickQuestions = [
  '音乐剧《0528》相关词条',
  '音乐剧《简爱》浏览量',
  '最近30天票房最高的5场演出',
  '哪些演出的售票完成率低于80%',
  '本月总售票数、总宣传量和会员增长数分别是多少',
];

function getInsightDemo(question: string): AgentResult | null {
  const normalized = question.replace(/\s/g, '');
  const demo = /0528/.test(normalized)
    ? {
        subject: '音乐剧《0528》',
        totalViews: 412_900,
        rows: [
          { term: '#0528音乐剧', views: 118_600 },
          { term: '#音乐剧0528', views: 104_200 },
          { term: '#小鬼屋VS大鬼屋', views: 68_800 },
          { term: '#镜框版舞美升级', views: 46_300 },
          { term: '#Eggy角色曲《丑角》', views: 39_800 },
          { term: '#360度转台', views: 35_200 },
        ],
        conclusion: '剧名话题仍是主要入口，用户也明显关注“小鬼屋VS大鬼屋”、舞美升级、角色曲和 360 度转台等舞台记忆点。建议围绕这些具体内容资产拆分短视频和图文选题，并与剧名话题组合发布。',
      }
    : /简爱/.test(normalized)
      ? {
          subject: '音乐剧《简爱》',
          totalViews: 870_200,
          rows: [
            { term: '#简爱', views: 512_400 },
            { term: '#音乐剧简爱', views: 185_900 },
            { term: '#音乐剧简爱巡演', views: 97_600 },
            { term: '#音乐剧简爱repo', views: 74_300 },
          ],
          conclusion: '#简爱 的覆盖面最大，但会混入原著和影视内容；运营应以 #音乐剧简爱 作为主话题，再配合巡演和 repo 话题，提高演出内容的识别度与购票承接。',
        }
      : null;

  if (!demo) return null;
  return {
    answer: `已为你整理 ${demo.subject} 的相关词条浏览表现。`,
    visualization: { type: 'keyword-insight', rows: demo.rows },
    meta: { intent: 'keyword_insight', mode: 'frontend-demo', insight: demo },
  };
}

export function AgentDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [inputValue, setInputValue] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useMutation({ mutationFn: async (text: string) => getInsightDemo(text) || apiPost<AgentResult>('/api/agent/query', { question: text }) });
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150); }, [open]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const ask = (text: string) => {
    const nextQuestion = text.trim();
    if (!nextQuestion || mutation.isPending) return;
    setSubmittedQuestion(nextQuestion);
    setInputValue('');
    mutation.mutate(nextQuestion);
  };
  const rows = mutation.data?.visualization.rows || [];
  const insight = mutation.data?.meta.insight;
  return <>
    <button className={`drawer-backdrop ${open ? 'visible' : ''}`} onClick={onClose} aria-label="关闭演Xi助手" tabIndex={open ? 0 : -1} />
    <aside className={`agent-drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="演Xi助手" role="dialog" aria-modal="true">
      <div className="agent-header">
        <div className="agent-avatar"><Sparkles size={18} /></div>
        <div><strong>演Xi助手</strong><span><i />问数 · 洞察能力</span></div>
        <button className="icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
      </div>
      <div className="agent-body" aria-live="polite">
        {!mutation.data && !mutation.isPending && !mutation.error && <div className="agent-intro">
          <div className="agent-orb"><Bot size={26} /></div>
          <h2>想从数据里了解什么？</h2>
          <p>支持经营问数，也可以通过洞察能力查看剧名相关词条的浏览表现。</p>
          <div className="suggestions">{quickQuestions.map((item) => <button key={item} onClick={() => ask(item)}><MessageSquareText size={15} />{item}</button>)}</div>
        </div>}
        {mutation.isPending && <div className="agent-thinking"><span /><span /><span />正在分析口径并查询数据</div>}
        {mutation.error && <div className="agent-error">{mutation.error.message}</div>}
        {mutation.data && <div className="agent-result">
          <div className="user-message">{submittedQuestion}</div>
          <div className="assistant-message"><Sparkles size={15} /><p>{mutation.data.answer}</p></div>
          {insight ? <section className="insight-result" aria-label={`${insight.subject} 关键词洞察结果`}>
            <header><div><span>洞察能力</span><strong>{insight.subject}</strong></div><em>演示数据</em></header>
            <div className="insight-total"><span>相关话题浏览量</span><strong>{formatNumber(insight.totalViews)}<small>次</small></strong></div>
            <div className="insight-terms">{insight.rows.map((row) => <div className="insight-term" key={row.term}>
              <strong>{row.term}</strong><i><b style={{ width: `${Math.max(10, row.views / insight.rows[0].views * 100)}%` }} /></i><em>{formatNumber(row.views)} 次</em>
            </div>)}</div>
            <div className="insight-conclusion"><span>洞察结论</span><p>{insight.conclusion}</p></div>
          </section> : rows.length > 0 && <div className="agent-table"><div className="agent-table-head">查询结果 <span>{rows.length} 条</span></div>{rows.map((row, index) => {
            const label = String(row.showName || row.strategyType || (row.totalTickets != null ? '经营汇总' : `结果 ${index + 1}`));
            const value = Number(row.revenue ?? row.douyinRevenue ?? row.roi ?? row.completionRate ?? row.totalTickets ?? row.occupancyRate ?? 0);
            const currency = row.revenue != null || row.douyinRevenue != null;
            return <div className="agent-row" key={`${label}-${index}`}><span>{index + 1}</span><strong>{label}</strong><em>{currency ? formatCurrency(value, true) : value}</em></div>;
          })}</div>}
          <button className="ask-again" onClick={() => { mutation.reset(); setInputValue(''); setSubmittedQuestion(''); }}>继续提问</button>
        </div>}
      </div>
      <form className="agent-input" onSubmit={(event) => { event.preventDefault(); ask(inputValue); }}>
        <input ref={inputRef} value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder="例如：音乐剧《简爱》浏览量" aria-label="输入问题或剧名" />
        <button type="submit" disabled={!inputValue.trim() || mutation.isPending} aria-label="发送问题"><ArrowUp size={18} /></button>
      </form>
      <p className="agent-disclaimer">经营问数来自已核验数据源；洞察能力当前展示前端模拟数据</p>
    </aside>
  </>;
}
