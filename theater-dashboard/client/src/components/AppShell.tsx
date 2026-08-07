import { BarChart3, Bot, CalendarRange, LayoutDashboard, Menu, Sparkles, X } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AgentDrawer } from './AgentDrawer';
import { useRouter } from '../router';

const navItems = [
  { to: '/', label: '经营总览', icon: LayoutDashboard, end: true },
  { to: '/shows/1', label: '单场分析', icon: CalendarRange },
  { to: '/reviews', label: '渠道与策略', icon: BarChart3 },
];

const ShellContext = createContext<{ openAgent: () => void } | null>(null);

export function AppShell({ children }: { children: ReactNode }) {
  const [agentOpen, setAgentOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const { pathname, navigate } = useRouter();
  useEffect(() => setMobileNav(false), [pathname]);
  const openAgent = () => setAgentOpen(true);
  return <ShellContext.Provider value={{ openAgent }}><div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
        <div><strong>演析</strong><small>宣发转化看板</small></div>
        <button className="icon-button close-nav" onClick={() => setMobileNav(false)} aria-label="关闭导航"><X size={18} /></button>
      </div>
      <nav aria-label="主导航">
        <span className="nav-label">工作台</span>
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = label === '经营总览' ? pathname === '/' : label === '单场分析' ? pathname.startsWith('/shows/') : pathname === to;
          return <a key={to} href={to} className={active ? 'active' : ''} onClick={(event) => { event.preventDefault(); navigate(to); }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></a>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="data-status"><span className="live-dot" /><div><strong>数据运行正常</strong><small>基准日 2026.08.07</small></div></div>
        <p>演示数据 · 每日更新</p>
      </div>
    </aside>
    {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="关闭导航遮罩" />}
    <main className="main-content">
      <div className="mobile-bar">
        <button className="icon-button" onClick={() => setMobileNav(true)} aria-label="打开导航"><Menu size={20} /></button>
        <div className="mobile-brand"><Sparkles size={16} />演析</div>
        <button className="icon-button" onClick={openAgent} aria-label="打开智能问数"><Bot size={20} /></button>
      </div>
      {children}
    </main>
    <AgentDrawer open={agentOpen} onClose={() => setAgentOpen(false)} />
  </div></ShellContext.Provider>;
}

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error('useShell must be used inside AppShell');
  return value;
}
