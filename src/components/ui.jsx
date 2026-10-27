import { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { Check, Copy, X } from 'lucide-react';

export function Button({ variant = 'primary', size = 'md', loading, className = '', children, ...p }) {
  const v = {
    primary: 'bg-tide text-white hover:brightness-110 active:brightness-95',
    secondary: 'bg-surface text-ink border border-line hover:border-harbor-300',
    danger: 'bg-surface text-flare border border-flare/40 hover:bg-flare-tint',
    ghost: 'text-ink-soft hover:text-ink hover:bg-mist',
  }[variant];
  // ≥44 px de alto en móvil (Apple HIG / Material: objetivos táctiles de 44–48 px)
  const s = size === 'sm' ? 'min-h-9 px-3 text-xs md:min-h-0 md:px-2.5 md:py-1' : 'min-h-11 px-4 text-sm md:min-h-0 md:py-2';
  return <button {...p} disabled={loading || p.disabled} className={`inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[.98] disabled:opacity-50 ${v} ${s} ${className}`}>{loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />}{children}</button>;
}
export const Field = ({ label, hint, error, children }) => (
  <label className="block"><span className="label">{label}</span>{children}{error ? <p className="mt-1 text-xs text-flare">{error}</p> : hint && <p className="hint">{hint}</p>}</label>
);
export const Input = (p) => <input {...p} className={`field ${p.className || ''}`} />;
export const Textarea = (p) => <textarea {...p} className={`field ${p.className || ''}`} />;
export const Select = ({ options, ...p }) => <select {...p} className="field">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
export const Toggle = ({ checked, onChange, label, hint }) => (
  <label className="flex min-h-11 cursor-pointer items-start gap-3 md:min-h-0">
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`mt-0.5 h-6 w-11 shrink-0 rounded-full transition md:h-5 md:w-9 ${checked ? 'bg-tide' : 'bg-line'}`}><span className={`block h-5 w-5 rounded-full bg-white shadow transition md:h-4 md:w-4 ${checked ? 'translate-x-[22px] md:translate-x-[18px]' : 'translate-x-0.5'}`} /></button>
    <span><span className="text-sm font-semibold">{label}</span>{hint && <span className="block text-xs text-ink-soft">{hint}</span>}</span>
  </label>
);
const tones = { ok: 'bg-tide-tint text-tide-dark', warn: 'bg-signal-tint text-signal', bad: 'bg-flare-tint text-flare', neutral: 'bg-mist text-ink-soft' };
export const Badge = ({ tone = 'neutral', children }) => <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
export const Section = ({ title, description, actions, children }) => (
  <section className="panel p-4 md:p-5">
    {(title || actions) && <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2>{title}</h2>{description && <p className="mt-0.5 max-w-prose text-sm text-ink-soft">{description}</p>}</div>{actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}</div>}
    {children}
  </section>
);
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between"><div className="min-w-0"><h1 className="truncate">{title}</h1>{subtitle && <p className="mt-1 text-sm text-ink-soft md:text-base">{subtitle}</p>}</div>{actions && <div className="flex flex-wrap gap-2 [&>*]:flex-1 [&_button]:w-full md:[&>*]:flex-none md:[&_button]:w-auto">{actions}</div>}</div>
);
export const Empty = ({ title, children, action }) => (
  <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-12 text-center"><p className="font-bold">{title}</p><p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{children}</p>{action && <div className="mt-5">{action}</div>}</div>
);

