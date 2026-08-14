import { useState } from 'react';
import { LockKeyhole, Search, Smartphone } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { useShell } from '../components/AppShell';

export function MemberSalesPage() {
  const [phone, setPhone] = useState('');
  const [year, setYear] = useState('2026');
  const [submitted, setSubmitted] = useState(false);
  const { openAgent } = useShell();
  return <div className="page member-page">
    <PageHeader eyebrow="MEMBER TICKET ANALYSIS" title="会员售票分析" description="按自然年查询手机号对应的购票金额、票数与项目明细。" onOpenAgent={openAgent} />
    <Panel title="手机号查询" eyebrow="1月1日—12月31日" className="member-search-panel">
      <form className="member-search-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
        <label><span>手机号</span><div><Smartphone size={17} /><input inputMode="numeric" maxLength={11} value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '')); setSubmitted(false); }} placeholder="请输入完整手机号" /></div></label>
        <label><span>统计年度</span><select value={year} onChange={(event) => setYear(event.target.value)}><option>2026</option><option>2025</option><option>2024</option></select></label>
        <button type="submit" disabled={phone.length !== 11}><Search size={16} />查询</button>
      </form>
      <div className="member-data-notice"><LockKeyhole size={22} /><div><strong>{submitted ? '当前数据源无法完成本次查询' : '等待可授权的手机号订单映射'}</strong><p>本批实名制订单报表没有手机号字段，因此不会生成虚假会员消费记录。补充手机号—订单映射并完成权限校验后，这里将展示 {year} 自然年的购票总额、票数、订单数、项目数和明细。</p></div></div>
    </Panel>
  </div>;
}
