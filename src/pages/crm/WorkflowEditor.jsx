import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowDown, FlaskConical, Clock } from 'lucide-react';
import { api, errMsg } from '../../lib/api.js';
import { PageHeader, Section, Button, Field, Input, Textarea, Select, Toggle, Badge, Secret, Modal, fmtDate, useToast } from '../../components/ui.jsx';
import { useFields, useMeta, VarChips, FieldInput } from './common.jsx';
import { ACTION_ICON } from './Workflows.jsx';

const NO_VALUE = ['is_empty', 'is_not_empty', 'changed', 'is_true', 'is_false'];
const OPS_BY_TYPE = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'is_empty', 'is_not_empty', 'changed', 'changed_to'],
  number: ['equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty', 'changed'],
  date: ['before', 'after', 'in_last_days', 'in_next_days', 'is_empty', 'is_not_empty', 'changed'],
  picklist: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty', 'changed', 'changed_to'],
  boolean: ['is_true', 'is_false', 'changed'],
};
const opsFor = (t) => OPS_BY_TYPE[{ textarea: 'text', email: 'text', phone: 'text', url: 'text', currency: 'number', datetime: 'date', multiselect: 'picklist' }[t] || t] || OPS_BY_TYPE.text;
const BLANK = { name: '', description: '', enabled: true, scope: { type: 'all', agentIds: [] }, trigger: { event: 'create_or_edit', fields: [], repeat: false, dateField: '', offsetMinutes: 0 }, conditions: { match: 'all', rules: [] }, actions: [] };
const ACTION_DEFAULTS = {
  email: { to: '{{record.email}}', subject: '', body: '' }, telegram: { botId: '', target: 'chat', chatId: '', text: '', mode: 'message' },
  webhook: { url: '', method: 'POST', body: '' }, agent_task: { agentId: '', instruction: '' }, field_update: { field: '', value: '', retrigger: false }, notify: { title: '', body: '' }, function: { functionId: '' },
};
const UNITS = [[1, 'minutos'], [60, 'horas'], [1440, 'días']];
const splitMinutes = (m) => { const abs = Math.abs(m || 0); const u = [...UNITS].reverse().find(([k]) => abs && abs % k === 0) || UNITS[0]; return { n: abs / u[0], unit: u[0] }; };

