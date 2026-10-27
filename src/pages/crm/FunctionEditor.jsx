import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CodeMirror from '@uiw/react-codemirror';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { linter, lintGutter } from '@codemirror/lint';
import { snippetCompletion } from '@codemirror/autocomplete';
import { EditorView, keymap, hoverTooltip } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { Play, Save, Files, LayoutGrid, FlaskConical, KeyRound, History, BookOpen, X, Check, Circle, ChevronRight, Copy, Search, RotateCcw, Trash2, Plus, AlertTriangle, Info, PanelBottom, PanelRight, Braces } from 'lucide-react';
import { api, errMsg } from '../../lib/api.js';
import { Button, Input, Badge, Modal, fmtDate, useToast } from '../../components/ui.jsx';
import { useFields } from './common.jsx';
import { SDK, CTX, GALLERY } from './ide/sdk.js';
import { analyze } from './ide/analysis.js';

/* ── Utilidades de presentación ── */
const BASIC = { lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: true, bracketMatching: true, closeBrackets: true, tabSize: 2, lintKeymap: true, highlightSelectionMatches: true };
const tryJson = (s) => { const t = String(s ?? '').trim(); if (!/^[[{]/.test(t)) return null; try { return JSON.parse(t); } catch { return null; } };
function JsonTree({ value, name, depth = 0 }) {
  const obj = value && typeof value === 'object'; const [open, setOpen] = useState(depth < 1);
  if (!obj) return <span>{name != null && <span className="text-[#9cdcfe]">{name}: </span>}<span className={typeof value === 'string' ? 'text-[#ce9178]' : typeof value === 'number' ? 'text-[#b5cea8]' : 'text-[#569cd6]'}>{JSON.stringify(value)}</span></span>;
  const e = Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value);
  return <div><button onClick={() => setOpen(!open)} className="inline-flex items-center gap-0.5"><ChevronRight size={11} className={`transition ${open ? 'rotate-90' : ''}`} />{name != null && <span className="text-[#9cdcfe]">{name}: </span>}<span className="text-[#808080]">{Array.isArray(value) ? `Array(${e.length})` : `{…} ${e.length}`}</span></button>{open && <div className="border-l border-white/10 pl-3">{e.slice(0, 300).map(([k, v]) => <div key={k}><JsonTree value={v} name={k} depth={depth + 1} /></div>)}</div>}</div>;
}
const LV = { log: ['', 'text-[#d6e2ee]'], info: ['INFO', 'text-[#4fc1ff]'], warn: ['WARN', 'text-[#fcd34d]'], error: ['ERROR', 'text-[#f87171]'] };
const kb = (n) => (n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`);

/** Panel inferior: problemas, consola, llamadas, resultado, proceso completo y producción. */
function BottomPanel({ tab, setTab, out, problems, onGo, runs, onOpenRun, height, onClose }) {
  const [lv, setLv] = useState('all'); const [q, setQ] = useState('');
  const logs = (out?.logs || []).map((l) => (typeof l === 'string' ? { t: 0, level: 'log', msg: l } : l));
  const trace = out?.trace || []; const shownLogs = logs.filter((l) => (lv === 'all' || l.level === lv) && (!q || l.msg.toLowerCase().includes(q.toLowerCase())));
  const counts = logs.reduce((c, l) => ({ ...c, [l.level]: (c[l.level] || 0) + 1 }), {});
  const errs = problems.filter((p) => p.severity === 'error').length; const warns = problems.filter((p) => p.severity === 'warning').length;
  const timeline = out ? [{ t: 0, k: 'start', text: `▶ Ejecución iniciada${out.trigger ? ` (${out.trigger})` : ''}` }, ...logs.map((l) => ({ t: l.t, k: 'log', level: l.level, text: l.msg })), ...trace.map((c) => ({ t: c.t, k: 'call', c })), { t: out.ms ?? 0, k: 'end', text: out.status === 'ok' ? `■ Terminó correctamente en ${out.ms} ms` : `■ Terminó con error en ${out.ms ?? '?'} ms: ${out.error}` }].sort((a, b) => a.t - b.t) : [];
  const TABS = [['problems', `Problemas${problems.length ? ` (${problems.length})` : ''}`], ['console', `Consola${logs.length ? ` (${logs.length})` : ''}`], ['calls', `Llamadas${trace.length ? ` (${trace.length})` : ''}`], ['result', 'Resultado'], ['process', 'Proceso'], ['prod', 'Producción']];
  return (
    <section aria-label="Panel inferior" className="flex min-h-0 flex-col border-t border-[#2b3b4c] bg-[#0f1720] text-[#d6e2ee]" style={{ height }}>
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/10 px-2 text-[11.5px]" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`shrink-0 border-b-2 px-2.5 py-2 font-semibold uppercase tracking-wide ${tab === k ? 'border-[#4fc1ff] text-white' : 'border-transparent text-[#8b98a8] hover:text-white'}`}>{l}</button>)}
        <span className="ml-auto flex shrink-0 items-center gap-3 pr-1 text-[#8b98a8]">{out && <span className={`flex items-center gap-1 font-bold ${out.status === 'ok' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{out.status === 'ok' ? <Check size={12} /> : <X size={12} />}{out.ms} ms</span>}<button aria-label="Cerrar panel" onClick={onClose} className="hover:text-white"><X size={14} /></button></span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-relaxed">
        {tab === 'problems' && (!problems.length ? <p className="p-3 text-[#8b98a8]">Sin problemas detectados. ✓</p> : problems.map((p, i) => (
          <button key={i} onClick={() => onGo(p.from)} className="flex w-full items-start gap-2 px-3 py-1 text-left hover:bg-white/5">{p.severity === 'error' ? <X size={13} className="mt-0.5 shrink-0 text-[#f87171]" /> : p.severity === 'warning' ? <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#fcd34d]" /> : <Info size={13} className="mt-0.5 shrink-0 text-[#4fc1ff]" />}<span className="flex-1">{p.message}</span><span className="shrink-0 text-[#5c6b7a]">{p.source} · Ln {p.line}</span></button>)))}
        {tab === 'console' && <>
          <div className="sticky top-0 flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-[#0f1720] px-3 py-1.5 text-[11px]">{['all', 'log', 'info', 'warn', 'error'].map((k) => <button key={k} onClick={() => setLv(k)} className={`rounded-full px-2 py-0.5 font-semibold ${lv === k ? 'bg-white/15 text-white' : 'text-[#8b98a8]'}`}>{k === 'all' ? 'Todo' : k}{k !== 'all' && counts[k] ? ` ${counts[k]}` : ''}</button>)}
            <span className="ml-auto flex items-center gap-1 rounded bg-white/5 px-2"><Search size={11} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar" className="w-28 bg-transparent py-0.5 outline-none" /></span>
            <button title="Copiar" onClick={() => navigator.clipboard.writeText(logs.map((l) => `[+${l.t}ms ${l.level}] ${l.msg}`).join('\n'))} className="text-[#8b98a8] hover:text-white"><Copy size={12} /></button></div>
          {out?.error && <div className="flex gap-2 bg-[#3b1219] px-3 py-1.5 text-[#fca5a5]"><X size={13} className="mt-0.5 shrink-0" /><span className="flex-1">{out.error}</span>{out.errorAt && <button onClick={() => onGo(null, out.errorAt)} className="shrink-0 rounded bg-white/10 px-2 text-[11px] font-semibold text-white">Ln {out.errorAt.line} →</button>}</div>}
          {!shownLogs.length ? <p className="p-3 text-[#8b98a8]">{out ? 'Sin mensajes. Usa jx.log(...) o console.log(...).' : 'Ejecuta la función (⌘↵) para ver la consola.'}</p> : shownLogs.map((l, i) => { const j = tryJson(l.msg); const [tag, cls] = LV[l.level] || LV.log; return <div key={i} className={`flex gap-3 px-3 py-0.5 hover:bg-white/5 ${l.level === 'error' ? 'bg-[#3b1219]/60' : l.level === 'warn' ? 'bg-[#3a2a0b]/50' : ''}`}><span className="w-14 shrink-0 text-right text-[#5c6b7a]">+{l.t}ms</span>{tag && <span className={`w-11 shrink-0 font-bold ${cls}`}>{tag}</span>}<span className={`min-w-0 flex-1 break-words ${cls}`}>{j ? <JsonTree value={j} /> : l.msg}</span></div>; })}
        </>}
        {tab === 'calls' && (!trace.length ? <p className="p-3 text-[#8b98a8]">No se llamó al SDK.</p> : trace.map((t, i) => (
          <details key={i} className="border-b border-white/5"><summary className="flex cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-white/5"><span className="w-14 shrink-0 text-right text-[#5c6b7a]">+{t.t}ms</span><Circle size={8} className={t.ok ? 'fill-[#4ade80] text-[#4ade80]' : 'fill-[#f87171] text-[#f87171]'} /><span className="font-semibold text-[#9cdcfe]">jx.{t.name}</span>{t.http && <span className="truncate text-[#8b98a8]">{t.http.method} {t.http.url}{t.http.status ? ` → ${t.http.status}` : ''}{t.http.bytes ? ` · ${kb(t.http.bytes)}` : ''}</span>}<span className="ml-auto shrink-0 text-[#8b98a8]">{t.ms} ms</span></summary>
            <div className="grid gap-1 px-3 pb-2 pl-24 md:grid-cols-2"><div><p className="text-[#8b98a8]">Parámetros</p>{tryJson(t.args) ? <JsonTree value={tryJson(t.args)} /> : t.args}</div><div><p className="text-[#8b98a8]">{t.ok ? 'Respuesta' : 'Error'}</p><div className={t.ok ? '' : 'text-[#fca5a5]'}>{t.ok ? (tryJson(t.result) ? <JsonTree value={tryJson(t.result)} /> : t.result) : t.error}</div></div></div></details>)))}
        {tab === 'result' && <div className="p-3">{!out ? <p className="text-[#8b98a8]">Sin ejecución todavía.</p> : out.status === 'ok' ? <JsonTree value={out.result} /> : <p className="text-[#fca5a5]">{out.error}</p>}</div>}
        {tab === 'process' && (!out ? <p className="p-3 text-[#8b98a8]">Ejecuta para ver el proceso completo paso a paso.</p> : <ol className="p-2">{timeline.map((e, i) => (
          <li key={i} className="flex gap-3 px-1 py-0.5"><span className="w-16 shrink-0 text-right text-[#5c6b7a]">+{e.t}ms</span>
            {e.k === 'call' ? <span><span className={e.c.ok ? 'text-[#4ade80]' : 'text-[#f87171]'}>{e.c.ok ? '↳' : '✗'}</span> <span className="text-[#9cdcfe]">jx.{e.c.name}</span>{e.c.http ? ` ${e.c.http.method} ${e.c.http.url}${e.c.http.status ? ` → ${e.c.http.status}` : ''}` : ''} <span className="text-[#5c6b7a]">({e.c.ms} ms){e.c.error ? ` — ${e.c.error}` : ''}</span></span>
              : e.k === 'log' ? <span className={LV[e.level]?.[1]}>{LV[e.level]?.[0] ? `[${LV[e.level][0]}] ` : ''}{e.text}</span> : <b className={e.k === 'end' && out.status !== 'ok' ? 'text-[#f87171]' : 'text-white'}>{e.text}</b>}</li>))}
          {out.usage && <li className="mt-1 px-1 text-[#8b98a8]">Uso: {Object.entries(out.usage).map(([k, v]) => `${k} ${v}`).join(' · ')} · límites: http 10, email 5, telegram 10, records 50, memoria 32 MB</li>}</ol>)}
        {tab === 'prod' && (!runs?.length ? <p className="p-3 text-[#8b98a8]">Sin ejecuciones en producción todavía.</p> : runs.map((r) => (
          <button key={r._id} onClick={() => onOpenRun(r)} className="flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-white/5"><Circle size={8} className={r.status === 'ok' ? 'fill-[#4ade80] text-[#4ade80]' : 'fill-[#f87171] text-[#f87171]'} /><span className="w-36 shrink-0 text-[#8b98a8]">{fmtDate(r.createdAt)}</span><span className="w-20 shrink-0">{r.trigger}</span><span className="w-16 shrink-0 text-[#8b98a8]">{r.ms} ms</span><span className="truncate text-[#fca5a5]">{r.error || ''}</span></button>)))}
      </div>
    </section>
  );
}

function RunView({ run, onClose }) { const [t, setT] = useState('process'); return <BottomPanel tab={t} setTab={setT} out={run} problems={[]} onGo={() => {}} runs={[]} onOpenRun={() => {}} height="100%" onClose={onClose} />; }

export default function FunctionEditor() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast(); const qc = useQueryClient();
  const fnQ = useQuery({ queryKey: ['crm-function', id], queryFn: () => api.get(`/crm/functions/${id}`).then((r) => r.data) });
  const all = useQuery({ queryKey: ['crm-functions'], queryFn: () => api.get('/crm/functions').then((r) => r.data) });
  const runs = useQuery({ queryKey: ['crm-function-runs', id], queryFn: () => api.get(`/crm/functions/${id}/runs`).then((r) => r.data) });
  const versions = useQuery({ queryKey: ['crm-function-versions', id], queryFn: () => api.get(`/crm/functions/${id}/versions`).then((r) => r.data) });
  const fields = useFields();
  const [f, setF] = useState(null); const [saved, setSaved] = useState(''); const [out, setOut] = useState(null); const [busy, setBusy] = useState(false);
  const [file, setFile] = useState('main'); const [sample, setSample] = useState('{\n  "id": "demo",\n  "name": "Ana García",\n  "email": "ana@correo.es",\n  "status": "Nuevo",\n  "presupuesto": 25000\n}');
  const [recordId, setRecordId] = useState(''); const [q, setQ] = useState(''); const [side, setSide] = useState(() => (window.innerWidth >= 1024 ? 'explorer' : null));
  const [docs, setDocs] = useState(() => window.innerWidth >= 1280); const [docQ, setDocQ] = useState(''); const [bottom, setBottom] = useState('problems');
  const [bottomH, setBottomH] = useState(() => Number(localStorage.getItem('ja-ide-bottom')) || 260); const [showBottom, setShowBottom] = useState(true);
  const [cursor, setCursor] = useState({ line: 1, col: 1 }); const [envRows, setEnvRows] = useState([]); const [viewVer, setViewVer] = useState(null); const [prodRun, setProdRun] = useState(null);
  const viewRef = useRef(null); const runRef = useRef(); const saveRef = useRef(); const outRef = useRef(null); outRef.current = out;
  const recs = useQuery({ queryKey: ['crm-records', q, ''], queryFn: () => api.get(`/crm/records?q=${encodeURIComponent(q)}&limit=8`).then((r) => r.data) });
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { if (fnQ.data && (!f || f._id !== fnQ.data._id)) { setF(fnQ.data); setSaved(fnQ.data.code); setOut(null); setEnvRows((fnQ.data.envKeys || []).map((k) => ({ key: k, value: '', saved: true }))); } }, [fnQ.data]); // eslint-disable-line
  const dirty = f && f.code !== saved;

  /* Diagnósticos: análisis estático + error de la última ejecución (si el código no ha cambiado) */
  const problems = useMemo(() => {
    if (!f) return []; const code = f.code; const lineOf = (pos) => code.slice(0, pos).split('\n').length;
    const list = analyze(code).map((d) => ({ ...d, line: lineOf(d.from) }));
    if (out?.errorAt && out.code === code) { const lines = code.split('\n'); let pos = 0; for (let i = 0; i < out.errorAt.line - 1 && i < lines.length; i++) pos += lines[i].length + 1; pos += Math.max(0, (out.errorAt.column || 1) - 1); list.unshift({ from: Math.min(pos, code.length), to: Math.min(pos + 1, code.length), severity: 'error', message: `Ejecución: ${out.error}`, source: 'ejecución', line: out.errorAt.line }); }
    return list;
  }, [f?.code, out]); // eslint-disable-line
  const problemsRef = useRef(problems); problemsRef.current = problems;

  /* Autocompletado desde la documentación + ayuda al pasar el ratón */
  const completions = useMemo(() => {
    const fieldOpts = (fields.data || []).map((x) => ({ label: x.key, type: 'property', detail: x.type, info: x.label }));
    const sdkOpts = SDK.map((s) => snippetCompletion(s.snippet.replace('${record.id}', '${record.id}'), { label: s.name, type: 'function', detail: s.ret, info: `${s.sig}\n\n${s.doc}` }));
    return (ctx) => {
      const w = ctx.matchBefore(/[\w.$]*/); if (!w || (w.from === w.to && !ctx.explicit)) return null; const t = w.text;
      if (t.startsWith('record.')) return { from: w.from + 7, options: [{ label: 'id', type: 'property', info: 'Id del contacto' }, ...fieldOpts] };
      if (t.startsWith('ctx.')) return { from: w.from + 4, options: CTX.map(([l, i]) => ({ label: l, type: 'property', info: i })) };
      if (t.startsWith('jx.env.')) return { from: w.from + 7, options: (f?.envKeys || []).map((k) => ({ label: k, type: 'constant', detail: 'variable secreta' })) };
      if (t.startsWith('jx')) return { from: w.from, options: sdkOpts };
      return { from: w.from, options: [{ label: 'jx', type: 'namespace', info: 'SDK de Juntial' }, { label: 'record', type: 'variable', info: 'Contacto que recibe la función' }, { label: 'ctx', type: 'variable', info: 'Contexto de la ejecución' }, snippetCompletion('function main(record, ctx) {\n\t${}\n}', { label: 'main', type: 'keyword', info: 'Función principal' }), { label: 'console.log', type: 'function' }], validFor: /^[\w$]*$/ };
    };
  }, [fields.data, f?.envKeys]);
  const hover = useMemo(() => hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos); const txt = line.text; let s = pos - line.from; let e = s;
    while (s > 0 && /[\w.]/.test(txt[s - 1])) s--; while (e < txt.length && /[\w.]/.test(txt[e])) e++;
    const word = txt.slice(s, e); const d = SDK.find((x) => word === x.name || word.startsWith(`${x.name}.`) || (x.name === 'jx.env' && word.startsWith('jx.env')));
    if (!d) return null;
    return { pos: line.from + s, end: line.from + e, above: true, create: () => { const dom = document.createElement('div'); dom.className = 'max-w-sm p-2 text-xs'; dom.innerHTML = `<code style="font-weight:700">${d.sig}</code><div style="opacity:.7;margin:2px 0">→ ${d.ret}</div><div>${d.doc}</div>`; return { dom }; } };
  }), []);
  const extensions = useMemo(() => [
    javascript(), javascriptLanguage.data.of({ autocomplete: completions }), hover, lintGutter(),
    linter(() => problemsRef.current.map(({ from, to, severity, message, source }) => ({ from, to: Math.max(to, from + 1), severity, message, source })), { delay: 300 }),
    EditorView.updateListener.of((u) => { if (u.selectionSet || u.docChanged) { const p = u.state.selection.main.head; const l = u.state.doc.lineAt(p); setCursor({ line: l.number, col: p - l.from + 1 }); } }),
    Prec.highest(keymap.of([{ key: 'Mod-Enter', preventDefault: true, run: () => { runRef.current?.(); return true; } }, { key: 'Mod-s', preventDefault: true, run: () => { saveRef.current?.(); return true; } }])),
  ], [completions, hover]);
  const jsonExt = useMemo(() => [json(), Prec.highest(keymap.of([{ key: 'Mod-Enter', preventDefault: true, run: () => { runRef.current?.(); return true; } }, { key: 'Mod-s', preventDefault: true, run: () => { saveRef.current?.(); return true; } }]))], []);
  // Re-lintar cuando cambia el resultado de la ejecución
  useEffect(() => { const v = viewRef.current; if (v) v.dispatch({}); }, [problems]);

  const goTo = (pos, at) => {
    setFile('main'); const v = viewRef.current; if (!v) return;
    let p = pos; if (p == null && at) { const ln = v.state.doc.line(Math.min(at.line, v.state.doc.lines)); p = Math.min(ln.from + Math.max(0, (at.column || 1) - 1), ln.to); }
    v.dispatch({ selection: { anchor: p }, effects: EditorView.scrollIntoView(p, { y: 'center' }) }); v.focus();
  };
  const save = useCallback(async () => {
    try {
      const env = Object.fromEntries(envRows.filter((r) => r.key && (r.value || r.removed)).map((r) => [r.key, r.removed ? '' : r.value]));
      const { data } = await api.put(`/crm/functions/${id}`, { name: f.name, description: f.description, code: f.code, timeoutMs: f.timeoutMs, testCases: f.testCases || [], ...(Object.keys(env).length ? { env } : {}) });
      toast('Función guardada'); setSaved(f.code); setF((x) => ({ ...x, version: data.version, envKeys: data.envKeys })); versions.refetch(); qc.invalidateQueries({ queryKey: ['crm-functions'] });
      setEnvRows((rows) => rows.filter((r) => !r.removed).map((r) => ({ ...r, value: '', saved: true })));
    } catch (e) { toast(errMsg(e), 'bad'); }
  }, [f, envRows, id]); // eslint-disable-line
  const run = useCallback(async () => {
    if (!f) return; setBusy(true); setShowBottom(true);
    try {
      const body = { code: f.code }; if (recordId) body.recordId = recordId; else { try { body.sample = JSON.parse(sample); } catch { throw new Error('entrada.json no es JSON válido'); } }
      const { data } = await api.post(`/crm/functions/${id}/run`, body); setOut({ ...data, code: f.code });
      setBottom(data.status === 'ok' ? (data.logs?.length ? 'console' : 'result') : 'console'); runs.refetch();
      if (data.errorAt) setTimeout(() => goTo(null, data.errorAt), 50);
    } catch (e) { setOut({ status: 'error', error: errMsg(e), logs: [], trace: [], code: f.code }); setBottom('console'); } finally { setBusy(false); }
  }, [f, recordId, sample, id]); // eslint-disable-line
  runRef.current = run; saveRef.current = save;
  useEffect(() => { const k = (e) => { if (!(e.ctrlKey || e.metaKey) || e.target.closest?.('.cm-editor')) return; if (e.key === 's') { e.preventDefault(); save(); } if (e.key === 'Enter') { e.preventDefault(); run(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [save, run]);
  const startDrag = (e) => { e.preventDefault(); const y0 = e.clientY; const h0 = bottomH; const mv = (ev) => { const h = Math.min(Math.max(120, h0 - (ev.clientY - y0)), window.innerHeight * 0.75); setBottomH(h); }; const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); localStorage.setItem('ja-ide-bottom', String(Math.round(bottomH))); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); };
  const insert = (code, replace) => {
    if (replace) { if (dirty && !confirm('Se reemplazará el código actual (podrás recuperarlo en Versiones tras guardar). ¿Continuar?')) return; setF({ ...f, code }); setFile('main'); return; }
    const v = viewRef.current; setFile('main'); if (!v) return; const p = v.state.selection.main.head; v.dispatch({ changes: { from: p, insert: code }, selection: { anchor: p + code.length } }); v.focus();
  };
  const newFn = async () => { const name = prompt('Nombre de la función', 'Nueva función'); if (!name) return; const apiName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 40) || 'funcion'; try { const { data } = await api.post('/crm/functions', { name, apiName, code: GALLERY[0].code }); qc.invalidateQueries({ queryKey: ['crm-functions'] }); nav(`/crm/functions/${data._id}`); } catch (e) { toast(errMsg(e), 'bad'); } };
  if (!f) return <p className="p-6 text-ink-soft">Cargando…</p>;
  const errs = problems.filter((p) => p.severity === 'error').length; const warns = problems.filter((p) => p.severity === 'warning').length;
  const cases = f.testCases || [];
  const ACT = [['explorer', Files, 'Explorador'], ['gallery', LayoutGrid, 'Galería de código'], ['cases', FlaskConical, 'Datos de prueba'], ['env', KeyRound, 'Variables'], ['versions', History, 'Versiones']];
  const docsList = SDK.filter((d) => !docQ || `${d.name} ${d.doc} ${d.group}`.toLowerCase().includes(docQ.toLowerCase()));

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* Barra superior */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 text-sm"><Link to="/crm/functions" className="text-ink-soft hover:text-ink">Funciones</Link><ChevronRight size={14} className="text-ink-soft" /><b className="truncate">{f.name}</b>{dirty && <span className="h-2 w-2 shrink-0 rounded-full bg-signal" title="Cambios sin guardar" />}<code className="ml-1 hidden rounded bg-mist px-1.5 text-[11px] text-ink-soft sm:inline">{f.apiName} · v{f.version || 1}</code></nav>
        <div className="ml-auto flex items-center gap-1.5">
          <button aria-label="Panel inferior" title="Panel inferior" onClick={() => setShowBottom(!showBottom)} className={`grid h-9 w-9 place-items-center rounded-lg hover:bg-mist ${showBottom ? 'text-tide' : 'text-ink-soft'}`}><PanelBottom size={17} /></button>
          <button aria-label="Documentación" title="Documentación" onClick={() => setDocs(!docs)} className={`grid h-9 w-9 place-items-center rounded-lg hover:bg-mist ${docs ? 'text-tide' : 'text-ink-soft'}`}><PanelRight size={17} /></button>
          <Button size="sm" variant="secondary" loading={busy} onClick={run}><Play size={15} />Ejecutar<kbd className="hidden text-[10px] opacity-60 md:inline">⌘↵</kbd></Button>
          <Button size="sm" onClick={save} disabled={!dirty && !envRows.some((r) => r.value || r.removed)}><Save size={15} />Guardar<kbd className="hidden text-[10px] opacity-70 md:inline">⌘S</kbd></Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {/* Barra de actividad */}
        <nav aria-label="Actividad" className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-mist/60 py-2">
          {ACT.map(([k, I, l]) => <button key={k} title={l} aria-label={l} aria-pressed={side === k} onClick={() => setSide(side === k ? null : k)} className={`relative grid h-10 w-10 place-items-center rounded-lg ${side === k ? 'bg-surface text-tide shadow-sm' : 'text-ink-soft hover:text-ink'}`}><I size={19} />{k === 'env' && f.envKeys?.length > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-tide" />}</button>)}
        </nav>
        {/* Panel lateral */}
        {side && <aside className="absolute inset-y-0 left-12 z-20 flex w-[min(300px,calc(100vw-3rem))] min-h-0 flex-col border-r border-line bg-surface shadow-xl lg:static lg:shadow-none">
          <div className="flex items-center justify-between border-b border-line px-3 py-2"><b className="text-[11px] uppercase tracking-wider text-ink-soft">{ACT.find(([k]) => k === side)[2]}</b><button aria-label="Cerrar" onClick={() => setSide(null)} className="text-ink-soft hover:text-ink"><X size={15} /></button></div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
            {side === 'explorer' && <><button onClick={newFn} className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-semibold text-tide hover:bg-mist"><Plus size={15} />Nueva función</button>
              {(all.data || []).map((x) => <Link key={x._id} to={`/crm/functions/${x._id}`} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${x._id === id ? 'bg-tide-tint font-semibold text-tide-dark' : 'hover:bg-mist'}`}><Braces size={14} className="shrink-0 text-[#d7ba7d]" /><span className="truncate">{x.apiName}.js</span>{x.stats?.errors ? <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-flare" title="Con errores" /> : null}</Link>)}</>}
            {side === 'gallery' && [...new Set(GALLERY.map((g) => g.cat))].map((cat) => <div key={cat} className="mb-3"><p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{cat}</p>
              {GALLERY.filter((g) => g.cat === cat).map((g) => <div key={g.title} className="mb-1.5 rounded-lg border border-line p-2.5"><b className="block text-[13px]">{g.title}</b><span className="block text-xs text-ink-soft">{g.desc}</span><span className="mt-1.5 flex gap-2 text-xs font-semibold"><button className="text-tide" onClick={() => insert(g.code, true)}>Usar como base</button><button className="text-ink-soft hover:text-ink" onClick={() => insert(`\n${g.code}`)}>Insertar</button></span></div>)}</div>)}
            {side === 'cases' && <div className="space-y-2">
              <p className="text-xs text-ink-soft">Con qué datos se ejecuta al pulsar Ejecutar. Edita <b>entrada.json</b> o usa un contacto real.</p>
              <button onClick={() => { setRecordId(''); setFile('json'); }} className={`w-full rounded-lg border p-2 text-left text-xs ${!recordId ? 'border-tide bg-tide-tint' : 'border-line'}`}><b>entrada.json</b> (datos de ejemplo)</button>
              {cases.map((c, i) => <div key={i} className="flex items-center gap-1"><button onClick={() => { setRecordId(''); setSample(JSON.stringify(c.record, null, 2)); setFile('json'); }} className="flex-1 truncate rounded-md px-2 py-1 text-left hover:bg-mist">🧪 {c.name}</button><button aria-label="Quitar caso" onClick={() => setF({ ...f, testCases: cases.filter((_, j) => j !== i) })} className="text-ink-soft hover:text-flare"><Trash2 size={13} /></button></div>)}
              <Button size="sm" variant="secondary" className="w-full" onClick={() => { const name = prompt('Nombre del caso', `Caso ${cases.length + 1}`); if (!name) return; try { setF({ ...f, testCases: [...cases, { name, record: JSON.parse(sample) }] }); toast('Caso añadido (guarda para conservarlo)'); } catch { toast('entrada.json no es JSON válido', 'bad'); } }}><Plus size={14} />Guardar entrada como caso</Button>
              <p className="pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Contacto real</p>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contacto…" />
              {(recs.data?.items || []).map((r) => <label key={r._id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-mist"><input type="radio" className="accent-tide" checked={recordId === r._id} onChange={() => setRecordId(r._id)} /><span className="truncate">{r.data.name || r.data.email || r._id}</span></label>)}
              {recordId && <p className="rounded-md bg-signal-tint p-2 text-xs text-signal">Con un contacto real, las acciones se ejecutan de verdad.</p>}
            </div>}
            {side === 'env' && <div className="space-y-2"><p className="text-xs text-ink-soft">Tokens y claves cifrados; se usan con <code>jx.env.NOMBRE</code>. Para servicios compartidos, mejor una <Link to="/center/connections" className="font-semibold text-tide">conexión</Link>.</p>
              {envRows.map((r, i) => <div key={i} className="space-y-1 rounded-lg border border-line p-2"><Input className="font-mono" placeholder="NOMBRE" value={r.key} disabled={r.saved} onChange={(e) => setEnvRows(envRows.map((x, j) => (j === i ? { ...x, key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') } : x)))} />
                <div className="flex gap-1"><Input type="password" className="font-mono" placeholder={r.saved ? '•••• (vacío = sin cambios)' : 'valor'} value={r.value} disabled={r.removed} onChange={(e) => setEnvRows(envRows.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} /><button aria-label="Eliminar" onClick={() => setEnvRows(r.saved ? envRows.map((x, j) => (j === i ? { ...x, removed: !x.removed } : x)) : envRows.filter((_, j) => j !== i))} className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${r.removed ? 'bg-flare-tint text-flare' : 'text-ink-soft hover:bg-mist'}`}><Trash2 size={15} /></button></div></div>)}
              <Button size="sm" variant="secondary" className="w-full" onClick={() => setEnvRows([...envRows, { key: '', value: '' }])}><Plus size={14} />Añadir variable</Button></div>}
            {side === 'versions' && <ul>{(versions.data || []).map((v) => <li key={v._id} className="rounded-md px-2 py-1.5 hover:bg-mist"><b>v{v.version}</b> <span className="text-xs text-ink-soft">{fmtDate(v.createdAt)}</span><span className="block truncate text-xs text-ink-soft">{v.savedBy}</span><span className="mt-0.5 flex gap-2 text-xs font-semibold"><button className="text-ink-soft hover:text-ink" onClick={() => setViewVer(v)}>Ver</button><button className="text-tide" onClick={() => { setF({ ...f, code: v.code }); toast(`v${v.version} cargada: guarda para restaurarla`); }}><RotateCcw size={11} className="inline" /> Restaurar</button></span></li>)}{!versions.data?.length && <li className="p-2 text-xs text-ink-soft">Cada guardado con cambios crea una versión.</li>}</ul>}
          </div>
        </aside>}
        {/* Editor + panel inferior */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-end gap-0.5 border-b border-line bg-mist/40 px-1 pt-1 text-[13px]" role="tablist" aria-label="Archivos">
            {[['main', `${f.apiName}.js`, <Braces key="i" size={13} className="text-[#d7ba7d]" />], ['json', 'entrada.json', <span key="i" className="text-[10px] font-bold text-[#cbcb41]">{'{}'}</span>]].map(([k, l, ic]) => <button key={k} role="tab" aria-selected={file === k} onClick={() => setFile(k)} className={`flex items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-1.5 ${file === k ? 'border-line bg-surface font-semibold' : 'border-transparent text-ink-soft hover:text-ink'}`}>{ic}{l}{k === 'main' && dirty && <span className="h-1.5 w-1.5 rounded-full bg-ink-soft" />}{k === 'json' && recordId && <Badge>contacto real</Badge>}</button>)}
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className={file === 'main' ? 'h-full' : 'hidden'}><CodeMirror value={f.code} height="100%" style={{ height: '100%' }} theme={dark ? 'dark' : 'light'} extensions={extensions} basicSetup={BASIC} onCreateEditor={(v) => { viewRef.current = v; }} onChange={(code) => setF((x) => ({ ...x, code }))} aria-label="Código de la función" /></div>
            <div className={file === 'json' ? 'h-full' : 'hidden'}><CodeMirror value={sample} height="100%" style={{ height: '100%' }} theme={dark ? 'dark' : 'light'} extensions={jsonExt} basicSetup={BASIC} onChange={setSample} aria-label="Datos de entrada" /></div>
          </div>
          {showBottom && <><div role="separator" aria-orientation="horizontal" aria-label="Redimensionar panel" onPointerDown={startDrag} className="h-1.5 shrink-0 cursor-row-resize bg-[#0f1720] hover:bg-[#4fc1ff]/40" />
            <BottomPanel tab={bottom} setTab={setBottom} out={out} problems={problems} onGo={goTo} runs={runs.data} onOpenRun={setProdRun} height={bottomH} onClose={() => setShowBottom(false)} /></>}
        </div>
        {/* Documentación */}
        {docs && <aside aria-label="Documentación" className="absolute inset-y-0 right-0 z-20 flex w-[min(340px,100vw)] min-h-0 flex-col border-l border-line bg-surface shadow-xl xl:static xl:shadow-none">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2"><BookOpen size={15} className="text-tide" /><b className="text-[11px] uppercase tracking-wider text-ink-soft">Documentación</b><button aria-label="Cerrar" onClick={() => setDocs(false)} className="ml-auto text-ink-soft hover:text-ink"><X size={15} /></button></div>
          <div className="border-b border-line p-2"><Input value={docQ} onChange={(e) => setDocQ(e.target.value)} placeholder="Buscar en el SDK…" /></div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {!docQ && <div className="rounded-lg bg-mist p-3 text-xs"><b className="block">Cómo funciona</b>Tu función recibe <code>main(record, ctx)</code>. Las llamadas <code>jx.*</code> son síncronas (sin await). Se ejecuta aislada: sin Node, sin red interna, 32 MB y tiempo máximo configurable. Escribe <code>jx.</code> y pulsa Ctrl+Espacio para autocompletar.</div>}
            {[...new Set(docsList.map((d) => d.group))].map((g) => <div key={g}><p className="pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">{g}</p>
              {docsList.filter((d) => d.group === g).map((d) => <div key={d.name} className="mb-2 rounded-lg border border-line p-2.5"><code className="block break-words text-[12px] font-semibold text-tide-dark">{d.sig}</code><span className="text-[11px] text-ink-soft">→ {d.ret}</span><p className="mt-1 text-xs">{d.doc}</p>
                {d.example && <><pre className="mt-1.5 overflow-x-auto rounded bg-[#0f1720] p-2 font-mono text-[11px] text-[#d6e2ee]">{d.example}</pre><button className="mt-1 text-xs font-semibold text-tide" onClick={() => insert(`${d.example}\n`)}>Insertar ejemplo</button></>}</div>)}</div>)}
            {!docQ && <div><p className="pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">ctx</p>{CTX.map(([k, d]) => <p key={k} className="text-xs"><code className="font-semibold">ctx.{k}</code> — {d}</p>)}</div>}
            {!docQ && <div><p className="pb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">record (tus campos)</p>{(fields.data || []).map((x) => <p key={x.key} className="text-xs"><code className="font-semibold">record.{x.key}</code> — {x.label} <span className="text-ink-soft">({x.type})</span></p>)}</div>}
          </div>
        </aside>}
      </div>
      {/* Barra de estado */}
      <footer className="flex shrink-0 items-center gap-4 overflow-x-auto bg-harbor px-3 py-1 text-[11.5px] text-white/90">
        <button onClick={() => { setShowBottom(true); setBottom('problems'); }} className="flex shrink-0 items-center gap-2 hover:text-white"><span className="flex items-center gap-1"><X size={12} />{errs}</span><span className="flex items-center gap-1"><AlertTriangle size={12} />{warns}</span></button>
        {out && <button onClick={() => { setShowBottom(true); setBottom('process'); }} className="shrink-0 hover:text-white">{out.status === 'ok' ? '✓' : '✗'} Última ejecución {out.ms ?? '?'} ms</button>}
        <span className="ml-auto shrink-0">Ln {cursor.line}, Col {cursor.col}</span><span className="shrink-0">JavaScript</span><span className="hidden shrink-0 sm:inline">QuickJS aislado · {(f.timeoutMs || 10000) / 1000} s</span><span className="shrink-0">v{f.version || 1}{dirty ? ' · sin guardar' : ''}</span>
      </footer>
      <Modal open={!!viewVer} onClose={() => setViewVer(null)} title={`Versión ${viewVer?.version}`}>{viewVer && <pre className="max-h-[60vh] overflow-auto rounded-lg bg-[#0f1720] p-3 font-mono text-[12px] text-[#d6e2ee]">{viewVer.code}</pre>}</Modal>
      <Modal open={!!prodRun} onClose={() => setProdRun(null)} title={`Ejecución ${prodRun ? fmtDate(prodRun.createdAt) : ''}`}>{prodRun && <div className="h-[60vh] overflow-hidden rounded-lg"><RunView run={prodRun} onClose={() => setProdRun(null)} /></div>}</Modal>
    </div>
  );
}
