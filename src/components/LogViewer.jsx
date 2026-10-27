import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, Radio, Download, X, ChevronRight, Link2, Copy } from 'lucide-react';
import { api, API_URL, getAccessToken } from '../lib/api.js';
import { Section, Button, Badge, Select } from './ui.jsx';

/** Visor de logs al estilo de Datadog/Vercel: búsqueda, filtros, histograma, en vivo, trazas y exportación. */
const LV = { error: ['bg-flare', 'text-flare', 'ERROR'], warn: ['bg-signal', 'text-signal', 'WARN'], info: ['bg-tide', 'text-tide-dark', 'INFO'] };
const time = (d) => new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const day = (d) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

function Histogram({ hours = [], onPick }) {
  const max = Math.max(1, ...hours.map((h) => h.info + h.warn + h.error));
  return (
    <div className="flex h-14 items-end gap-[3px]" role="img" aria-label="Actividad de las últimas 24 horas">
      {hours.map((h) => { const tot = h.info + h.warn + h.error; return (
        <button key={h.h} title={`${new Date(h.h).getHours()}:00 · ${tot} eventos${h.error ? ` · ${h.error} errores` : ''}`} onClick={() => onPick?.(h.h)} className="flex h-full min-w-0 flex-1 flex-col justify-end">
          <span className="w-full rounded-t-sm bg-flare" style={{ height: `${(h.error / max) * 100}%` }} />
          <span className="w-full bg-signal" style={{ height: `${(h.warn / max) * 100}%` }} />
          <span className={`w-full bg-tide/60 ${h.error || h.warn ? '' : 'rounded-t-sm'}`} style={{ height: `${(h.info / max) * 100}%`, minHeight: tot ? 2 : 0 }} />
        </button>); })}
    </div>
  );
}

