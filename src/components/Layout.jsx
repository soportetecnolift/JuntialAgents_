import OrgSwitcher from './OrgSwitcher.jsx';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Search, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, LogOut, Sun, Moon, Monitor, Grid2x2 } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { getSocket, closeSocket } from '../lib/socket.js';
import { getTheme, setTheme, haptic } from '../lib/theme.js';
import { Modal, useToast } from './ui.jsx';
import { navFor, utilNav } from './nav.js';
import CommandPalette from './CommandPalette.jsx';

const ROLE_ES = { superadmin: 'Superadmin', admin: 'Administrador', employee: 'Empleado', client: 'Cliente' };
const Avatar = ({ user, size = 32 }) => (user.avatar
  ? <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />
  : <span className="grid place-items-center rounded-full bg-tide font-bold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>{(user.name || user.email)[0].toUpperCase()}</span>);

export function ThemeSwitch() {
  const [t, setT] = useState(getTheme());
  const opts = [['system', Monitor, 'Sistema'], ['light', Sun, 'Claro'], ['dark', Moon, 'Oscuro']];
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-lg bg-mist p-1">
      {opts.map(([v, Icon, l]) => <button key={v} role="radio" aria-checked={t === v} onClick={() => { setTheme(v); setT(v); }} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-md text-xs font-semibold ${t === v ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft'}`}><Icon size={14} />{l}</button>)}
    </div>
  );
}


/** Elemento de menú: interno (NavLink) o externo (enlace a Juntial Center). */
function NavItem({ i, className, children, ...rest }) {
  if (i.href) return <a href={i.href} className={typeof className === 'function' ? className({ isActive: false }) : className} {...rest}>{children}</a>;
  return <NavLink to={i.to} end={i.end} className={className} {...rest}>{children}</NavLink>;
}

export default function Layout() {
  const { user, logout } = useAuth(); const nav = useNavigate(); const loc = useLocation(); const qc = useQueryClient(); const toast = useToast();
  const [rail, setRail] = useState(() => localStorage.getItem('ja-rail') === '1');
  const [more, setMore] = useState(false); const [palette, setPalette] = useState(false);
  const { data: notif } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications?limit=1').then((r) => r.data), refetchInterval: 60000 });
  const items = navFor(user); const primary = items.filter((i) => i.primary); const secondary = items.filter((i) => !i.primary);

  useEffect(() => {
    const s = getSocket();
    const onN = (n) => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast(n.title, n.severity === 'error' ? 'bad' : 'ok'); };
    s.on('notification', onN); return () => { s.off('notification', onN); };
  }, [qc, toast]);
  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { setMore(false); window.scrollTo({ top: 0 }); }, [loc.pathname]);
  const out = async () => { const staff = user.role !== 'client'; closeSocket(); await logout(); nav('/login'); };
  const unread = notif?.unread || 0;
  const ide = /^\/crm\/functions\/[^/]+/.test(loc.pathname); // el IDE ocupa todo el ancho y alto disponibles

  return (
    <div className="min-h-[100dvh] md:flex">
      {/* ── Escritorio: barra lateral con modo "rail" ── */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-harbor text-white transition-[width] md:flex ${rail ? 'w-[72px]' : 'w-60'}`}>
        <div className={`flex items-center gap-2 px-4 pb-5 pt-5 ${rail ? 'justify-center' : ''}`}>
          <img src="/icon.svg" alt="" className="h-8 w-8" />{!rail && <div><p className="font-extrabold leading-tight">JuntialAgents</p><p className="text-xs text-harbor-300">{ROLE_ES[user.role]}</p></div>}
        </div>
        {user.role === 'client' && <div className="mx-3 mb-3"><OrgSwitcher compact={rail} /></div>}
        <button onClick={() => setPalette(true)} className={`mx-3 mb-4 flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm text-harbor-300 hover:text-white ${rail ? 'justify-center px-0' : ''}`} title="Buscar (Ctrl+K)">
          <Search size={16} />{!rail && <><span className="flex-1 text-left">Buscar</span><kbd className="text-[11px]">⌘K</kbd></>}
        </button>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map((i, k) => <div key={i.to || i.href}>{!rail && i.group && i.group !== items[k - 1]?.group && <p className="px-3 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-wider text-harbor-300/70">{i.group}</p>}<NavItem i={i} title={rail ? i.label : undefined} className={({ isActive }) => `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${rail ? 'justify-center px-0' : ''} ${isActive ? 'bg-harbor-600 text-white' : 'text-harbor-300 hover:text-white'}`}><i.icon size={18} className="shrink-0" />{!rail && i.label}</NavItem></div>)}
        </nav>
        <div className="space-y-0.5 border-t border-white/10 p-3">
          {utilNav.map((i) => <NavLink key={i.to} to={i.to} title={rail ? i.label : undefined} className={({ isActive }) => `relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${rail ? 'justify-center px-0' : ''} ${isActive ? 'bg-harbor-600 text-white' : 'text-harbor-300 hover:text-white'}`}><i.icon size={18} />{!rail && i.label}{i.to === '/notifications' && unread > 0 && <span className={`rounded-full bg-flare px-1.5 text-[11px] text-white ${rail ? 'absolute right-2 top-1' : 'ml-auto'}`}>{unread}</span>}</NavLink>)}
          <button onClick={() => { const v = !rail; setRail(v); localStorage.setItem('ja-rail', v ? '1' : '0'); }} className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-harbor-300 hover:text-white ${rail ? 'justify-center px-0' : ''}`}>{rail ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} />Contraer</>}</button>
          <div className={`flex items-center gap-2 px-1 pt-2 ${rail ? 'justify-center' : ''}`}><Avatar user={user} />{!rail && <><span className="min-w-0 flex-1 truncate text-sm">{user.name || user.email}</span><button onClick={out} title="Salir" className="text-harbor-300 hover:text-white"><LogOut size={16} /></button></>}</div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ── Móvil: barra superior translúcida ── */}
        <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-end border-b border-line/70 bg-mist/85 px-4 pb-2 pt-safe-t backdrop-blur-xl md:hidden">
          <div className="flex w-full items-center gap-2">
            <img src="/icon.svg" alt="" className="h-7 w-7" /><span className="flex-1 font-extrabold">JuntialAgents</span>
            <button onClick={() => setPalette(true)} aria-label="Buscar" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface"><Search size={20} /></button>
            <NavLink to="/notifications" aria-label="Avisos" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-surface"><Bell size={20} />{unread > 0 && <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-flare px-1 text-center text-[10px] font-bold text-white">{unread}</span>}</NavLink>
            <button onClick={() => setMore(true)} aria-label="Cuenta"><Avatar user={user} size={30} /></button>
          </div>
        </header>

        <main className={ide ? 'h-[calc(100dvh-3.5rem-env(safe-area-inset-top)-var(--nav-h)-env(safe-area-inset-bottom)-1.5rem)] md:h-[100dvh] md:p-0' : 'mx-auto max-w-6xl px-4 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+2rem)] pt-5 md:px-8 md:pb-10 md:pt-8'}><Outlet /></main>
      </div>

      {/* ── Móvil: barra inferior flotante tipo "glass" (zona del pulgar) ── */}
      <nav aria-label="Principal" className="glass fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 flex h-[var(--nav-h)] items-stretch rounded-[1.6rem] px-1.5 md:hidden">
        {primary.map((i) => <NavLink key={i.to} to={i.to} end={i.end} onClick={haptic} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.2rem] text-[11px] font-semibold transition ${isActive ? 'text-tide-dark' : 'text-ink-soft'}`}>
          {({ isActive }) => <><span className={`grid h-8 w-12 place-items-center rounded-full transition ${isActive ? 'bg-tide-tint' : ''}`}><i.icon size={20} strokeWidth={isActive ? 2.4 : 2} /></span>{i.label}</>}
        </NavLink>)}
        <button onClick={() => { haptic(); setMore(true); }} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-ink-soft"><span className="grid h-8 w-12 place-items-center"><Grid2x2 size={20} /></span>Más</button>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title={user.name || user.email}>
        <p className="-mt-2 text-sm text-ink-soft">{user.email} · {ROLE_ES[user.role]}</p>
        <div className="grid grid-cols-3 gap-2">
          {[...secondary, ...utilNav].map((i) => <NavItem key={i.to || i.href} i={i} className={({ isActive }) => `flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold ${isActive ? 'border-tide bg-tide-tint text-tide-dark' : 'border-line'}`}><i.icon size={22} />{i.label}</NavItem>)}
        </div>
        <div><p className="label">Apariencia</p><ThemeSwitch /></div>
        <button onClick={out} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-flare/40 font-semibold text-flare"><LogOut size={18} />Cerrar sesión</button>
      </Modal>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
