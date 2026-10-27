import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, CornerDownLeft, Bot } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { navFor, utilNav } from './nav.js';

/** Paleta de comandos (⌘K / Ctrl+K en escritorio, botón de búsqueda en móvil): ir a cualquier página o bot. */
export default function CommandPalette({ open, onClose }) {
  const { user } = useAuth(); const nav = useNavigate(); const [q, setQ] = useState(''); const [i, setI] = useState(0); const input = useRef(null);
  const bots = useQuery({ queryKey: ['bots'], enabled: open && user.role === 'client', queryFn: () => api.get('/bots').then((r) => r.data) });
  const items = useMemo(() => {
    const pages = [...navFor(user), ...utilNav].map((n) => ({ id: n.to, label: n.label, hint: 'Página', icon: n.icon, go: n.to }));
    const b = (bots.data || []).map((x) => ({ id: x._id, label: x.name, hint: x.telegram?.username ? `@${x.telegram.username}` : 'Bot', icon: Bot, go: `/bots/${x._id}` }));
    const all = [...pages, ...b]; const s = q.trim().toLowerCase();
    return s ? all.filter((x) => `${x.label} ${x.hint}`.toLowerCase().includes(s)) : all;
  }, [q, bots.data, user]);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  useEffect(() => setI(0), [q]);
  if (!open) return null;
  const go = (x) => { nav(x.go); onClose(); };
  return (
    <div className="fixed inset-0 z-[70] flex animate-fade items-start justify-center bg-harbor/50 backdrop-blur-sm md:pt-[12vh]" onMouseDown={onClose}>
      <div className="flex h-[100dvh] w-full flex-col bg-surface pt-safe-t md:h-auto md:max-h-[70vh] md:max-w-xl md:rounded-xl md:pt-0 md:shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="text-ink-soft" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar páginas y bots…" aria-label="Buscar"
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, items.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); } if (e.key === 'Enter' && items[i]) go(items[i]); if (e.key === 'Escape') onClose(); }}
            className="h-14 flex-1 bg-transparent text-[16px] outline-none" />
          <button onClick={onClose} className="text-sm font-semibold text-tide md:hidden">Cerrar</button>
          <kbd className="hidden rounded border border-line px-1.5 text-xs text-ink-soft md:block">Esc</kbd>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">{items.length ? items.map((x, k) => { const Icon = x.icon; return (
          <li key={x.id}><button onMouseEnter={() => setI(k)} onClick={() => go(x)} className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left ${k === i ? 'bg-tide-tint text-tide-dark' : ''}`}>
            <Icon size={18} className="shrink-0" /><span className="flex-1 font-semibold">{x.label}</span><span className="text-xs text-ink-soft">{x.hint}</span>{k === i && <CornerDownLeft size={14} className="hidden md:block" />}
          </button></li>); }) : <li className="px-3 py-8 text-center text-sm text-ink-soft">Nada coincide con “{q}”.</li>}</ul>
      </div>
    </div>
  );
}
