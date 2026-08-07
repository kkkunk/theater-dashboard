import type { ReactNode } from 'react';
import { Bot } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, action, onOpenAgent }: { eyebrow: string; title: string; description: string; action?: ReactNode; onOpenAgent: () => void }) {
  return <header className="page-header">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    <div className="page-actions">{action}<button className="primary-button" onClick={onOpenAgent}><Bot size={17} />智能问数</button></div>
  </header>;
}
