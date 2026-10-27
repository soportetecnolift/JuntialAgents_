import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Paperclip, Send, Square, Sparkles, Check, X, Clock, Play, Plus, Trash2, BookOpen, Brain, Link2, Eye, ShieldCheck, ShieldAlert, Ban, MessageSquare, Search, PenLine, AlertTriangle } from 'lucide-react';
import { api, API_URL, getAccessToken, errMsg } from '../../lib/api.js';
import { Button, Field, Input, Textarea, Select, Toggle, Badge, Section, Modal, Empty, fmtDate, useToast } from '../../components/ui.jsx';

const W = (bot) => `/bots/${bot._id}/worker`;
const CAT = { read: ['Consultar', Search, 'neutral'], internal: ['Avisar', MessageSquare, 'neutral'], data: ['Cambiar datos', PenLine, 'warn'], external: ['Clientes', Send, 'warn'], destructive: ['Irreversible', AlertTriangle, 'bad'] };
const POLICY = { auto: ['Lo hace solo', ShieldCheck, 'ok'], approve: ['Pide aprobación', ShieldAlert, 'warn'], off: ['Prohibido', Ban, 'bad'] };
const md = (t) => String(t || '').replace(/\[Documento adjunto: «([^»]+)» \(ref doc:[a-f0-9]+\)\]/g, '📎 $1').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/^- (.+)$/gm, '• $1').replace(/\n/g, '<br>');

/* ───────── Chat: hablar con el empleado como con un compañero ───────── */
export function WorkerChatTab({ bot }) {
  const toast = useToast(); const hist = useQuery({ queryKey: ['wk-chat', bot._id], queryFn: () => api.get(`${W(bot)}/chat`).then((r) => r.data) });
  const [msgs, setMsgs] = useState([]); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [steps, setSteps] = useState([]); const abort = useRef(null); const end = useRef(null);
  const [atts, setAtts] = useState([]); const fileIn = useRef(null);
  async function attach(list) {
    for (const f of [...list].slice(0, 5)) {
      try { if (f.size > 10 * 1024 * 1024) throw new Error('supera 10 MB'); const { data } = await api.post(`${W(bot)}/files`, { name: f.name, mime: f.type, data: await fileToB64(f), source: 'chat' }); setAtts((a) => [...a, { id: data._id, name: data.name }]); }
      catch (e) { toast(`${f.name}: ${errMsg(e)}`, 'bad'); }
    }
  }
  useEffect(() => { if (hist.data) setMsgs(hist.data.map((m) => ({ role: m.role, text: m.text }))); }, [hist.data]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [msgs, steps]);
  async function send(t = text) {
    t = t.trim(); if ((!t && !atts.length) || busy) return;
    if (atts.length) { t = `${t || 'Revisa estos documentos y dime qué harías.'}\n\n${atts.map((a) => `[Documento adjunto: «${a.name}» (ref doc:${a.id})]`).join('\n')}`; setAtts([]); }
    setText(''); setBusy(true); setSteps([]);
    setMsgs((m) => [...m, { role: 'user', text: t }, { role: 'assistant', text: '', live: true }]);
    const ac = new AbortController(); abort.current = ac;
    try {
      const res = await fetch(`${API_URL}/api${W(bot)}/chat`, { method: 'POST', signal: ac.signal, credentials: 'include', headers: { 'content-type': 'application/json', accept: 'text/event-stream', authorization: `Bearer ${getAccessToken()}` }, body: JSON.stringify({ text: t }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error?.message || 'Error');
      const rd = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const raw = buf.slice(0, i); buf = buf.slice(i + 2); const ev = raw.match(/^event: (.+)$/m)?.[1]; const d = JSON.parse(raw.match(/^data: (.+)$/m)?.[1] || '{}');
          if (ev === 'delta' || ev === 'done') setMsgs((m) => m.map((x, k) => (k === m.length - 1 ? { ...x, text: d.text, live: ev !== 'done' } : x)));
          if (ev === 'step' && d.kind !== 'thought') setSteps((s) => [...s, d]);
          if (ev === 'error') throw new Error(d.message);
        }
      }
    } catch (e) { if (e.name !== 'AbortError') { toast(e.message, 'bad'); setMsgs((m) => m.map((x, k) => (k === m.length - 1 ? { ...x, text: `⚠️ ${e.message}`, live: false } : x))); } }
    finally { setBusy(false); }
  }
  const SUG = ['¿Qué has hecho hoy?', '¿Qué tienes pendiente de aprobar?', 'Revisa los contactos nuevos y dime qué harías', 'A partir de ahora, avísame solo de lo urgente'];
  return (
    <div className="panel flex h-[calc(100dvh-16rem)] min-h-[480px] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-tide to-harbor-600 text-lg text-white">🧠</span>
        <div className="min-w-0 flex-1"><b className="block truncate">{bot.worker?.title || bot.name}</b><span className="text-xs text-ink-soft">{bot.worker?.paused ? 'En pausa' : 'Trabajando'} · habla con él como con un compañero</span></div>
        <Button size="sm" variant="ghost" onClick={async () => { if (confirm('¿Borrar la conversación?')) { await api.delete(`${W(bot)}/chat`); setMsgs([]); } }}>Limpiar</Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!msgs.length && <div className="py-8 text-center"><p className="font-semibold">Encárgale algo o pregúntale cómo va</p><div className="mt-3 flex flex-wrap justify-center gap-2">{SUG.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-tide hover:text-tide">{s}</button>)}</div></div>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-tide text-white' : 'bg-mist'}`}>{/* las referencias doc: se muestran como chips */}
              {m.live && !m.text ? <span className="flex items-center gap-2 text-ink-soft"><Sparkles size={14} className="animate-spin" />Trabajando…</span> : <span dangerouslySetInnerHTML={{ __html: md(m.text) }} />}
            </div>
          </div>))}
        {busy && steps.length > 0 && <div className="flex flex-wrap gap-1.5 pl-1">{steps.slice(-8).map((s, i) => { const [l, I, tone] = s.kind === 'approval' ? ['Pide aprobación', ShieldAlert, 'warn'] : s.kind === 'blocked' ? ['Bloqueado', Ban, 'bad'] : CAT[s.category] || ['Acción', Sparkles, 'neutral']; return <Badge key={i} tone={tone}><I size={11} className="mr-1" />{(s.name || '').replace('__', ' › ')}</Badge>; })}</div>}
        <div ref={end} />
      </div>
      {atts.length > 0 && <div className="flex flex-wrap gap-1.5 border-t border-line px-3 pt-2">{atts.map((a) => <Badge key={a.id}><Paperclip size={11} className="mr-1" />{a.name}<button aria-label={`Quitar ${a.name}`} className="ml-1" onClick={() => setAtts(atts.filter((x) => x.id !== a.id))}><X size={11} /></button></Badge>)}</div>}
      <form className="flex items-end gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); send(); }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); attach(e.dataTransfer.files); }}>
        <input ref={fileIn} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => { attach(e.target.files); e.target.value = ''; }} />
        <Button type="button" variant="ghost" aria-label="Adjuntar documento" onClick={() => fileIn.current?.click()}><Paperclip size={16} /></Button>
        <Textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Pídele algo, dale una indicación o pregúntale qué ha hecho…" className="min-h-11 flex-1 resize-none" />
        {busy ? <Button type="button" variant="secondary" aria-label="Detener" onClick={() => abort.current?.abort()}><Square size={16} /></Button> : <Button aria-label="Enviar"><Send size={16} /></Button>}
      </form>
    </div>
  );
}

/* Fuera de los componentes: definidos dentro, React los recrearía en cada tecla y los campos perderían el foco */
const EV_LABEL = { approvals: 'Aprobaciones', decisions: 'Decisiones tomadas', reports: 'Informes', questions: 'Preguntas' };
function ChannelCard({ on, onToggle, icon, title, desc, children, fixed }) {
  return (
    <div className={`rounded-xl border p-4 ${on ? 'border-tide/50 bg-tide-tint/30' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><span className="text-xl" aria-hidden="true">{icon}</span><div><b className="text-sm">{title}</b><p className="text-xs text-ink-soft">{desc}</p></div></div>
        {fixed ? <Badge tone="ok">Siempre</Badge> : <Toggle checked={on} onChange={onToggle} label="" />}</div>
      {on && children && <div className="mt-3 space-y-3 pl-9">{children}</div>}
    </div>);
}
function EventChips({ value, list, onToggle }) {
  return <div className="flex flex-wrap gap-1.5">{list.map((e) => <button key={e} type="button" aria-pressed={value.includes(e)} onClick={() => onToggle(e)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${value.includes(e) ? 'border-tide bg-tide text-white' : 'border-line'}`}>{EV_LABEL[e]}</button>)}</div>;
}