/* Fuera del componente: si se define dentro, React lo recrea en cada tecla y los campos pierden el foco */
function Step({ n, title, children, hint }) {
  return (
    <>
      <Section title={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-harbor text-xs font-bold text-white">{n}</span>{title}</span>} description={hint}>{children}</Section>
      <div className="flex justify-center py-1 text-line" aria-hidden="true"><ArrowDown size={18} /></div>
    </>
  );
}

export default function WorkflowEditor() {
  const { id } = useParams(); const isNew = id === 'new'; const nav = useNavigate(); const toast = useToast(); const qc = useQueryClient();
  const fields = useFields(); const meta = useMeta();
  const bots = useQuery({ queryKey: ['bots'], queryFn: () => api.get('/bots').then((r) => r.data) });
  const fns = useQuery({ queryKey: ['crm-functions'], queryFn: () => api.get('/crm/functions').then((r) => r.data) });
  const rule = useQuery({ queryKey: ['crm-workflow', id], enabled: !isNew, queryFn: () => api.get(`/crm/workflows/${id}`).then((r) => r.data) });
  const runs = useQuery({ queryKey: ['crm-workflow-runs', id], enabled: !isNew, queryFn: () => api.get(`/crm/workflows/${id}/runs`).then((r) => r.data), refetchInterval: 15000 });
  const [w, setW] = useState(isNew ? BLANK : null); const [busy, setBusy] = useState(false); const [test, setTest] = useState(null);
  useEffect(() => { if (rule.data && !w) setW({ ...BLANK, ...rule.data, scope: { type: rule.data.scope?.type || 'all', agentIds: (rule.data.scope?.agentIds || []).map(String) } }); }, [rule.data]); // eslint-disable-line
  if (!w || !fields.data || !meta.data) return <p className="text-ink-soft">Cargando…</p>;
  const F = fields.data; const byKey = Object.fromEntries(F.map((f) => [f.key, f]));
  const set = (patch) => setW({ ...w, ...patch });
  const setT = (patch) => set({ trigger: { ...w.trigger, ...patch } });
  const setCond = (i, patch) => set({ conditions: { ...w.conditions, rules: w.conditions.rules.map((c, j) => (j === i ? { ...c, ...patch } : c)) } });
  const setAct = (i, patch) => set({ actions: w.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const setCfg = (i, patch) => setAct(i, { config: { ...w.actions[i].config, ...patch } });
  const dateFields = F.filter((f) => ['date', 'datetime'].includes(f.type));
  const tgBots = (bots.data || []).filter((b) => b.kind !== 'web' && b.telegram?.connected);
  const off = splitMinutes(w.trigger.offsetMinutes);

  async function save() {
    setBusy(true);
    try {
      const body = { ...w, scope: { type: w.scope.type, agentIds: w.scope.type === 'agents' ? w.scope.agentIds : [] }, actions: w.actions.map(({ _id, ...a }) => a) };
      ['_id', 'tenantId', 'stats', 'createdAt', 'updatedAt', '__v', 'webhookSecret', 'module'].forEach((k) => delete body[k]);
      const { data } = isNew ? await api.post('/crm/workflows', body) : await api.put(`/crm/workflows/${id}`, body);
      toast('Regla guardada'); qc.invalidateQueries({ queryKey: ['crm-workflows'] });
      if (isNew) nav(`/crm/workflows/${data._id}`, { replace: true }); else rule.refetch();
    } catch (e) { toast(errMsg(e), 'bad'); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={isNew ? 'Nueva regla de flujo' : w.name || 'Regla'} subtitle="Cuando ocurre algo en un contacto → si cumple las condiciones → se ejecutan las acciones."
        actions={<>{!isNew && <Button variant="secondary" onClick={() => setTest({ recordId: '' })}><FlaskConical size={16} />Probar</Button>}<Button loading={busy} onClick={save}>Guardar regla</Button></>} />

      <Step n="1" title="Información">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre"><Input value={w.name} onChange={(e) => set({ name: e.target.value })} placeholder="Lead cualificado → avisar al comercial" /></Field>
          <div className="flex items-end"><Toggle checked={w.enabled} onChange={(v) => set({ enabled: v })} label={w.enabled ? 'Regla activa' : 'Regla pausada'} /></div></div>
        <div className="mt-3"><Field label="Descripción (opcional)"><Input value={w.description} onChange={(e) => set({ description: e.target.value })} /></Field></div>
      </Step>

      <Step n="2" title="Alcance" hint="Una regla puede aplicarse a todos tus agentes o solo a algunos (individual o por grupo).">
        <div className="grid gap-2 sm:grid-cols-2">{[['all', 'Todos los agentes', 'Se aplica a cualquier contacto, venga de donde venga.'], ['agents', 'Agentes concretos', 'Solo contactos que hayan hablado con los agentes elegidos.']].map(([v, t, d]) => (
          <label key={v} className={`cursor-pointer rounded-xl border p-3 ${w.scope.type === v ? 'border-tide bg-tide-tint' : 'border-line'}`}><span className="flex items-center gap-2"><input type="radio" className="accent-tide" checked={w.scope.type === v} onChange={() => set({ scope: { ...w.scope, type: v } })} /><b className="text-sm">{t}</b></span><span className="mt-1 block text-xs text-ink-soft">{d}</span></label>))}</div>
        {w.scope.type === 'agents' && <div className="mt-3 flex flex-wrap gap-2">{(bots.data || []).map((b) => { const on = w.scope.agentIds.includes(b._id); return <button type="button" key={b._id} onClick={() => set({ scope: { ...w.scope, agentIds: on ? w.scope.agentIds.filter((x) => x !== b._id) : [...w.scope.agentIds, b._id] } })} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? 'border-tide bg-tide text-white' : 'border-line'}`}>{b.kind === 'web' ? '🌐' : '✈️'} {b.name}</button>; })}</div>}
      </Step>

      <Step n="3" title="Cuándo se ejecuta">
        <Field label="Disparador"><Select value={w.trigger.event} onChange={(e) => setT({ event: e.target.value })} options={Object.entries(meta.data.triggers).map(([value, label]) => ({ value, label }))} /></Field>
        {w.trigger.event === 'field_update' && <div className="mt-3"><p className="label">Cuando cambie alguno de estos campos</p><div className="flex flex-wrap gap-1.5">{F.map((f) => { const on = w.trigger.fields.includes(f.key); return <button type="button" key={f.key} onClick={() => setT({ fields: on ? w.trigger.fields.filter((x) => x !== f.key) : [...w.trigger.fields, f.key] })} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-tide bg-tide text-white' : 'border-line'}`}>{f.label}</button>; })}</div></div>}
        {w.trigger.event === 'date' && <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_90px_120px_120px]">
          <Field label="Campo de fecha"><Select value={w.trigger.dateField || ''} onChange={(e) => setT({ dateField: e.target.value })} options={[{ value: '', label: dateFields.length ? 'Elige…' : 'Crea antes un campo de fecha' }, ...dateFields.map((f) => ({ value: f.key, label: f.label }))]} /></Field>
          <Field label="Cuánto"><Input type="number" min="0" value={off.n} onChange={(e) => setT({ offsetMinutes: Math.sign(w.trigger.offsetMinutes || -1) * Number(e.target.value) * off.unit })} /></Field>
          <Field label="Unidad"><Select value={String(off.unit)} onChange={(e) => setT({ offsetMinutes: Math.sign(w.trigger.offsetMinutes || -1) * off.n * Number(e.target.value) })} options={UNITS.map(([v, l]) => ({ value: String(v), label: l }))} /></Field>
          <Field label="Momento"><Select value={(w.trigger.offsetMinutes || 0) < 0 ? 'before' : (w.trigger.offsetMinutes || 0) > 0 ? 'after' : 'on'} onChange={(e) => setT({ offsetMinutes: e.target.value === 'on' ? 0 : (e.target.value === 'before' ? -1 : 1) * (off.n || 1) * off.unit })} options={[{ value: 'before', label: 'antes' }, { value: 'on', label: 'en el momento' }, { value: 'after', label: 'después' }]} /></Field>
        </div>}
        {['edit', 'create_or_edit', 'field_update'].includes(w.trigger.event) && <div className="mt-3"><Toggle checked={w.trigger.repeat} onChange={(v) => setT({ repeat: v })} label="Repetir en cada edición" hint="Desactivado: solo se ejecuta cuando el contacto PASA a cumplir las condiciones (no en cada cambio posterior). Igual que en Zoho." /></div>}
      </Step>

      <Step n="4" title="Condiciones" hint="Opcional. Sin condiciones, se ejecuta para todos los contactos del disparador.">
        {w.conditions.rules.length > 1 && <div className="mb-3 flex items-center gap-2 text-sm">Se cumplen <div className="w-28"><Select value={w.conditions.match} onChange={(e) => set({ conditions: { ...w.conditions, match: e.target.value } })} options={[{ value: 'all', label: 'todas' }, { value: 'any', label: 'alguna' }]} /></div> las condiciones</div>}
        <div className="space-y-2">{w.conditions.rules.map((c, i) => { const f = byKey[c.field]; const ops = opsFor(f?.type); return (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start">
            <Select value={c.field} onChange={(e) => setCond(i, { field: e.target.value, op: opsFor(byKey[e.target.value]?.type)[0], value: '' })} options={F.map((x) => ({ value: x.key, label: x.label }))} />
            <Select value={c.op} onChange={(e) => setCond(i, { op: e.target.value })} options={ops.map((o) => ({ value: o, label: meta.data.operators[o] }))} />
            {!NO_VALUE.includes(c.op) ? (['in', 'not_in'].includes(c.op) || ['in_last_days', 'in_next_days'].includes(c.op) ? <Input value={c.value ?? ''} onChange={(e) => setCond(i, { value: e.target.value })} placeholder={c.op.includes('days') ? 'Nº de días' : 'Valores separados por comas'} /> : <FieldInput field={f || { type: 'text' }} value={c.value} onChange={(v) => setCond(i, { value: v })} />) : <span className="hidden sm:block" />}
            <button aria-label="Quitar condición" onClick={() => set({ conditions: { ...w.conditions, rules: w.conditions.rules.filter((_, j) => j !== i) } })} className="grid h-10 w-10 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button>
          </div>); })}</div>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => set({ conditions: { ...w.conditions, rules: [...w.conditions.rules, { field: F[0].key, op: opsFor(F[0].type)[0], value: '' }] } })}><Plus size={14} />Añadir condición</Button>
      </Step>

      <Section title={<span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-harbor text-xs font-bold text-white">5</span>Acciones</span>} description="Se ejecutan en orden. Puedes programarlas para más tarde (por ejemplo, un seguimiento a los 2 días).">
        <div className="space-y-3">{w.actions.map((a, i) => { const I = ACTION_ICON[a.type]; const c = a.config || {}; const d = splitMinutes(a.delayMinutes); const pick = (k) => (v) => setCfg(i, { [k]: `${c[k] || ''}${v}` }); return (
          <div key={a._id || i} className="rounded-xl border border-line p-3.5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-tide-tint text-tide-dark"><I size={16} /></span>{meta.data.actions[a.type]}</span>
              <span className="flex items-center gap-2"><Clock size={14} className="text-ink-soft" /><Select value={a.delayMinutes ? 'later' : 'now'} onChange={(e) => setAct(i, { delayMinutes: e.target.value === 'now' ? 0 : 60 })} options={[{ value: 'now', label: 'Inmediata' }, { value: 'later', label: 'Programada' }]} />
                <button aria-label="Quitar acción" onClick={() => set({ actions: w.actions.filter((_, j) => j !== i) })} className="grid h-10 w-10 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button></span></div>
            {a.delayMinutes > 0 && <div className="mb-3 flex items-center gap-2 text-sm">Ejecutar <Input type="number" min="1" className="w-24" value={d.n} onChange={(e) => setAct(i, { delayMinutes: Math.max(1, Number(e.target.value)) * d.unit })} /><Select value={String(d.unit)} onChange={(e) => setAct(i, { delayMinutes: d.n * Number(e.target.value) })} options={UNITS.map(([v, l]) => ({ value: String(v), label: l }))} />después (si sigue cumpliendo las condiciones)</div>}
            {a.type === 'email' && <div className="space-y-3"><Field label="Para" hint="Emails separados por comas, o {{record.email}} para el propio contacto."><Input value={c.to} onChange={(e) => setCfg(i, { to: e.target.value })} /></Field><Field label="Asunto"><Input value={c.subject} onChange={(e) => setCfg(i, { subject: e.target.value })} /><VarChips fields={F} onPick={pick('subject')} /></Field><Field label="Mensaje"><Textarea rows={4} value={c.body} onChange={(e) => setCfg(i, { body: e.target.value })} /><VarChips fields={F} onPick={pick('body')} /></Field></div>}
            {a.type === 'telegram' && <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Bot"><Select value={c.botId} onChange={(e) => setCfg(i, { botId: e.target.value })} options={[{ value: '', label: tgBots.length ? 'Elige un bot…' : 'No tienes bots de Telegram conectados' }, ...tgBots.map((b) => ({ value: b._id, label: `${b.name} (@${b.telegram.username})` }))]} /></Field>
              <Field label="Destino"><Select value={c.target} onChange={(e) => setCfg(i, { target: e.target.value })} options={[{ value: 'chat', label: 'Un chat o grupo concreto' }, { value: 'record', label: 'El propio contacto (si escribió por Telegram)' }]} /></Field></div>
              {c.target === 'chat' && <TgChatPicker botId={c.botId} value={c.chatId} onChange={(v) => setCfg(i, { chatId: v })} />}
              <Field label="Mensaje"><Textarea rows={3} value={c.text} onChange={(e) => setCfg(i, { text: e.target.value })} placeholder="🔔 Nuevo lead cualificado: {{record.name}} · {{record.phone}}" /><VarChips fields={F} onPick={pick('text')} /></Field>
              <Field label="Botones (opcional)" hint='Uno por línea, también con variables. Enlace: "Ver ficha | {{record.url}}". Lo que pulse llega al agente, que sigue la conversación.'><Textarea rows={3} value={c.buttons || ''} onChange={(e) => setCfg(i, { buttons: e.target.value })} placeholder={'✅ Confirmo la visita\n📅 Cambiar fecha\n📞 Que me llamen'} /></Field>
              <Toggle checked={c.mode === 'agent'} onChange={(v) => setCfg(i, { mode: v ? 'agent' : 'message' })} label="Que el agente redacte el mensaje" hint="El texto se usa como instrucción y el bot escribe la respuesta con IA y sus conectores." /></div>}
            {a.type === 'webhook' && <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-[1fr_120px]"><Field label="URL (https)"><Input value={c.url} onChange={(e) => setCfg(i, { url: e.target.value })} placeholder="https://hook.eu1.make.com/…" /></Field><Field label="Método"><Select value={c.method} onChange={(e) => setCfg(i, { method: e.target.value })} options={['POST', 'PUT', 'PATCH'].map((m) => ({ value: m, label: m }))} /></Field></div>
              <Field label="Cuerpo (opcional)" hint="Vacío = JSON con la regla, el contacto completo y los cambios."><Textarea rows={3} className="font-mono text-xs" value={c.body} onChange={(e) => setCfg(i, { body: e.target.value })} placeholder={'{"email": "{{record.email}}", "estado": "{{record.status}}"}'} /><VarChips fields={F} onPick={pick('body')} /></Field>
              {w.webhookSecret && <Field label="Secreto de firma (X-JuntialAgents-Signature)"><Secret value={w.webhookSecret} /></Field>}</div>}
            {a.type === 'field_update' && <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Campo"><Select value={c.field} onChange={(e) => setCfg(i, { field: e.target.value, value: '' })} options={[{ value: '', label: 'Elige…' }, ...F.map((f) => ({ value: f.key, label: f.label }))]} /></Field>
              {c.field && <Field label="Nuevo valor">{['picklist', 'boolean', 'date', 'datetime', 'multiselect'].includes(byKey[c.field]?.type) ? <FieldInput field={byKey[c.field]} value={c.value} onChange={(v) => setCfg(i, { value: v })} /> : <><Input value={c.value ?? ''} onChange={(e) => setCfg(i, { value: e.target.value })} /><VarChips fields={F} onPick={pick('value')} /></>}</Field>}</div>
              <Toggle checked={!!c.retrigger} onChange={(v) => setCfg(i, { retrigger: v })} label="Que este cambio dispare otras reglas" hint="Desactivado por defecto para evitar cadenas inesperadas (máx. 3 niveles)." /></div>}
            {a.type === 'notify' && <div className="space-y-3"><Field label="Título"><Input value={c.title} onChange={(e) => setCfg(i, { title: e.target.value })} /><VarChips fields={F} onPick={pick('title')} /></Field><Field label="Texto"><Input value={c.body} onChange={(e) => setCfg(i, { body: e.target.value })} /></Field></div>}
            {a.type === 'agent_task' && <div className="space-y-3"><Field label="Empleado digital"><Select value={c.agentId} onChange={(e) => setCfg(i, { agentId: e.target.value })} options={[{ value: '', label: (bots.data || []).some((b) => b.kind === 'worker') ? 'Elige…' : 'Aún no tienes empleados digitales' }, ...(bots.data || []).filter((b) => b.kind === 'worker').map((b) => ({ value: b._id, label: `🧠 ${b.name} · ${b.worker?.title || ''}` }))]} /></Field>
              <Field label="Encargo" hint="Recibirá además la ficha completa del contacto y los cambios. Actuará según su autonomía."><Textarea rows={3} value={c.instruction} onChange={(e) => setCfg(i, { instruction: e.target.value })} placeholder="Este lead acaba de llegar: cualifícalo, prepara el primer mensaje y avísame si es prioritario." /><VarChips fields={F} onPick={pick('instruction')} /></Field></div>}
            {a.type === 'function' && <div className="flex flex-col gap-2 sm:flex-row sm:items-end"><div className="flex-1"><Field label="Función"><Select value={c.functionId} onChange={(e) => setCfg(i, { functionId: e.target.value })} options={[{ value: '', label: (fns.data || []).length ? 'Elige…' : 'Aún no tienes funciones' }, ...(fns.data || []).map((f) => ({ value: f._id, label: `${f.name} (${f.apiName})` }))]} /></Field></div><Button variant="secondary" onClick={() => nav(c.functionId ? `/crm/functions/${c.functionId}` : '/crm/functions')}>{c.functionId ? 'Abrir editor' : 'Crear función'}</Button></div>}
          </div>); })}</div>
        <div className="mt-3 flex flex-wrap gap-2">{Object.entries(meta.data.actions).map(([t, l]) => { const I = ACTION_ICON[t]; return <Button key={t} size="sm" variant="secondary" onClick={() => set({ actions: [...w.actions, { type: t, config: { ...ACTION_DEFAULTS[t] }, delayMinutes: 0 }] })}><I size={14} />{l}</Button>; })}</div>
      </Section>

      {!isNew && <div className="mt-5"><Section title="Últimas ejecuciones">
        {!runs.data?.length ? <p className="text-sm text-ink-soft">Aún no se ha ejecutado.</p> : <ul className="divide-y divide-line text-sm">{runs.data.map((r) => (
          <li key={r._id} className="py-2"><span className="flex flex-wrap items-center gap-2"><Badge tone={{ ok: 'ok', scheduled: 'warn', partial: 'warn', error: 'bad' }[r.status]}>{r.status}</Badge><span className="text-xs text-ink-soft">{fmtDate(r.createdAt)} · {r.event} · por {r.by}</span></span>
            <span className="mt-1 block text-xs">{r.actions.map((a) => `${a.type}: ${a.status}${a.error ? ` (${a.error})` : ''}`).join(' · ')}</span></li>))}</ul>}
      </Section></div>}

      <Modal open={!!test} onClose={() => setTest(null)} title="Probar la regla">{test && <TestPanel id={id} test={test} setTest={setTest} />}</Modal>
    </div>
  );
}

function TgChatPicker({ botId, value, onChange }) {
  const chats = useQuery({ queryKey: ['chats', botId], enabled: !!botId, queryFn: () => api.get(`/bots/${botId}/chats`).then((r) => r.data) });
  return <Field label="Chat o grupo"><Select value={String(value || '')} onChange={(e) => onChange(Number(e.target.value))} options={[{ value: '', label: botId ? 'Elige…' : 'Elige antes un bot' }, ...(chats.data || []).map((c) => ({ value: String(c.chatId), label: c.title || c.username || String(c.chatId) }))]} /></Field>;
}
function TestPanel({ id, test, setTest }) {
  const toast = useToast(); const [q, setQ] = useState('');
  const recs = useQuery({ queryKey: ['crm-records', q, ''], queryFn: () => api.get(`/crm/records?q=${encodeURIComponent(q)}&limit=8`).then((r) => r.data) });
  const run = async (execute) => { try { const { data } = await api.post(`/crm/workflows/${id}/test`, { recordId: test.recordId, execute }); setTest({ ...test, result: data }); } catch (e) { toast(errMsg(e), 'bad'); } };
  return <>
    <Field label="Contacto de prueba"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" /></Field>
    <div className="space-y-1">{(recs.data?.items || []).map((r) => <label key={r._id} className="flex items-center gap-2 text-sm"><input type="radio" className="accent-tide" checked={test.recordId === r._id} onChange={() => setTest({ recordId: r._id })} />{r.data.name || r.data.email || r._id}</label>)}</div>
    <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={!test.recordId} onClick={() => run(false)}>Comprobar condiciones</Button><Button disabled={!test.recordId} onClick={() => { if (confirm('Se ejecutarán las acciones de verdad (emails, mensajes…). ¿Continuar?')) run(true); }}>Ejecutar ahora</Button></div>
    {test.result && <div className="rounded-lg bg-mist p-3 text-sm">
      <p className="font-semibold">{test.result.matches ? '✓ El contacto cumple las condiciones' : '✗ El contacto NO cumple las condiciones'}</p>
      <ul className="mt-1 text-xs">{test.result.conditions.map((c, i) => <li key={i}>{c.ok ? '✓' : '✗'} {c.field} {c.op} {String(c.value ?? '')}</li>)}</ul>
      {test.result.execution && <p className="mt-2 text-xs">Ejecución: {test.result.execution.results.map((a) => `${a.type} ${a.status}${a.error ? ` (${a.error})` : ''}`).join(' · ')}</p>}
    </div>}
  </>;
}