/** Tabla en escritorio; tarjetas apiladas en móvil (la 1ª columna es el título, la última las acciones). */
export function Table({ columns, rows, empty = 'Sin resultados', onRowClick }) {
  if (!rows.length) return <p className="px-3 py-10 text-center text-sm text-ink-soft">{empty}</p>;
  const [head, ...rest] = columns; const actions = rest.find((c) => !c.label); const fields = rest.filter((c) => c.label);
  return (
    <>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm">
        <thead><tr className="border-b border-line text-xs text-ink-soft">{columns.map((c) => <th key={c.key} className="px-3 py-2 font-semibold">{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r._id || r.id || i} onClick={onRowClick ? () => onRowClick(r) : undefined} className={`border-b border-line/60 last:border-0 hover:bg-mist/60 ${onRowClick ? 'cursor-pointer' : ''}`}>{columns.map((c) => <td key={c.key} className="px-3 py-2.5 align-top">{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody>
      </table></div>
      <ul className="divide-y divide-line md:hidden">{rows.map((r, i) => (
        <li key={r._id || r.id || i} onClick={onRowClick ? () => onRowClick(r) : undefined} className={`px-4 py-3.5 ${onRowClick ? 'active:bg-mist' : ''}`}>
          <div className="text-[15px]">{head.render ? head.render(r) : r[head.key]}</div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">{fields.map((c) => <div key={c.key} className="min-w-0"><dt className="text-xs text-ink-soft">{c.label}</dt><dd className="truncate">{c.render ? c.render(r) : r[c.key]}</dd></div>)}</dl>
          {actions && <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>{actions.render(r)}</div>}
        </li>))}</ul>
    </>
  );
}

/** Diálogo centrado en escritorio · bottom sheet en móvil (arrastrar hacia abajo para cerrar). */
export function Modal({ open, onClose, title, children, footer }) {
  const sheet = useRef(null); const start = useRef(null); const [dy, setDy] = useState(0);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; setDy(0); };
  }, [open, onClose]);
  if (!open) return null;
  const onStart = (e) => { if (sheet.current.scrollTop <= 0) start.current = e.touches[0].clientY; };
  const onMove = (e) => { if (start.current != null) setDy(Math.max(0, e.touches[0].clientY - start.current)); };
  const onEnd = () => { if (dy > 110) onClose(); setDy(0); start.current = null; };
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-harbor/50 backdrop-blur-[2px] md:items-center md:p-4" onMouseDown={onClose}>
      <div ref={sheet} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        style={{ transform: dy ? `translateY(${dy}px)` : undefined }}
        className="flex max-h-[92dvh] w-full animate-sheet flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl md:max-h-[88vh] md:max-w-lg md:animate-fade md:rounded-xl">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden" />
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3"><h2 className="truncate">{title}</h2><button onClick={onClose} aria-label="Cerrar" className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-mist"><X size={20} /></button></div>
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">{children}</div>
        {footer && <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{footer}</div>}
      </div>
    </div>
  );
}

/** Pestañas: chips desplazables con snap en móvil (fijas bajo la barra superior), subrayado en escritorio. */
export function Tabs({ tabs, value, onChange, sticky = true }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }, [value]);
  return (
    <div className={sticky ? 'sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 mb-5 bg-mist/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none' : 'mb-4'}>
      <div ref={ref} role="tablist" className="scroll-x gap-1.5 md:gap-1 md:border-b md:border-line">
        {tabs.map((t) => <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`shrink-0 snap-center whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition md:rounded-none md:border-b-2 md:px-3 ${value === t.id ? 'bg-harbor text-white md:border-tide md:bg-transparent md:text-tide-dark' : 'bg-surface text-ink-soft md:border-transparent md:bg-transparent md:hover:text-ink'}`}>{t.label}</button>)}
      </div>
    </div>
  );
}
export function CopyButton({ value, label = 'Copiar' }) {
  const [ok, setOk] = useState(false);
  return <Button size="sm" variant="secondary" type="button" onClick={async () => { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? <Check size={14} /> : <Copy size={14} />}{ok ? 'Copiado' : label}</Button>;
}
export const Secret = ({ value }) => <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><code className="block flex-1 break-all rounded-lg bg-mist px-3 py-2 font-mono text-xs">{value}</code><CopyButton value={value || ''} /></div>;
export const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, tone = 'ok') => { const id = Math.random(); setItems((s) => [...s, { id, msg, tone }]); setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4000); }, []);
  return <ToastCtx.Provider value={push}>{children}
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+1.25rem)] z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-4 md:right-4 md:items-end">
      {items.map((t) => <div key={t.id} className={`pointer-events-auto w-full animate-sheet rounded-xl px-4 py-3 text-sm font-semibold shadow-lg md:w-auto md:max-w-sm md:animate-fade ${t.tone === 'bad' ? 'bg-flare text-white' : 'bg-harbor text-white'}`}>{t.msg}</div>)}
    </div></ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);