/* ───────── Puesto ───────── */
export function WorkerJobTab({ bot, save }) {
  const w = bot.worker || {}; const [f, setF] = useState({ title: w.title || '', mission: w.mission || '', responsibilities: w.responsibilities || '', kpis: w.kpis || '', paused: !!w.paused, departmentId: w.departmentId || '' });
  const deps = useQuery({ queryKey: ['center-deps'], queryFn: () => api.get('/org/departments').then((r) => r.data) });
  const r0 = w.reporting || {};
  const [rep, setRep] = useState({
    notifyPanel: r0.notifyPanel !== false, onlyWhenRelevant: r0.onlyWhenRelevant !== false,
    tg: !!r0.telegramBotId, telegramBotId: r0.telegramBotId || '', chatId: r0.chatId || '',
    email: { enabled: !!r0.email?.enabled, to: (r0.email?.to || []).join(', '), events: r0.email?.events || ['approvals', 'reports', 'questions'] },
    webhook: { enabled: !!r0.webhook?.enabled, url: r0.webhook?.url || '', events: r0.webhook?.events || ['approvals', 'decisions', 'reports', 'questions'] },
  });
  const bots = useQuery({ queryKey: ['bots'], queryFn: () => api.get('/bots').then((r) => r.data) });
  const chats = useQuery({ queryKey: ['chats', rep.telegramBotId], enabled: !!rep.telegramBotId, queryFn: () => api.get(`/bots/${rep.telegramBotId}/chats`).then((r) => r.data) });
  const secret = useQuery({ queryKey: ['wk-secret', bot._id, r0.webhook?.enabled], enabled: !!r0.webhook?.enabled, queryFn: () => api.get(`${W(bot)}/reporting/webhook-secret`).then((r) => r.data.secret) });
  const toast = useToast(); const [diag, setDiag] = useState(null); const [testing, setTesting] = useState('');
  const runTest = async (kind) => {
    setTesting(kind); setDiag(null);
    try { await saveRep(true); const { data } = await api.post(`${W(bot)}/reporting/test`, { kind }); setDiag({ kind, results: data.results }); }
    catch (e) { toast(errMsg(e), 'bad'); } finally { setTesting(''); }
  };
  const setCh = (ch, patch) => setRep({ ...rep, [ch]: { ...rep[ch], ...patch } });
  const toggleEv = (ch, ev) => setCh(ch, { events: rep[ch].events.includes(ev) ? rep[ch].events.filter((x) => x !== ev) : [...rep[ch].events, ev] });
  const saveRep = (silent) => (silent === true ? (fn) => fn() : save)(() => api.put(W(bot), { reporting: {
    notifyPanel: rep.notifyPanel, onlyWhenRelevant: rep.onlyWhenRelevant,
    telegramBotId: rep.tg && rep.telegramBotId ? rep.telegramBotId : null, chatId: rep.tg && rep.chatId ? rep.chatId : null,
    email: { enabled: rep.email.enabled, to: rep.email.to.split(/[,;\s]+/).filter(Boolean), events: rep.email.events },
    webhook: { enabled: rep.webhook.enabled, url: rep.webhook.url, events: rep.webhook.events },
  } }), 'Canales guardados');
  const CH = { panel: '🧩 JuntialAgents', telegram: '✈️ Telegram', email: '✉️ Email', webhook: '🔗 Webhook' };
  return (
    <div className="space-y-5">
      <Section title="Descripción del puesto" description="Como la ficha de un empleado: qué es, para qué está y cómo se mide su trabajo. El agente la lee antes de cada tarea.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Puesto"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Área" hint="Decide quién aprueba sus acciones según las políticas de Juntial Center."><Select value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })} options={[{ value: '', label: 'Sin área' }, ...(deps.data || []).map((d) => ({ value: d._id, label: d.name }))]} /></Field></div>
          <Field label="Misión" hint="El objetivo principal, en una o dos frases."><Textarea rows={2} value={f.mission} onChange={(e) => setF({ ...f, mission: e.target.value })} /></Field>
          <Field label="Responsabilidades"><Textarea rows={5} value={f.responsibilities} onChange={(e) => setF({ ...f, responsibilities: e.target.value })} /></Field>
          <Field label="Objetivos / KPIs" hint="Le ayudan a priorizar."><Textarea rows={3} value={f.kpis} onChange={(e) => setF({ ...f, kpis: e.target.value })} /></Field>
          <Toggle checked={f.paused} onChange={(v) => setF({ ...f, paused: v })} label="Pausar al empleado" hint="No ejecuta rutinas ni encargos; el chat sigue disponible." />
        </div>
        <Button className="mt-4" onClick={() => save(() => api.put(W(bot), { ...f, departmentId: f.departmentId || null }), 'Puesto guardado')}>Guardar puesto</Button>
      </Section>
      <Section title="Canales de avisos y aprobaciones" description="Sus informes, preguntas y peticiones de aprobación llegan a todos los canales activos. Puedes aprobar o rechazar desde cualquiera y el resto se actualiza solo.">
        <div className="space-y-3">
          <ChannelCard fixed on icon="🧩" title="JuntialAgents" desc="Pestaña Aprobaciones y Actividad, y avisos en la campana.">
            <Toggle checked={rep.notifyPanel} onChange={(v) => setRep({ ...rep, notifyPanel: v })} label="Avisarme también en la campana y por email de la cuenta" />
          </ChannelCard>
          <ChannelCard on={rep.email.enabled} onToggle={(v) => setCh('email', { enabled: v })} icon="✉️" title="Email" desc="Con botones Aprobar / Rechazar. Abren una página de confirmación, así el antivirus del correo nunca aprueba nada solo.">
            <Field label="Destinatarios" hint="Separados por comas (máx. 10)."><Input value={rep.email.to} onChange={(e) => setCh('email', { to: e.target.value })} placeholder="jefe@empresa.com, comercial@empresa.com" /></Field>
            <EventChips value={rep.email.events} list={['approvals', 'reports', 'questions']} onToggle={(e) => toggleEv('email', e)} />
          </ChannelCard>
          <ChannelCard on={rep.tg} onToggle={(v) => setRep({ ...rep, tg: v })} icon="✈️" title="Telegram (opcional)" desc="Botones ✅/❌ para aprobar desde el móvil y respuestas a sus preguntas con un toque.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bot"><Select value={rep.telegramBotId} onChange={(e) => setRep({ ...rep, telegramBotId: e.target.value, chatId: '' })} options={[{ value: '', label: 'Elige un bot…' }, ...(bots.data || []).filter((b) => b.kind === 'telegram' && b.telegram?.connected).map((b) => ({ value: b._id, label: `${b.name} (@${b.telegram.username})` }))]} /></Field>
              {rep.telegramBotId && <Field label="Chat o grupo" hint="Escribe antes al bot desde ese chat."><Select value={String(rep.chatId || '')} onChange={(e) => setRep({ ...rep, chatId: Number(e.target.value) })} options={[{ value: '', label: 'Elige…' }, ...(chats.data || []).map((c) => ({ value: String(c.chatId), label: c.title || c.username || String(c.chatId) }))]} /></Field>}
            </div>
          </ChannelCard>
          <ChannelCard on={rep.webhook.enabled} onToggle={(v) => setCh('webhook', { enabled: v })} icon="🔗" title="Webhook" desc="Para Make, n8n, Zapier, tu ERP o Slack: recibe cada evento firmado y puede aprobar o rechazar con una llamada.">
            <Field label="URL (https)"><Input value={rep.webhook.url} onChange={(e) => setCh('webhook', { url: e.target.value })} placeholder="https://hook.eu1.make.com/…" /></Field>
            <EventChips value={rep.webhook.events} list={['approvals', 'decisions', 'reports', 'questions']} onToggle={(e) => toggleEv('webhook', e)} />
            {secret.data && <Field label="Secreto de firma (X-JuntialAgents-Signature)"><div className="flex gap-2"><Input readOnly className="font-mono" value={secret.data} onFocus={(e) => e.target.select()} /><Button variant="secondary" onClick={async () => { if (confirm('Se generará un secreto nuevo y el anterior dejará de valer.')) { await api.post(`${W(bot)}/reporting/webhook-secret/rotate`); secret.refetch(); toast('Secreto renovado'); } }}>Renovar</Button></div></Field>}
            <details className="rounded-lg bg-mist p-3 text-xs"><summary className="cursor-pointer font-semibold">Cómo aprobar desde tu sistema</summary>
              <p className="mt-2">Cada evento <code>approval.requested</code> incluye <code>decide.url</code>. Para decidir:</p>
              <pre className="mt-1 overflow-x-auto rounded bg-surface p-2 font-mono">{'POST {decide.url}\nContent-Type: application/json\n\n{ "decision": "approve" | "reject", "feedback": "opcional", "decidedBy": "Make.com" }'}</pre>
              <p className="mt-2">La respuesta indica si se ejecutó. Al decidirse (desde cualquier canal) llega <code>approval.decided</code> con quién y desde dónde. La firma es <code>t=…,v1=HMAC-SHA256(secreto, t + "." + cuerpo)</code>.</p></details>
          </ChannelCard>
          <Toggle checked={rep.onlyWhenRelevant} onChange={(v) => setRep({ ...rep, onlyWhenRelevant: v })} label="Informar solo cuando haya algo relevante" hint="Si en una tarea no hizo ni propuso nada, no te molesta. Las aprobaciones llegan siempre." />
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => saveRep()}>Guardar canales</Button>
          <Button variant="secondary" loading={testing === 'report'} onClick={() => runTest('report')}>Probar avisos</Button>
          <Button variant="secondary" loading={testing === 'approval'} onClick={() => runTest('approval')}>Enviar aprobación de prueba</Button></div>
        <p className="mt-2 text-xs text-ink-soft">Las pruebas guardan los cambios y envían en el momento a cada canal activo para decirte cuál funciona.</p>
        {diag && <div className="mt-4 rounded-xl border border-line p-4" role="status">
          <p className="mb-2 text-sm font-semibold">{diag.kind === 'approval' ? 'Aprobación de prueba enviada' : 'Resultado de la prueba'}</p>
          <ul className="space-y-1.5">{diag.results.map((r) => <li key={r.channel} className="flex gap-2 text-sm"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ${r.ok ? 'bg-tide' : 'bg-flare'}`}>{r.ok ? '✓' : '✗'}</span><span><b>{CH[r.channel] || r.channel}</b> — <span className={r.ok ? 'text-ink-soft' : 'text-flare'}>{r.info || r.error}</span></span></li>)}</ul>
          {diag.kind === 'approval' && <p className="mt-3 text-xs text-ink-soft">Apruébala o recházala desde cualquiera de los canales que funcionaron (o en la pestaña <b>Aprobaciones</b>): verás que en los demás se actualiza sola. Aprobarla no cambia nada.</p>}
        </div>}
      </Section>
    </div>
  );
}

/* ───────── Entrenamiento: manual, ejemplos, documentos y memoria ───────── */
export function WorkerTrainingTab({ bot, save, refetch }) {
  const toast = useToast(); const w = bot.worker || {};
  const [instr, setInstr] = useState(w.knowledge?.instructions || ''); const [ex, setEx] = useState(w.knowledge?.examples || []); const [mem, setMem] = useState(w.memory || []);
  const docs = useQuery({ queryKey: ['wk-docs', bot._id], queryFn: () => api.get(`${W(bot)}/docs`).then((r) => r.data) });
  const [doc, setDoc] = useState(null);
  useEffect(() => { setMem(bot.worker?.memory || []); }, [bot.worker?.memory]);
  return (
    <div className="space-y-5">
      <Section title="Manual del puesto" description="Procedimientos, criterios y reglas de la empresa. Escríbelo como se lo explicarías a una persona nueva." actions={<Button onClick={() => save(() => api.put(W(bot), { knowledge: { instructions: instr, examples: ex } }), 'Manual guardado')}>Guardar</Button>}>
        <Textarea rows={8} className="font-mono text-[13px]" value={instr} onChange={(e) => setInstr(e.target.value)} placeholder={'- Un lead es prioritario si el presupuesto supera 15.000 €.\n- Nunca ofrezcas descuentos de más del 5 %.\n- Los viernes por la tarde no se contacta a clientes.'} />
        <div className="mt-4"><div className="mb-2 flex items-center justify-between"><p className="font-semibold">Ejemplos de cómo actuar</p><Button size="sm" variant="secondary" onClick={() => setEx([...ex, { situation: '', action: '' }])}><Plus size={14} />Añadir</Button></div>
          <div className="space-y-2">{ex.map((e, i) => <div key={i} className="grid gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="Si pasa…" value={e.situation} onChange={(x) => setEx(ex.map((y, j) => (j === i ? { ...y, situation: x.target.value } : y)))} />
            <Input placeholder="Haz…" value={e.action} onChange={(x) => setEx(ex.map((y, j) => (j === i ? { ...y, action: x.target.value } : y)))} />
            <button aria-label="Quitar" onClick={() => setEx(ex.filter((_, j) => j !== i))} className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button></div>)}</div></div>
      </Section>
      <Section title="Documentos de formación" description="Catálogos, tarifas, políticas, preguntas frecuentes… El empleado los consulta cuando los necesita." actions={<Button variant="secondary" onClick={() => setDoc({ mode: 'text', title: '', text: '', url: '' })}><BookOpen size={16} />Añadir documento</Button>}>
        {!docs.data?.length ? <p className="text-sm text-ink-soft">Sin documentos todavía.</p> : <ul className="divide-y divide-line">{docs.data.map((d) => <li key={d._id} className="flex items-center justify-between gap-3 py-2.5"><span className="min-w-0"><b className="block truncate text-sm">{d.title}</b><span className="text-xs text-ink-soft">{Math.round(d.chars / 1000)} mil caracteres · {d.source === 'texto' ? 'texto' : <a className="text-tide" href={d.source} target="_blank" rel="noreferrer">enlace</a>} · {fmtDate(d.createdAt)}</span></span><Button size="sm" variant="ghost" onClick={async () => { await api.delete(`${W(bot)}/docs/${d._id}`); docs.refetch(); }}>Quitar</Button></li>)}</ul>}
      </Section>
      <Section title={<span className="flex items-center gap-2"><Brain size={18} />Lo que ha aprendido</span>} description="Su memoria en lenguaje claro: aprende de tus rechazos, de lo que le dices en el chat y de su trabajo. Puedes corregirla o borrar lo que no quieras."
        actions={<Button variant="secondary" onClick={() => setMem([...mem, { text: '', source: 'manual', at: new Date() }])}><Plus size={14} />Añadir</Button>}>
        {!mem.length ? <p className="text-sm text-ink-soft">Aún no ha aprendido nada. Rechaza una propuesta explicando el motivo o dile "a partir de ahora…" en el chat.</p> : (
          <ul className="space-y-2">{mem.map((m, i) => <li key={i} className="flex gap-2"><Badge tone={m.source === 'feedback' ? 'warn' : m.source === 'chat' ? 'ok' : 'neutral'}>{{ feedback: 'Tu feedback', chat: 'Chat', agent: 'Él mismo', manual: 'Manual' }[m.source] || m.source}</Badge>
            <Input value={m.text} onChange={(e) => setMem(mem.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <button aria-label="Olvidar" onClick={() => setMem(mem.filter((_, j) => j !== i))} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button></li>)}</ul>)}
        <Button className="mt-3" onClick={async () => { await save(() => api.put(`${W(bot)}/memory`, { memory: mem.filter((m) => m.text.trim()) }), 'Memoria actualizada'); refetch(); }}>Guardar memoria</Button>
      </Section>
      <Modal open={!!doc} onClose={() => setDoc(null)} title="Añadir documento" footer={<Button onClick={async () => { try { await api.post(`${W(bot)}/docs`, doc.mode === 'url' ? { url: doc.url } : { title: doc.title, text: doc.text }); toast('Documento añadido'); setDoc(null); docs.refetch(); } catch (e) { toast(errMsg(e), 'bad'); } }}>Añadir</Button>}>
        {doc && <><div className="grid grid-cols-2 gap-2">{[['text', 'Pegar texto'], ['url', 'Desde una web']].map(([k, l]) => <button key={k} onClick={() => setDoc({ ...doc, mode: k })} className={`rounded-lg border p-2.5 text-sm font-semibold ${doc.mode === k ? 'border-tide bg-tide-tint' : 'border-line'}`}>{l}</button>)}</div>
          {doc.mode === 'url' ? <Field label="URL" hint="Se lee el texto de la página (por ejemplo, tus preguntas frecuentes o tarifas)."><Input value={doc.url} onChange={(e) => setDoc({ ...doc, url: e.target.value })} placeholder="https://tuweb.com/tarifas" /></Field>
            : <><Field label="Título"><Input value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} /></Field><Field label="Contenido"><Textarea rows={10} value={doc.text} onChange={(e) => setDoc({ ...doc, text: e.target.value })} /></Field></>}</>}
      </Modal>
    </div>
  );
}

/* ───────── Rutinas ───────── */
const CRONS = [['0 9 * * 1-5', 'Laborables a las 9:00'], ['0 8 * * 1', 'Lunes a las 8:00'], ['0 17 * * 5', 'Viernes a las 17:00'], ['0 9 1 * *', 'El día 1 de cada mes'], ['0 */2 * * 1-5', 'Cada 2 horas (laborables)'], ['0 18 * * *', 'Todos los días a las 18:00']];
const cronLabel = (c) => CRONS.find(([v]) => v === c)?.[1] || c;
export function WorkerRoutinesTab({ bot }) {
  const toast = useToast(); const { data = [], refetch } = useQuery({ queryKey: ['wk-routines', bot._id], queryFn: () => api.get(`${W(bot)}/routines`).then((r) => r.data) });
  const [f, setF] = useState(null); const [task, setTask] = useState('');
  return (
    <div className="space-y-5">
      <Section title="Rutinas" description="Su jornada: lo que hace cada día, semana o mes sin que se lo pidas. Las rutinas de la plantilla vienen en pausa para que las revises."
        actions={<Button onClick={() => setF({ name: '', cron: '0 9 * * 1-5', timezone: 'Europe/Madrid', instruction: '', enabled: true })}><Plus size={16} />Nueva rutina</Button>}>
        {!data.length ? <Empty title="Sin rutinas">Ejemplo: «Cada lunes a las 8:00, revisa los proyectos con entrega esta semana y avísame de los retrasos».</Empty> : (
          <ul className="space-y-2">{data.map((r) => (
            <li key={r._id} className="rounded-xl border border-line p-3.5"><div className="flex flex-wrap items-start justify-between gap-2">
              <button className="min-w-0 text-left" onClick={() => setF(r)}><b className="text-sm">{r.name}</b><span className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft"><Clock size={12} />{cronLabel(r.cron)} · {r.runs || 0} ejecuciones{r.lastRunAt ? ` · última ${fmtDate(r.lastRunAt)} (${r.lastStatus})` : ''}</span><span className="mt-1 line-clamp-2 block text-xs text-ink-soft">{r.instruction}</span></button>
              <span className="flex items-center gap-2"><Button size="sm" variant="secondary" onClick={async () => { await api.post(`${W(bot)}/routines/${r._id}/run`); toast('Ejecutando ahora: mira Actividad en unos segundos'); }}><Play size={14} />Ahora</Button>
                <Toggle checked={r.enabled} onChange={async (v) => { await api.put(`${W(bot)}/routines/${r._id}`, { enabled: v }); refetch(); }} label={r.enabled ? 'Activa' : 'Pausa'} /></span></div></li>))}</ul>)}
        <p className="mt-4 text-sm text-ink-soft">¿Quieres que actúe cuando pase algo en el CRM (un contacto nuevo, un cambio de estado…)? Usa <Link to="/crm/workflows" className="font-semibold text-tide">Reglas de flujo</Link> con la acción <b>Encargar a un empleado digital</b>.</p>
      </Section>
      <Section title="Encargo puntual" description="Una tarea concreta, como se la pedirías a un compañero.">
        <div className="flex flex-col gap-2 sm:flex-row"><Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Revisa los contactos de Valencia y prepárame un resumen" /><Button disabled={task.length < 3} onClick={async () => { await api.post(`${W(bot)}/run`, { instruction: task }); setTask(''); toast('Encargo enviado'); }}>Encargar</Button></div>
      </Section>
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? 'Editar rutina' : 'Nueva rutina'} footer={<>{f?._id && <Button variant="danger" onClick={async () => { await api.delete(`${W(bot)}/routines/${f._id}`); setF(null); refetch(); }}>Eliminar</Button>}<Button onClick={async () => { try { const b = { name: f.name, cron: f.cron, timezone: f.timezone, instruction: f.instruction, enabled: f.enabled }; f._id ? await api.put(`${W(bot)}/routines/${f._id}`, b) : await api.post(`${W(bot)}/routines`, b); toast('Rutina guardada'); setF(null); refetch(); } catch (e) { toast(errMsg(e), 'bad'); } }}>Guardar</Button></>}>
        {f && <><Field label="Nombre"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Cuándo" hint="Elige una opción o escribe una expresión cron."><Input list="wk-crons" className="font-mono" value={f.cron} onChange={(e) => setF({ ...f, cron: e.target.value })} /><datalist id="wk-crons">{CRONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</datalist><p className="hint">{cronLabel(f.cron)}</p></Field>
          <Field label="Qué tiene que hacer" hint="Sé concreto: qué revisar, con qué criterio y qué entregar."><Textarea rows={6} value={f.instruction} onChange={(e) => setF({ ...f, instruction: e.target.value })} /></Field>
          <Toggle checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} label="Activa" /></>}
      </Modal>
    </div>
  );
}

/* ───────── Autonomía calibrada ───────── */
const PRESETS = { observador: ['Observador', 'Solo lee, analiza e informa. No cambia nada.'], asistente: ['Asistente', 'Lee e informa solo; propone cambios y mensajes para que los apruebes.'], colaborador: ['Colaborador', 'Actualiza datos solo; pide aprobación para hablar con clientes o borrar.'], autonomo: ['Autónomo', 'Trabaja solo, incluso con clientes. Solo pide aprobación para lo irreversible.'] };
const PRESET_POLICY = { observador: { read: 'auto', internal: 'auto', data: 'off', external: 'off', destructive: 'off' }, asistente: { read: 'auto', internal: 'auto', data: 'approve', external: 'approve', destructive: 'off' }, colaborador: { read: 'auto', internal: 'auto', data: 'auto', external: 'approve', destructive: 'approve' }, autonomo: { read: 'auto', internal: 'auto', data: 'auto', external: 'auto', destructive: 'approve' } };
const DAYS = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']];
export function WorkerAutonomyTab({ bot, save }) {
  const a0 = bot.worker?.autonomy || {};
  const [a, setA] = useState({ preset: a0.preset || 'asistente', policy: { ...PRESET_POLICY.asistente, ...a0.policy }, toolOverrides: a0.toolOverrides || {}, maxActionsPerRun: a0.maxActionsPerRun || 15, maxRunsPerDay: a0.maxRunsPerDay || 48, approvalTtlHours: a0.approvalTtlHours || 48, workingHours: { enabled: true, start: '08:00', end: '19:00', days: [1, 2, 3, 4, 5], tz: 'Europe/Madrid', ...a0.workingHours } });
  const tools = useQuery({ queryKey: ['wk-tools', bot._id], queryFn: () => api.get(`${W(bot)}/tools`).then((r) => r.data) });
  const [q, setQ] = useState('');
  const custom = !PRESET_POLICY[a.preset] || Object.entries(PRESET_POLICY[a.preset]).some(([k, v]) => a.policy[k] !== v);
  const wh = a.workingHours;
  return (
    <div className="space-y-5">
      <Section title="Nivel de autonomía" description="Cuánto puede hacer sin preguntarte. Empieza en Asistente y ve subiendo a medida que confíes en su criterio.">
        <div className="grid gap-2 md:grid-cols-4">{Object.entries(PRESETS).map(([k, [l, d]], i) => (
          <button key={k} onClick={() => setA({ ...a, preset: k, policy: { ...PRESET_POLICY[k] } })} className={`rounded-xl border p-3.5 text-left ${a.preset === k && !custom ? 'border-tide bg-tide-tint' : 'border-line hover:border-harbor-300'}`}>
            <span className="flex items-center gap-1">{[0, 1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-5 rounded-full ${n <= i ? 'bg-tide' : 'bg-line'}`} />)}</span>
            <b className="mt-2 block text-sm">{l}</b><span className="mt-0.5 block text-xs text-ink-soft">{d}</span></button>))}</div>
        <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-ink-soft"><th className="py-2 pr-3">Tipo de acción</th>{Object.entries(POLICY).map(([k, [l]]) => <th key={k} className="px-2 py-2 text-center">{l}</th>)}</tr></thead>
          <tbody>{Object.entries(CAT).map(([k, [l, I]]) => (
            <tr key={k} className="border-t border-line"><td className="py-2.5 pr-3"><span className="flex items-center gap-2 font-semibold"><I size={15} />{l}</span></td>
              {Object.keys(POLICY).map((p) => <td key={p} className="px-2 text-center"><input type="radio" aria-label={`${l}: ${POLICY[p][0]}`} className="h-4 w-4 accent-tide" disabled={k === 'read' && p !== 'auto'} checked={a.policy[k] === p} onChange={() => setA({ ...a, preset: 'personalizado', policy: { ...a.policy, [k]: p } })} /></td>)}</tr>))}</tbody></table></div>
        {custom && <p className="mt-2 text-xs text-ink-soft">Configuración personalizada.</p>}
      </Section>
      <Section title="Excepciones por herramienta" description="Afina el criterio en herramientas concretas de tus conectores. Por ejemplo: puede crear facturas en borrador, pero enviarlas siempre con aprobación.">
        <Input placeholder="Buscar herramienta…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 max-w-sm" />
        <div className="max-h-80 divide-y divide-line overflow-y-auto">{(tools.data || []).filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase())).slice(0, 150).map((t) => { const [cl, CI, ct] = CAT[t.category]; const ov = a.toolOverrides[t.name] || ''; return (
          <div key={t.name} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="min-w-0"><code className="block truncate font-mono text-xs font-semibold">{t.name.replace('__', ' › ')}</code><span className="text-xs text-ink-soft">{t.source} · <Badge tone={ct}><CI size={10} className="mr-1" />{cl}</Badge></span></span>
            <div className="w-44"><Select value={ov} onChange={(e) => setA({ ...a, toolOverrides: Object.fromEntries(Object.entries({ ...a.toolOverrides, [t.name]: e.target.value }).filter(([, v]) => v)) })} options={[{ value: '', label: `Por defecto (${POLICY[a.policy[t.category]]?.[0] || '—'})` }, ...Object.entries(POLICY).map(([v, [l]]) => ({ value: v, label: l }))]} /></div></div>); })}</div>
      </Section>
      <Section title="Horario y límites" description="Las rutinas y los eventos solo se ejecutan en su horario. El chat funciona siempre.">
        <Toggle checked={wh.enabled} onChange={(v) => setA({ ...a, workingHours: { ...wh, enabled: v } })} label="Respetar horario laboral" />
        {wh.enabled && <div className="mt-3 flex flex-wrap items-end gap-3"><div className="flex gap-1">{DAYS.map(([d, l]) => <button key={d} onClick={() => setA({ ...a, workingHours: { ...wh, days: wh.days.includes(d) ? wh.days.filter((x) => x !== d) : [...wh.days, d] } })} className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${wh.days.includes(d) ? 'bg-tide text-white' : 'bg-mist text-ink-soft'}`}>{l}</button>)}</div>
          <Field label="Desde"><Input type="time" value={wh.start} onChange={(e) => setA({ ...a, workingHours: { ...wh, start: e.target.value } })} /></Field><Field label="Hasta"><Input type="time" value={wh.end} onChange={(e) => setA({ ...a, workingHours: { ...wh, end: e.target.value } })} /></Field>
          <Field label="Zona horaria"><Input value={wh.tz} onChange={(e) => setA({ ...a, workingHours: { ...wh, tz: e.target.value } })} /></Field></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="Máx. acciones por tarea"><Input type="number" value={a.maxActionsPerRun} onChange={(e) => setA({ ...a, maxActionsPerRun: +e.target.value })} /></Field>
          <Field label="Máx. tareas al día"><Input type="number" value={a.maxRunsPerDay} onChange={(e) => setA({ ...a, maxRunsPerDay: +e.target.value })} /></Field>
          <Field label="Las aprobaciones caducan en (h)"><Input type="number" value={a.approvalTtlHours} onChange={(e) => setA({ ...a, approvalTtlHours: +e.target.value })} /></Field></div>
      </Section>
      <Button onClick={() => save(() => api.put(W(bot), { autonomy: a }), 'Autonomía guardada')}>Guardar autonomía</Button>
    </div>
  );
}

/* ───────── Aprobaciones (humano en el bucle) ───────── */
export function WorkerApprovalsTab({ bot }) {
  const toast = useToast(); const [tab, setTab] = useState('pending'); const [fb, setFb] = useState({});
  const { data = [], refetch } = useQuery({ queryKey: ['wk-approvals', bot._id, tab], queryFn: () => api.get(`${W(bot)}/approvals${tab === 'pending' ? '?status=pending' : ''}`).then((r) => r.data), refetchInterval: 15000 });
  const decide = async (a, approve, remember) => {
    try {
      const { data: r } = await api.post(`${W(bot)}/approvals/${a._id}/decide`, { approve, feedback: fb[a._id], remember });
      toast(approve ? (r.status === 'executed' ? `Aprobada y ejecutada${remember ? ': no volverá a preguntar por esta herramienta' : ''}` : `Aprobada, pero falló: ${r.error}. El empleado lo corregirá y lo reintentará.`) : 'Rechazada: lo tendrá en cuenta', r.status === 'failed' ? 'bad' : 'ok');
      refetch();
    } catch (e) { toast(errMsg(e), 'bad'); }
  };
  const list = tab === 'pending' ? data : data.filter((a) => a.status !== 'pending');
  return (
    <Section title="Aprobaciones" description="Lo que quiere hacer y necesita tu visto bueno. Si rechazas, explícale por qué: aprenderá para la próxima."
      actions={<div className="flex gap-1">{[['pending', 'Pendientes'], ['all', 'Historial']].map(([k, l]) => <Button key={k} size="sm" variant={tab === k ? 'primary' : 'secondary'} onClick={() => setTab(k)}>{l}</Button>)}</div>}>
      {!list.length ? <Empty title={tab === 'pending' ? 'Nada pendiente' : 'Sin historial'}>{tab === 'pending' ? 'Cuando proponga algo que requiera tu aprobación aparecerá aquí (y en Telegram, si lo configuraste).' : ''}</Empty> : (
        <ul className="space-y-3">{list.map((a) => { const [cl, CI, ct] = CAT[a.category] || CAT.data; return (
          <li key={a._id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={ct}><CI size={11} className="mr-1" />{cl}</Badge><span className="text-xs text-ink-soft">{fmtDate(a.createdAt)}{a.channels?.length ? ` · enviada por ${a.channels.join(', ')}` : ''}</span>{a.status !== 'pending' && <Badge tone={{ executed: 'ok', rejected: 'neutral', failed: 'bad', expired: 'neutral', approved: 'ok' }[a.status]}>{{ executed: 'Ejecutada', rejected: 'Rechazada', failed: 'Falló', expired: 'Caducada', approved: 'Aprobada' }[a.status]}</Badge>}</div>
            <p className="mt-2 font-semibold">{a.label}</p>
            {a.reason && <p className="mt-1 text-sm text-ink-soft"><i>Por qué:</i> {a.reason}</p>}
            {(a.votes?.length > 0 || (a.need > 1 && a.status === 'pending')) && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-ink-soft">Votos{a.need ? ` (${(a.votes || []).filter((v) => v.decision === 'approve').length}/${a.need})` : ''}:</span>
              {(a.votes || []).map((v, i) => <span key={i} className={`rounded-full px-2 py-0.5 font-semibold ${v.decision === 'approve' ? 'bg-tide-tint text-tide-dark' : 'bg-flare-tint text-flare'}`}>{v.decision === 'approve' ? '✓' : '✗'} {v.name} · {v.via}</span>)}
              {!(a.votes || []).length && <span className="text-ink-soft">nadie ha votado todavía</span>}</p>}
            <details className="mt-2"><summary className="cursor-pointer text-xs text-ink-soft">Ver detalles técnicos</summary><pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-mist p-2 font-mono text-xs">{JSON.stringify(a.args, null, 2)}</pre></details>
            {a.status === 'pending' ? <><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input placeholder="Si rechazas, dile por qué (opcional)" value={fb[a._id] || ''} onChange={(e) => setFb({ ...fb, [a._id]: e.target.value })} />
              <Button variant="danger" onClick={() => decide(a, false)}><X size={16} />Rechazar</Button><Button onClick={() => decide(a, true)}><Check size={16} />Aprobar</Button></div>
              {a.tool !== 'test_approval' && <button className="mt-2 text-xs font-semibold text-tide hover:underline" onClick={() => decide(a, true, true)}>Aprobar y permitir siempre «{a.tool.replace('__', ' › ')}» sin preguntar</button>}</>
              : <>{a.status === 'failed' && <p className="mt-2 rounded-lg bg-flare-tint px-3 py-2 text-xs text-flare">Falló al ejecutarse. El empleado ha recibido el error y lo corregirá y reintentará (mira Actividad).</p>}<p className="mt-2 text-xs text-ink-soft">{a.decidedBy && `Por ${a.decidedBy}${a.decidedVia ? ` desde ${{ panel: 'JuntialAgents', email: 'el email', telegram: 'Telegram', webhook: 'webhook', enlace: 'el enlace' }[a.decidedVia] || a.decidedVia}` : ''} · `}{a.feedback || a.result || ''}</p></>}
          </li>); })}</ul>)}
    </Section>
  );
}

/* ───────── Actividad: registro de trabajo con la traza completa ───────── */
const STATUS = { running: ['En curso', 'warn'], done: ['Completada', 'ok'], waiting: ['Espera aprobación', 'warn'], error: ['Error', 'bad'], skipped: ['Omitida', 'neutral'] };
export function WorkerActivityTab({ bot }) {
  const { data = [] } = useQuery({ queryKey: ['wk-runs', bot._id], queryFn: () => api.get(`${W(bot)}/runs`).then((r) => r.data), refetchInterval: 10000 });
  const [open, setOpen] = useState(null);
  const run = useQuery({ queryKey: ['wk-run', open], enabled: !!open, queryFn: () => api.get(`${W(bot)}/runs/${open}`).then((r) => r.data) });
  const stats = useMemo(() => ({ total: data.length, actions: data.reduce((a, r) => a + (r.actions || 0), 0), approvals: data.reduce((a, r) => a + (r.approvals || 0), 0) }), [data]);
  return (
    <Section title="Actividad" description={`Su registro de trabajo: ${stats.total} tareas · ${stats.actions} acciones · ${stats.approvals} propuestas.`}>
      {!data.length ? <Empty title="Aún no ha trabajado">Activa una rutina, encárgale algo o háblale por el chat.</Empty> : (
        <ul className="divide-y divide-line">{data.map((r) => (
          <li key={r._id}><button onClick={() => setOpen(r._id)} className="flex w-full flex-col gap-1 py-3 text-left sm:flex-row sm:items-start sm:gap-4">
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><b className="text-sm">{r.trigger?.label}</b><Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge></span>
              <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">{r.summary}</span></span>
            <span className="shrink-0 text-xs text-ink-soft">{fmtDate(r.createdAt)}{r.ms ? ` · ${(r.ms / 1000).toFixed(1)} s` : ''}{r.actions ? ` · ${r.actions} acciones` : ''}</span></button></li>))}</ul>)}
      <Modal open={!!open} onClose={() => setOpen(null)} title={run.data?.trigger?.label || 'Tarea'}>
        {run.data && <>
          <div className="rounded-lg bg-mist p-3 text-sm"><p className="text-xs font-semibold text-ink-soft">Encargo</p><p className="whitespace-pre-wrap">{run.data.instruction}</p></div>
          <ol className="relative space-y-3 border-l-2 border-line pl-4">{run.data.steps.map((s, i) => {
            const I = { thought: Sparkles, tool: CAT[s.category]?.[1] || Play, approval: ShieldAlert, blocked: Ban, error: AlertTriangle, decision: Check }[s.kind] || Eye;
            return <li key={i} className="relative"><span className="absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full bg-surface ring-2 ring-line"><I size={11} className={s.kind === 'error' || s.kind === 'blocked' ? 'text-flare' : s.kind === 'approval' ? 'text-signal' : 'text-tide'} /></span>
              <p className="text-xs text-ink-soft">+{(s.t / 1000).toFixed(1)} s · {{ thought: 'Razona', tool: 'Acción', approval: 'Pide aprobación', blocked: 'Bloqueado', error: 'Error', decision: 'Tu decisión' }[s.kind]}{s.name ? ` · ${s.name.replace('__', ' › ')}` : ''}{s.ms ? ` · ${s.ms} ms` : ''}</p>
              {s.kind === 'thought' ? <p className="text-sm italic">{s.result}</p> : <>{s.args && <details><summary className="cursor-pointer text-xs text-ink-soft">Parámetros</summary><pre className="max-h-32 overflow-auto rounded bg-mist p-2 font-mono text-[11px]">{JSON.stringify(s.args, null, 2)}</pre></details>}<p className="break-words text-sm">{String(s.result || '').slice(0, 400)}</p></>}</li>; })}</ol>
          <div className="rounded-lg border border-line p-3 text-sm"><p className="text-xs font-semibold text-ink-soft">Resumen para ti</p><p dangerouslySetInnerHTML={{ __html: md(run.data.summary) }} /></div>
        </>}
      </Modal>
    </Section>
  );
}

/* ───────── Documentos: reglas del puesto y bandeja ───────── */
const DOC_STATUS = { new: ['Nuevo', 'neutral'], processing: ['Analizando…', 'warn'], analyzed: ['Analizado', 'ok'], processed: ['Procesado', 'ok'], ignored: ['Ignorado', 'neutral'], error: ['Error', 'bad'] };
const SRC = { upload: 'Subido', url: 'Enlace', connector: 'Conector', api: 'API', chat: 'Chat' };
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.xlsx,.xls,.csv,.txt,.md,.json,.html,.xml';
const kb = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const fileToB64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(new Error('No se pudo leer el archivo')); r.readAsDataURL(file); });

export function WorkerDocsTab({ bot, save }) {
  const toast = useToast(); const d0 = bot.worker?.documents || {};
  const [cfg, setCfg] = useState({ autoProcess: d0.autoProcess !== false, fallback: d0.fallback || 'Resume el documento, indica de qué tipo es y avísame si requiere alguna acción.', rules: d0.rules || [] });
  const [status, setStatus] = useState(''); const [drag, setDrag] = useState(false); const [url, setUrl] = useState(''); const [open, setOpen] = useState(null); const [busy, setBusy] = useState(false);
  const files = useQuery({ queryKey: ['wk-files', bot._id, status], queryFn: () => api.get(`${W(bot)}/files${status ? `?status=${status}` : ''}`).then((r) => r.data), refetchInterval: 8000 });
  const detail = useQuery({ queryKey: ['wk-file', open], enabled: !!open, queryFn: () => api.get(`${W(bot)}/files/${open}`).then((r) => r.data), refetchInterval: (q) => (q.state.data?.status === 'processing' ? 2000 : false) });
  async function upload(list) {
    setBusy(true);
    for (const f of [...list].slice(0, 10)) {
      try { if (f.size > 10 * 1024 * 1024) throw new Error('supera 10 MB'); await api.post(`${W(bot)}/files`, { name: f.name, mime: f.type, data: await fileToB64(f) }); toast(`«${f.name}» en la bandeja${cfg.autoProcess ? ': el empleado lo procesará' : ''}`); }
      catch (e) { toast(`${f.name}: ${errMsg(e)}`, 'bad'); }
    }
    setBusy(false); files.refetch();
  }
  const download = async (f) => { const r = await fetch(`${API_URL}/api${W(bot)}/files/${f._id}/download`, { headers: { authorization: `Bearer ${getAccessToken()}` }, credentials: 'include' }); const u = URL.createObjectURL(await r.blob()); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000); };
  const setRule = (i, patch) => setCfg({ ...cfg, rules: cfg.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  return (
    <div className="space-y-5">
      <Section title="Cómo trata los documentos" description="Cuando reciba o se encuentre un documento (un PDF de un conector, un enlace, un archivo que le envíes), lo lee con el contexto de su puesto y actúa según estas reglas y su autonomía."
        actions={<Button onClick={() => save(() => api.put(W(bot), { documents: { ...cfg, rules: cfg.rules.filter((r) => r.type && r.how) } }), 'Reglas de documentos guardadas')}>Guardar</Button>}>
        <Toggle checked={cfg.autoProcess} onChange={(v) => setCfg({ ...cfg, autoProcess: v })} label="Procesar automáticamente los documentos que lleguen a su bandeja" hint="Si lo desactivas, solo se guardan y los procesa cuando se lo pidas." />
        <div className="mt-4 space-y-3">{cfg.rules.map((r, i) => (
          <div key={i} className="rounded-xl border border-line p-3.5">
            <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto]">
              <Field label="Tipo de documento"><Input value={r.type} onChange={(e) => setRule(i, { type: e.target.value })} placeholder="Factura de proveedor" /></Field>
              <Field label="Qué hacer con él"><Textarea rows={2} value={r.how} onChange={(e) => setRule(i, { how: e.target.value })} placeholder="Extrae los datos, comprueba que el total cuadra y regístrala en Zoho Books como borrador. Si falta el pedido, pídelo al proveedor." /></Field>
              <button aria-label="Quitar regla" onClick={() => setCfg({ ...cfg, rules: cfg.rules.filter((_, j) => j !== i) })} className="mt-7 grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button>
            </div>
            <Field label="Datos a extraer (opcional)" hint="Separados por comas. Se devuelven estructurados."><Input value={(r.fields || []).join(', ')} onChange={(e) => setRule(i, { fields: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} placeholder="proveedor, cif, numero, fecha, base, iva, total, vencimiento" /></Field>
          </div>))}
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => setCfg({ ...cfg, rules: [...cfg.rules, { type: '', how: '', fields: [] }] })}><Plus size={14} />Añadir tipo de documento</Button>
            {!cfg.rules.length && [['Factura de proveedor', 'Extrae los datos, comprueba que base + IVA = total y propón registrarla como borrador.', 'proveedor, cif, numero, fecha, base, iva, total, vencimiento'], ['Presupuesto firmado', 'Comprueba firma y fecha, marca el contacto como Cliente y avisa al equipo.', 'cliente, importe, fecha_firma, firmado'], ['Albarán', 'Comprueba que coincide con el pedido y avisa de diferencias.', 'proveedor, numero, fecha, lineas']].map(([t, h, f]) => <Button key={t} size="sm" variant="ghost" onClick={() => setCfg({ ...cfg, rules: [...cfg.rules, { type: t, how: h, fields: f.split(', ') }] })}>+ {t}</Button>)}</div>
        </div>
        <div className="mt-4"><Field label="Si no encaja en ningún tipo"><Input value={cfg.fallback} onChange={(e) => setCfg({ ...cfg, fallback: e.target.value })} /></Field></div>
      </Section>

      <Section title="Bandeja de documentos" description="PDF (también escaneados), imágenes, Word, Excel/CSV, texto, HTML y JSON hasta 10 MB. También le llegan los archivos que le devuelven los conectores y los que le envíes por la API o el chat."
        actions={<div className="w-44"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'Todos' }, ...Object.entries(DOC_STATUS).map(([v, [l]]) => ({ value: v, label: l }))]} /></div>}>
        <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${drag ? 'border-tide bg-tide-tint' : 'border-line hover:border-harbor-300'}`}>
          <input type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
          <BookOpen size={22} className="text-tide" /><b className="mt-2 text-sm">{busy ? 'Subiendo…' : 'Arrastra documentos aquí o pulsa para elegirlos'}</b><span className="text-xs text-ink-soft">Hasta 10 archivos a la vez</span>
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…o pega el enlace de un documento (https://…/factura.pdf)" />
          <Button variant="secondary" disabled={!/^https?:\/\//.test(url)} onClick={async () => { try { await api.post(`${W(bot)}/files`, { url }); setUrl(''); toast('Documento descargado a la bandeja'); files.refetch(); } catch (e) { toast(errMsg(e), 'bad'); } }}><Link2 size={16} />Añadir</Button></div>
        {!files.data?.length ? <p className="mt-4 text-sm text-ink-soft">La bandeja está vacía.</p> : (
          <ul className="mt-4 divide-y divide-line">{files.data.map((f) => (
            <li key={f._id}><button onClick={() => setOpen(f._id)} className="flex w-full items-start gap-3 py-3 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-mist text-[10px] font-bold uppercase text-ink-soft">{f.name.split('.').pop().slice(0, 4)}</span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><b className="truncate text-sm">{f.name}</b><Badge tone={DOC_STATUS[f.status][1]}>{DOC_STATUS[f.status][0]}</Badge>{f.analysis?.documentType && <Badge>{f.analysis.documentType}</Badge>}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-ink-soft">{f.analysis?.summary || f.error || f.note || '—'}</span></span>
              <span className="shrink-0 text-right text-xs text-ink-soft">{SRC[f.source]}<br />{kb(f.size)} · {fmtDate(f.createdAt)}</span></button></li>))}</ul>)}
      </Section>

      <Modal open={!!open} onClose={() => setOpen(null)} title={detail.data?.name || 'Documento'}
        footer={detail.data && <>
          <Button variant="danger" onClick={async () => { if (confirm('¿Eliminar el documento?')) { await api.delete(`${W(bot)}/files/${open}`); setOpen(null); files.refetch(); } }}><Trash2 size={16} /></Button>
          <Button variant="secondary" onClick={() => download(detail.data)}>Ver original</Button>
          <Button variant="secondary" onClick={async () => { try { await api.post(`${W(bot)}/files/${open}/analyze`); detail.refetch(); files.refetch(); toast('Analizado de nuevo'); } catch (e) { toast(errMsg(e), 'bad'); } }}><Search size={16} />Analizar</Button>
          <Button onClick={async () => { await api.post(`${W(bot)}/files/${open}/process`); toast('Encargado: lo procesará según sus reglas y su autonomía'); }}><Play size={16} />Procesar</Button></>}>
        {detail.data && (() => { const f = detail.data; const a = f.analysis || {}; return <>
          <div className="flex flex-wrap gap-2 text-xs"><Badge tone={DOC_STATUS[f.status][1]}>{DOC_STATUS[f.status][0]}</Badge><Badge>{SRC[f.source]}</Badge><span className="text-ink-soft">{f.mime} · {kb(f.size)} · {fmtDate(f.createdAt)}</span></div>
          {f.error && <p className="rounded-lg bg-flare-tint p-3 text-sm text-flare">{f.error}</p>}
          {f.note && <p className="text-sm text-ink-soft"><i>Nota:</i> {f.note}</p>}
          {a.documentType ? <>
            <div className="rounded-lg bg-mist p-3"><p className="text-xs font-semibold text-ink-soft">{a.documentType}{a.matchedRule ? ` · regla «${a.matchedRule}»` : ''} · confianza {Math.round((a.confidence || 0) * 100)} %</p><p className="mt-1 text-sm">{a.summary}</p></div>
            {a.fields && Object.keys(a.fields).length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{Object.entries(a.fields).map(([k, v]) => <tr key={k} className="border-b border-line"><td className="py-1.5 pr-4 font-semibold text-ink-soft">{k}</td><td className="py-1.5">{v == null ? <span className="text-flare">no encontrado</span> : typeof v === 'object' ? <code className="text-xs">{JSON.stringify(v)}</code> : String(v)}</td></tr>)}</tbody></table></div>}
            {a.issues?.length > 0 && <div><p className="text-xs font-semibold text-signal">Incidencias</p><ul className="list-disc pl-5 text-sm">{a.issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {a.suggestedActions?.length > 0 && <div><p className="text-xs font-semibold text-ink-soft">Acciones sugeridas</p><ul className="list-disc pl-5 text-sm">{a.suggestedActions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
          </> : f.status !== 'error' && <p className="text-sm text-ink-soft">{f.status === 'processing' ? 'Analizando…' : 'Aún sin analizar. Pulsa «Analizar» o «Procesar».'}</p>}
        </>; })()}
      </Modal>
    </div>
  );
}

/* ───────── Trabajo: la vista principal de lo que hace el empleado ───────── */
/** Markdown ligero y seguro para los informes (títulos, negritas, cursivas, listas). */
export function mdReport(t) {
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (x) => esc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code class="rounded bg-mist px-1 text-[12px]">$1</code>');
  const out = []; let list = null;
  for (const raw of String(t || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd(); const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (li) { if (!list) { list = []; } list.push(`<li>${inline(li[1])}</li>`); continue; }
    if (list) { out.push(`<ul class="my-1 list-disc space-y-0.5 pl-5">${list.join('')}</ul>`); list = null; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) out.push(`<p class="mt-2 font-bold ${h[1].length <= 2 ? 'text-[15px]' : 'text-sm'}">${inline(h[2])}</p>`);
    else if (/^\*\*[^*]+\*\*:?$/.test(line.trim())) out.push(`<p class="mt-2 text-xs font-bold uppercase tracking-wide text-tide-dark">${esc(line.trim().replace(/\*\*/g, '').replace(/:$/, ''))}</p>`);
    else if (line.trim()) out.push(`<p class="my-1">${inline(line)}</p>`);
  }
  if (list) out.push(`<ul class="my-1 list-disc space-y-0.5 pl-5">${list.join('')}</ul>`);
  return out.join('');
}
const KIND = { schedule: ['Rutina', '⏰'], manual: ['Manual', '▶️'], event: ['Evento', '⚡'], followup: ['Seguimiento', '↩️'], answer: ['Respuesta', '💬'], chat: ['Chat', '💬'] };
const CH = { panel: '🧩 Panel', telegram: '✈️ Telegram', email: '✉️ Email', webhook: '🔗 Webhook', todos: 'Canales' };
const fmtIn = (d) => { if (!d) return '—'; const ms = new Date(d) - Date.now(); if (ms < 0) return 'ahora'; const m = Math.round(ms / 60000); if (m < 60) return `en ${m} min`; const h = Math.round(m / 60); if (h < 24) return `en ${h} h`; return new Date(d).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
const tk = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} M` : n > 1e3 ? `${Math.round(n / 1e3)} mil` : String(n || 0));

function RunCard({ r, onTrace }) {
  const [open, setOpen] = useState(false); const [kl, ki] = KIND[r.trigger?.type] || ['Tarea', '•']; const [sl, st] = STATUS[r.status] || ['—', 'neutral'];
  const long = (r.summary || '').length > 700;
  return (
    <li className="panel p-4">
      <div className="flex flex-wrap items-center gap-2"><span aria-hidden="true">{ki}</span><b className="text-sm">{r.trigger?.label}</b><Badge tone={st}>{sl}</Badge><Badge>{kl}</Badge>
        <span className="ml-auto text-xs text-ink-soft">{fmtDate(r.createdAt)}{r.ms ? ` · ${(r.ms / 1000).toFixed(0)} s` : ''}{r.actions ? ` · ${r.actions} acciones` : ''}{r.approvals ? ` · ${r.approvals} propuestas` : ''}</span></div>
      {r.summary ? <div className={`relative mt-2 text-sm leading-relaxed ${!open && long ? 'max-h-60 overflow-hidden' : ''}`}><div dangerouslySetInnerHTML={{ __html: mdReport(r.summary) }} />{!open && long && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface" />}</div>
        : <p className="mt-2 text-sm italic text-ink-soft">{r.status === 'skipped' ? `Omitida: ${r.summary || 'fuera de horario o en pausa'}` : 'Sin resumen.'}</p>}
        {r.summary && open && r.detail && <div className="mt-3 rounded-lg border border-line bg-mist/50 p-3 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: mdReport(r.detail) }} />}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        {long && <button className="font-semibold text-tide" onClick={() => setOpen(!open)}>{open ? 'Ver menos' : 'Leer completo'}</button>}
        {r.detail && <button className="font-semibold text-tide" onClick={() => setOpen(!open)}>{open ? 'Ocultar detalle' : 'Ver detalle'}</button>}
        {r.report?.delivery?.length > 0 && <span className="flex flex-wrap items-center gap-1"><span className="text-ink-soft">Enviado a:</span>{r.report.delivery.map((d) => <span key={d.channel} title={d.error || d.info} className={`rounded-full px-2 py-0.5 font-semibold ${d.ok ? 'bg-tide-tint text-tide-dark' : 'bg-flare-tint text-flare'}`}>{d.ok ? '✓' : '✗'} {CH[d.channel] || d.channel}</span>)}</span>}
        {r.report && !r.report.sent && r.report.reason && r.trigger?.type !== 'chat' && <span className="rounded-full bg-mist px-2 py-0.5 text-ink-soft">No se envió: {r.report.reason}</span>}
        <button className="ml-auto font-semibold text-tide" onClick={() => onTrace(r._id)}>Ver traza paso a paso →</button>
      </div>
    </li>
  );
}

export function WorkerWorkTab({ bot }) {
  const toast = useToast(); const [kind, setKind] = useState('');
  const ov = useQuery({ queryKey: ['wk-overview', bot._id], queryFn: () => api.get(`${W(bot)}/overview`).then((r) => r.data), refetchInterval: 15000 });
  const runs = useQuery({ queryKey: ['wk-runs', bot._id, kind], queryFn: () => api.get(`${W(bot)}/runs?limit=60${kind ? `&kind=${kind}` : ''}`).then((r) => r.data), refetchInterval: 10000 });
  const [trace, setTrace] = useState(null);
  const run = useQuery({ queryKey: ['wk-run', trace], enabled: !!trace, queryFn: () => api.get(`${W(bot)}/runs/${trace}`).then((r) => r.data) });
  const o = ov.data; const t = o?.today; const w = o?.week;
  const Kpi = ({ label, value, sub, tone }) => <div className="panel p-3.5"><p className="text-xs text-ink-soft">{label}</p><p className={`mt-0.5 text-2xl font-extrabold ${tone === 'bad' ? 'text-flare' : tone === 'warn' ? 'text-signal' : ''}`}>{value ?? '—'}</p>{sub && <p className="text-[11px] text-ink-soft">{sub}</p>}</div>;
  const FILTERS = [['', 'Todo'], ['routine', '⏰ Rutinas'], ['manual', '▶️ Manuales'], ['event', '⚡ Eventos'], ['chat', '💬 Chat'], ['errors', '⚠️ Errores'], ['skipped', '⏸ Omitidas']];
  return (
    <div className="space-y-5">
      {o?.paused && <p className="rounded-lg bg-signal-tint px-4 py-2.5 text-sm text-signal">El empleado está en pausa: no ejecuta rutinas ni encargos.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Tareas hoy" value={t?.runs} sub={`${w?.runs ?? '—'} esta semana`} />
        <Kpi label="Informes enviados hoy" value={t?.reports} sub={`${w?.reports ?? '—'} esta semana`} />
        <Kpi label="Acciones hoy" value={t?.actions} sub={`${t?.approvals ?? 0} propuestas`} />
        <Kpi label="Aprobaciones pendientes" value={o?.pendingApprovals} tone={o?.pendingApprovals ? 'warn' : ''} />
        <Kpi label="Errores / omitidas (7 d)" value={`${w?.errors ?? 0} / ${w?.skipped ?? 0}`} tone={w?.errors ? 'bad' : ''} />
        <Kpi label="Duración media" value={w?.avgMs ? `${Math.round(w.avgMs / 1000)} s` : '—'} sub={`${tk(w?.tokens)} tokens (7 d)`} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section aria-labelledby="feed-h">
          <div className="mb-3 flex flex-wrap items-center gap-2"><h2 id="feed-h" className="text-lg font-bold">Informes y tareas</h2>
            <div className="ml-auto flex flex-wrap gap-1">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-full border px-3 py-1 text-xs font-semibold ${kind === k ? 'border-tide bg-tide text-white' : 'border-line'}`}>{l}</button>)}</div></div>
          {!runs.data?.length ? <Empty title="Sin actividad">Lanza una rutina con «Ahora» o encárgale algo.</Empty> : <ul className="space-y-3">{runs.data.map((r) => <RunCard key={r._id} r={r} onTrace={setTrace} />)}</ul>}
        </section>
        <aside className="space-y-4">
          <Section title="Próximas ejecuciones" description={`Horario: ${o?.workingHours || '—'}`}>
            <ul className="space-y-2">{(o?.routines || []).map((rt) => (
              <li key={rt.id} className="rounded-lg border border-line p-2.5 text-sm"><span className="flex items-center justify-between gap-2"><b className="truncate">{rt.name}</b>{rt.enabled ? <Badge tone="ok">{fmtIn(rt.nextAt)}</Badge> : <Badge>En pausa</Badge>}</span>
                <span className="mt-0.5 block text-xs text-ink-soft">{cronLabel(rt.cron)} · {rt.runs || 0} ejecuciones{rt.lastRunAt ? ` · última ${fmtDate(rt.lastRunAt)}${rt.lastStatus && rt.lastStatus !== 'ok' ? ` (${rt.lastStatus})` : ''}` : ''}</span>
                <button className="mt-1 text-xs font-semibold text-tide" onClick={async () => { await api.post(`${W(bot)}/routines/${rt.id}/run`); toast('Ejecutando ahora: aparecerá aquí en unos segundos'); }}>▶ Ejecutar ahora</button></li>))}
              {!o?.routines?.length && <li className="text-sm text-ink-soft">Sin rutinas. Créalas en la pestaña Rutinas.</li>}</ul>
          </Section>
          <WorkMemory bot={bot} />
          <Section title="Dónde informa">{(o?.channels || []).map((c) => <Badge key={c}>{CH[c]}</Badge>)}<p className="mt-2 text-xs text-ink-soft">Configúralo en Puesto → Canales y en Equipo.</p></Section>
        </aside>
      </div>
      <Modal open={!!trace} onClose={() => setTrace(null)} title={run.data?.trigger?.label || 'Tarea'}>
        {run.data && <>
          <div className="rounded-lg bg-mist p-3 text-sm"><p className="text-xs font-semibold text-ink-soft">Encargo</p><p className="whitespace-pre-wrap">{run.data.instruction}</p></div>
          <ol className="relative space-y-3 border-l-2 border-line pl-4">{run.data.steps.map((s, i) => (
            <li key={i} className="relative"><span className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ${s.kind === 'error' || s.kind === 'blocked' ? 'bg-flare' : s.kind === 'approval' ? 'bg-signal' : s.kind === 'thought' ? 'bg-line' : 'bg-tide'}`} />
              <p className="text-xs text-ink-soft">+{(s.t / 1000).toFixed(1)} s · {{ thought: 'Razona', tool: 'Consulta / acción', approval: 'Pide aprobación', blocked: 'Bloqueado', error: 'Error', decision: 'Tu decisión' }[s.kind] || s.kind}{s.name ? ` · ${s.name.replace('__', ' › ')}` : ''}{s.ms ? ` · ${s.ms} ms` : ''}</p>
              {s.kind === 'thought' ? <p className="text-sm italic">{s.result}</p> : <>{s.args && <details><summary className="cursor-pointer text-xs text-ink-soft">Parámetros</summary><pre className="max-h-32 overflow-auto rounded bg-mist p-2 font-mono text-[11px]">{JSON.stringify(s.args, null, 2)}</pre></details>}<p className={`break-words text-sm ${s.kind === 'error' ? 'text-flare' : ''}`}>{String(s.result || '').slice(0, 500)}</p></>}</li>))}</ol>
          <div className="rounded-lg border border-line p-3 text-sm"><p className="text-xs font-semibold text-ink-soft">Informe</p><div dangerouslySetInnerHTML={{ __html: mdReport(run.data.summary) }} /></div>
        </>}
      </Modal>
    </div>
  );
}


/** Memoria de trabajo: lo que tiene entre manos y lo que ha ido haciendo. */
function WorkMemory({ bot }) {
  const q = useQuery({ queryKey: ['wk-workmem', bot._id], queryFn: () => api.get(`${W(bot)}/memory/work`).then((r) => r.data), refetchInterval: 20000 });
  const open = (q.data?.threads || []).filter((t) => t.status === 'open');
  return (
    <>
      <Section title="Tiene entre manos" description="Pendientes que se ha apuntado. Los retoma solo y los cierra al terminarlos.">
        {!open.length ? <p className="text-sm text-ink-soft">Nada pendiente.</p> : <ul className="space-y-2">{open.map((t) => (
          <li key={t._id} className="flex items-start gap-2 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.due && new Date(t.due) < new Date() ? 'bg-flare' : 'bg-signal'}`} />
            <span className="flex-1">{t.text}{t.who && <span className="text-ink-soft"> · {t.who}</span>}{t.due && <span className="block text-xs text-ink-soft">para {fmtDate(t.due)}</span>}</span>
            <button className="text-xs font-semibold text-tide" onClick={async () => { await api.post(`${W(bot)}/threads/${t._id}/close`); q.refetch(); }}>Hecho</button></li>))}</ul>}
      </Section>
      <Section title="Lo que ha ido haciendo">
        {!(q.data?.journal || []).length ? <p className="text-sm text-ink-soft">Aún sin actividad.</p> : <ol className="max-h-80 space-y-2 overflow-y-auto">{q.data.journal.slice(0, 25).map((j, i) => (
          <li key={i} className="border-l-2 border-line pl-3 text-xs"><span className="text-ink-soft">{fmtDate(j.at)}</span><br />{j.text}</li>))}</ol>}
      </Section>
    </>
  );
}