export default function LogViewer({ botId, title = 'Registro', description }) {
  const [q, setQ] = useState(''); const [dq, setDq] = useState(''); const [levels, setLevels] = useState([]); const [event, setEvent] = useState(''); const [trace, setTrace] = useState(''); const [since, setSince] = useState(null);
  const [live, setLive] = useState(false); const [open, setOpen] = useState({});
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const params = useMemo(() => { const p = new URLSearchParams(); if (levels.length) p.set('level', levels.join(',')); if (event) p.set('event', event); if (dq) p.set('q', dq); if (trace) p.set('traceId', trace); if (since) { p.set('since', new Date(since).toISOString()); p.set('before', new Date(+new Date(since) + 3600000).toISOString()); } return p; }, [levels, event, dq, trace, since]);
  const stats = useQuery({ queryKey: ['log-stats', botId], queryFn: () => api.get(`/bots/${botId}/logs/stats`).then((r) => r.data), refetchInterval: live ? 5000 : 30000 });
  const logs = useInfiniteQuery({
    queryKey: ['logs', botId, params.toString()], initialPageParam: null,
    queryFn: ({ pageParam }) => { const p = new URLSearchParams(params); if (pageParam) p.set('before', pageParam); return api.get(`/bots/${botId}/logs?${p}`).then((r) => r.data); },
    getNextPageParam: (last) => last.next, refetchInterval: live ? 3000 : false,
  });
  const rows = (logs.data?.pages || []).flatMap((p) => p.items || []);
  const toggleLevel = (l) => setLevels((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]));
  const clear = () => { setQ(''); setLevels([]); setEvent(''); setTrace(''); setSince(null); };
  const filtered = q || levels.length || event || trace || since;
  const exportLogs = async (format) => {
    const p = new URLSearchParams(params); p.set('format', format);
    const r = await fetch(`${API_URL}/api/bots/${botId}/logs/export?${p}`, { headers: { authorization: `Bearer ${getAccessToken()}` }, credentials: 'include' });
    const url = URL.createObjectURL(await r.blob()); const a = document.createElement('a'); a.href = url; a.download = `logs.${format}`; a.click(); URL.revokeObjectURL(url);
  };
  // Agrupación visual por traza: las filas consecutivas del mismo turno se marcan con la misma barra
  let lastTrace = null;
  return (
    <Section title={title} description={description || 'Todo lo que hace el agente, con su traza: pulsa en una traza para ver el turno completo.'}
      actions={<div className="flex gap-2"><Button size="sm" variant={live ? 'primary' : 'secondary'} onClick={() => setLive(!live)}><Radio size={14} className={live ? 'animate-pulse' : ''} />{live ? 'En vivo' : 'Pausado'}</Button>
        <Select value="" onChange={(e) => e.target.value && exportLogs(e.target.value)} options={[{ value: '', label: 'Exportar…' }, { value: 'csv', label: 'CSV (Excel)' }, { value: 'ndjson', label: 'NDJSON' }]} /></div>}>
      <div className="mb-3 rounded-lg border border-line p-3">
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-soft"><span>Últimas 24 horas</span><span className="flex gap-3">{['info', 'warn', 'error'].map((l) => <span key={l} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${LV[l][0]}`} />{stats.data?.levels?.[l] || 0} {l}</span>)}</span></div>
        <Histogram hours={stats.data?.hours} onPick={(h) => setSince(h)} />
      </div>
      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3"><Search size={15} className="text-ink-soft" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en los mensajes…" className="h-10 w-full bg-transparent text-sm outline-none" /></label>
        <div className="flex flex-wrap items-center gap-1.5">{['error', 'warn', 'info'].map((l) => <button key={l} onClick={() => toggleLevel(l)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold ${levels.includes(l) ? 'border-ink bg-ink text-surface' : 'border-line'}`}><span className={`h-2 w-2 rounded-full ${LV[l][0]}`} />{LV[l][2]}</button>)}
          <div className="w-48"><Select value={event} onChange={(e) => setEvent(e.target.value)} options={[{ value: '', label: 'Todos los eventos' }, ...(stats.data?.events || []).map((x) => ({ value: x.event, label: `${x.event} (${x.n})` }))]} /></div></div>
      </div>
      {filtered && <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">{trace && <Badge tone="warn"><Link2 size={11} className="mr-1" />Traza {trace}</Badge>}{since && <Badge>Hora {new Date(since).getHours()}:00</Badge>}<button onClick={clear} className="flex items-center gap-1 font-semibold text-tide"><X size={12} />Quitar filtros</button></div>}
      <div className="overflow-hidden rounded-lg border border-line font-mono text-[12px]">
        {!rows.length ? <p className="py-10 text-center font-sans text-sm text-ink-soft">{logs.isLoading ? 'Cargando…' : 'Sin registros con estos filtros.'}</p> : rows.map((l) => {
          const [dot, txt, tag] = LV[l.level] || LV.info; const k = l._id; const isOpen = open[k]; const sameTrace = l.traceId && l.traceId === lastTrace; lastTrace = l.traceId;
          return (
            <div key={k} className={`border-b border-line/60 last:border-0 ${l.level === 'error' ? 'bg-flare-tint/40' : l.level === 'warn' ? 'bg-signal-tint/40' : ''}`}>
              <button onClick={() => setOpen({ ...open, [k]: !isOpen })} className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-mist/70">
                <span className={`mt-1 h-full w-0.5 self-stretch rounded ${l.traceId ? (sameTrace ? 'bg-harbor-300' : 'bg-harbor-500') : 'bg-transparent'}`} aria-hidden="true" />
                <ChevronRight size={12} className={`mt-0.5 shrink-0 text-ink-soft transition ${isOpen ? 'rotate-90' : ''}`} />
                <span className="w-[72px] shrink-0 text-ink-soft" title={new Date(l.createdAt).toLocaleString('es-ES')}>{time(l.createdAt)}</span>
                <span className={`w-11 shrink-0 font-bold ${txt}`}>{tag}</span>
                <span className="hidden w-32 shrink-0 truncate text-ink-soft sm:block" title={l.event}>{l.event}</span>
                <span className="min-w-0 flex-1 break-words">{l.message}</span>
                {l.elapsedMs != null && <span className="hidden shrink-0 text-ink-soft md:block">+{l.elapsedMs}ms</span>}
              </button>
              {isOpen && <div className="space-y-2 bg-mist/60 px-10 py-2.5 font-sans text-xs">
                <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
                  <dt className="text-ink-soft">Fecha</dt><dd>{day(l.createdAt)} {new Date(l.createdAt).toLocaleTimeString('es-ES')}.{String(new Date(l.createdAt).getMilliseconds()).padStart(3, '0')}</dd>
                  <dt className="text-ink-soft">Evento</dt><dd className="font-mono">{l.event}</dd>
                  {l.source && <><dt className="text-ink-soft">Origen</dt><dd>{l.source}</dd></>}
                  {l.chatId != null && <><dt className="text-ink-soft">Chat</dt><dd className="font-mono">{l.chatId}</dd></>}
                  {l.traceId && <><dt className="text-ink-soft">Traza</dt><dd><button onClick={() => { setTrace(l.traceId); setLevels([]); setEvent(''); setQ(''); setSince(null); }} className="font-mono font-semibold text-tide hover:underline">{l.traceId} → ver el turno completo</button></dd></>}
                </dl>
                {l.meta && Object.keys(l.meta).length > 0 && <div className="relative"><pre className="max-h-60 overflow-auto rounded-md bg-surface p-2.5 font-mono text-[11.5px]">{JSON.stringify(l.meta, null, 2)}</pre>
                  <button aria-label="Copiar" onClick={() => navigator.clipboard.writeText(JSON.stringify(l, null, 2))} className="absolute right-2 top-2 text-ink-soft hover:text-ink"><Copy size={13} /></button></div>}
              </div>}
            </div>);
        })}
      </div>
      {logs.hasNextPage && <div className="mt-3 text-center"><Button variant="secondary" size="sm" loading={logs.isFetchingNextPage} onClick={() => logs.fetchNextPage()}>Cargar más antiguos</Button></div>}
    </Section>
  );
}
