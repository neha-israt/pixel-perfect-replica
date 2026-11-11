import { Link, useRouterState } from '@tanstack/react-router';
import { ArrowUpRight, Check, ChevronDown, ClipboardList, History, Package, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import parcels from '@/assets/parcels.jpg';

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: s => s.location.pathname });
  return <div className="app-shell">
    <aside className="sidebar">
      <Link to="/" className="brand"><span className="brand-mark"><Package size={23}/></span>OrderClean<span className="text-primary text-xs self-start mt-1">BD</span></Link>
      <div className="nav-label">WORKSPACE</div>
      <nav><Link to="/" title="Order workspace" className={`nav-item ${path === '/' ? 'active' : ''}`}><ClipboardList size={17}/>Order workspace</Link><Link to="/history" title="Batch history" className={`nav-item ${path === '/history' ? 'active' : ''}`}><History size={17}/>Batch history</Link></nav>
      <div className="sidebar-promo"><img src={parcels} alt="Mint courier parcels and a delivery location pin" width={512} height={512} loading="lazy"/><h3>A little less messy.<br/>A lot more delivered.</h3><p>From your inbox to the next doorstep.</p><div className="mt-3 flex items-center gap-1 text-primary text-[11px]">Made for Bangladesh <ArrowUpRight size={13}/></div></div>
      <div className="profile"><span className="avatar">MS</span><div><p className="text-xs font-semibold">My shop</p><p className="text-[10px] text-muted-foreground mt-1">Local workspace</p></div><ChevronDown size={13} className="ml-auto text-muted-foreground"/></div>
    </aside>
    <div className="min-w-0"><header className="topbar"><div className="flex items-center gap-2 text-xs text-muted-foreground">Workspace <span className="mx-1">/</span><span className="text-foreground font-medium">{path === '/history' ? 'Batch history' : 'Order clean-up'}</span></div><div className="flex items-center gap-5"><span className="desktop-only flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck size={14}/>Private on this device</span><span className="tag good"><Check size={12}/>Free workspace</span></div></header><main className="workspace">{children}<footer className="footer"><span>Less copy-paste. More deliveries.</span><span className="flex gap-1 items-center">Made with care in Bangladesh <span className="text-primary">●</span></span></footer></main></div>
  </div>;
}