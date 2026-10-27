import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Link2, Copy, Unlink, MessageCircle, Globe, Webhook, Zap } from 'lucide-react';
import { api, API_URL, errMsg } from '../../lib/api.js';
import { Button, Field, Input, Select, Toggle, Badge, Section, Empty, fmtDate, useToast } from '../../components/ui.jsx';

const W = (bot) => `/bots/${bot._id}/worker`;
const REL = [['responsable', 'Responsable'], ['compañero', 'Compañero'], ['colaborador', 'Colaborador'], ['externo', 'Externo']];
const blank = () => ({ name: '', role: '', relation: 'compañero', email: '', telegramUsername: '', canApprove: false, notes: '' });

/** Equipo del empleado digital, canales para hablar con él y cómo trabaja. */
export function WorkerTeamTab({ bot, refetch }) {
  const toast = useToast();
  const q = useQuery({ queryKey: ['wk-people', bot._id], queryFn: () => api.get(`${W(bot)}/people`).then((r) => r.data) });
  const [people, setPeople] = useState(null); const [saving, setSaving] = useState(false); const [links, setLinks] = useState({});
  const w = bot.worker || {};
  const [cfg, setCfg] = useState({ approvalRule: { mode: w.approvalRule?.mode || 'any', quorum: w.approvalRule?.quorum || 2, onlyApprovers: w.approvalRule?.onlyApprovers !== false }, proactive: { enabled: !!w.proactive?.enabled, everyHours: w.proactive?.everyHours || 3 }, channels: { telegramChat: !!w.channels?.telegramChat, pages: w.channels?.pages !== false, api: w.channels?.api !== false }, style: w.style || 'corto' });
  useEffect(() => { if (q.data && !people) setPeople(q.data.map((p) => ({ ...blank(), ...p, email: p.email || '', telegramUsername: p.telegramUsername || '' }))); }, [q.data]); // eslint-disable-line
  const set = (i, patch) => setPeople(people.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function savePeople() {
    setSaving(true);
    try {
      const body = { people: people.filter((p) => p.name.trim()).map(({ hasLink, linkLastUsedAt, ...p }) => ({ ...p, telegramChatId: p.telegramChatId || null })) };
      const { data } = await api.put(`${W(bot)}/people`, body); setPeople(data.map((p) => ({ ...blank(), ...p, email: p.email || '', telegramUsername: p.telegramUsername || '' }))); q.refetch();
      toast('Equipo guardado');
    } catch (e) { toast(errMsg(e), 'bad'); } finally { setSaving(false); }
  }
  async function saveCfg() { try { await api.put(W(bot), cfg); toast('Guardado'); refetch?.(); } catch (e) { toast(errMsg(e), 'bad'); } }
  async function makeLink(p) {
    if (!p._id) return toast('Guarda el equipo primero', 'bad');
    try { const { data } = await api.post(`${W(bot)}/people/${p._id}/link`); setLinks({ ...links, [p._id]: data.url }); await navigator.clipboard?.writeText(data.url).catch(() => {}); toast('Enlace creado y copiado'); q.refetch(); }
    catch (e) { toast(errMsg(e), 'bad'); }
  }
  async function revoke(p) { await api.delete(`${W(bot)}/people/${p._id}/link`); const l = { ...links }; delete l[p._id]; setLinks(l); toast('Enlace revocado'); q.refetch(); }
  if (!people) return <p className="text-ink-soft">Cargando…</p>;
  const tg = !!w.reporting?.telegramBotId;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Section title="Equipo" description="Compañeros y colaboradores. Así sabe quién le habla por cada canal, a quién avisar de cada cosa y quién puede aprobar sus cambios.">
        {!people.length && <Empty title="Sin equipo todavía">Añade a las personas con las que trabaja: su responsable, los técnicos, administración…</Empty>}
        <div className="space-y-3">{people.map((p, i) => (
          <div key={p._id || i} className="rounded-xl border border-line p-3">
            <div className="grid gap-2 sm:grid-cols-[1.3fr_1fr_150px_auto]">
              <Input placeholder="Nombre" value={p.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="Nombre" />
              <Input placeholder="Puesto (p. ej. Jefe de montaje)" value={p.role} onChange={(e) => set(i, { role: e.target.value })} aria-label="Puesto" />
              <Select value={p.relation} onChange={(e) => set(i, { relation: e.target.value })} options={REL.map(([v, l]) => ({ value: v, label: l }))} aria-label="Relación" />
              <button aria-label="Quitar" onClick={() => setPeople(people.filter((_, j) => j !== i))} className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input type="email" placeholder="Email" value={p.email} onChange={(e) => set(i, { email: e.target.value })} aria-label="Email" />
              <Input placeholder="Usuario de Telegram (@usuario)" value={p.telegramUsername} onChange={(e) => set(i, { telegramUsername: e.target.value })} aria-label="Usuario de Telegram" />
            </div>
            <Input className="mt-2" placeholder="Notas para el empleado (p. ej. «lleva las obras de Alicante; prefiere que le escribas por la mañana»)" value={p.notes} onChange={(e) => set(i, { notes: e.target.value })} aria-label="Notas" />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <Toggle checked={p.canApprove} onChange={(v) => set(i, { canApprove: v })} label="Puede aprobar sus cambios" />
              {p.telegramChatId ? <Badge tone="ok">Telegram conectado</Badge> : p.telegramUsername ? <Badge>Pendiente de que escriba al bot</Badge> : null}
              {p._id && <span className="ml-auto flex items-center gap-2">
                {links[p._id] ? <><code className="max-w-[220px] truncate rounded bg-mist px-2 py-1 text-xs">{links[p._id]}</code><button className="text-tide" aria-label="Copiar enlace" onClick={() => navigator.clipboard.writeText(links[p._id]).then(() => toast('Copiado'))}><Copy size={15} /></button></>
                  : <Button size="sm" variant="secondary" onClick={() => makeLink(p)}><Link2 size={14} />{p.hasLink ? 'Nuevo enlace de chat' : 'Enlace de chat'}</Button>}
                {(p.hasLink || links[p._id]) && <button className="text-ink-soft hover:text-flare" aria-label="Revocar enlace" title={p.linkLastUsedAt ? `Usado ${fmtDate(p.linkLastUsedAt)}` : 'Sin usar'} onClick={() => revoke(p)}><Unlink size={15} /></button>}
              </span>}
            </div>
          </div>))}</div>
        <div className="mt-3 flex flex-wrap justify-between gap-2"><Button size="sm" variant="secondary" onClick={() => setPeople([...people, blank()])}><Plus size={14} />Añadir persona</Button><Button onClick={savePeople} loading={saving}>Guardar equipo</Button></div>
      </Section>

      <div className="space-y-4">
        <ApprovalRule people={people} cfg={cfg} setCfg={setCfg} hasTelegram={tg} onSave={saveCfg} />
        <Section title={<span className="flex items-center gap-2"><Zap size={16} className="text-tide" />Cómo trabaja</span>}>
          <Toggle checked={cfg.proactive.enabled} onChange={(v) => setCfg({ ...cfg, proactive: { ...cfg.proactive, enabled: v } })} label="Proactivo: revisa por su cuenta" />
          <p className="mt-1 text-xs text-ink-soft">En horario laboral repasa sus pendientes, recuerda las aprobaciones atascadas y se adelanta a lo urgente. Solo te escribe si hay algo que hacer.</p>
          {cfg.proactive.enabled && <Field label="Cada cuántas horas"><Select value={String(cfg.proactive.everyHours)} onChange={(e) => setCfg({ ...cfg, proactive: { ...cfg.proactive, everyHours: Number(e.target.value) } })} options={[1, 2, 3, 4, 6, 8].map((h) => ({ value: String(h), label: `Cada ${h} h` }))} /></Field>}
          <Field label="Sus mensajes"><Select value={cfg.style} onChange={(e) => setCfg({ ...cfg, style: e.target.value })} options={[{ value: 'corto', label: 'Cortos y directos (recomendado)' }, { value: 'detallado', label: 'Algo más detallados' }]} /></Field>
          <p className="text-xs text-ink-soft">El desglose completo siempre queda en el panel (pestaña Trabajo → «Ver detalle»).</p>
        </Section>

        <Section title="Canales para hablar con él" description="Además del chat del panel.">
          <div className="space-y-3 text-sm">
            <div><Toggle checked={cfg.channels.telegramChat} onChange={(v) => setCfg({ ...cfg, channels: { ...cfg.channels, telegramChat: v } })} label={<span className="flex items-center gap-1.5"><MessageCircle size={14} />Conversar por Telegram</span>} />
              <p className="mt-1 text-xs text-ink-soft">{tg ? 'Usa el bot de informes: si le escribe alguien del equipo (o el chat de informes), le responde el empleado.' : 'Primero elige un bot de Telegram en Puesto → Canales.'}</p></div>
            <div><Toggle checked={cfg.channels.pages} onChange={(v) => setCfg({ ...cfg, channels: { ...cfg.channels, pages: v } })} label={<span className="flex items-center gap-1.5"><Globe size={14} />Página de chat personal</span>} />
              <p className="mt-1 text-xs text-ink-soft">Cada persona con su enlace (botón «Enlace de chat»), sin iniciar sesión.</p></div>
            <div><Toggle checked={cfg.channels.api} onChange={(v) => setCfg({ ...cfg, channels: { ...cfg.channels, api: v } })} label={<span className="flex items-center gap-1.5"><Webhook size={14} />API / webhook</span>} />
              <p className="mt-1 text-xs text-ink-soft">Para Make, n8n, tu ERP… Responde en la misma llamada.</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-mist p-2 font-mono text-[11px]">{`POST ${API_URL}/v1/bots/${bot._id}/worker/message
Authorization: Bearer ja_live_…
{ "text": "¿Cómo va Colombia 15?",
  "from": { "email": "antonio@empresa.com" } }`}</pre></div>
          </div>
          <div className="mt-3 flex justify-end"><Button onClick={saveCfg}>Guardar</Button></div>
        </Section>
      </div>
    </div>
  );
}

/** Quién aprueba los cambios del empleado y con qué regla. */
function ApprovalRule({ people, cfg, setCfg, hasTelegram, onSave }) {
  const ap = people.filter((p) => p.canApprove && p.name.trim()); const r = cfg.approvalRule;
  const need = !ap.length ? 1 : r.mode === 'all' ? ap.length : r.mode === 'quorum' ? Math.max(1, Math.min(r.quorum || 2, ap.length)) : 1;
  const channelOf = (p) => (hasTelegram && p.telegramChatId ? ['Telegram privado', 'ok'] : p.email ? ['Email con enlace personal', 'ok'] : p.telegramUsername ? ['Sin canal: tiene que escribir al bot una vez o poner email', 'bad'] : ['Sin canal: añade Telegram o email', 'bad']);
  const set = (patch) => setCfg({ ...cfg, approvalRule: { ...r, ...patch } });
  return (
    <Section title="Quién aprueba" description="Las personas del equipo con «Puede aprobar sus cambios». Cada una recibe la solicitud a su nombre y su voto queda registrado.">
      {!ap.length ? <p className="text-sm text-signal">Nadie del equipo puede aprobar todavía: decide cualquiera del chat de informes o del panel. Marca «Puede aprobar» en las personas que quieras.</p> : <>
        <ul className="mb-3 space-y-1.5">{ap.map((p) => { const [c, tone] = channelOf(p); return <li key={p._id || p.name} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{p.name}</span><Badge tone={tone}>{c}</Badge></li>; })}</ul>
        <Field label="Regla"><Select value={r.mode} onChange={(e) => set({ mode: e.target.value })} options={[{ value: 'any', label: 'Basta con que apruebe uno' }, { value: 'all', label: 'Tienen que aprobar todos' }, { value: 'quorum', label: 'Un mínimo de aprobaciones' }]} /></Field>
        {r.mode === 'quorum' && <Field label="Aprobaciones necesarias"><Input type="number" min="1" max={ap.length} value={r.quorum} onChange={(e) => set({ quorum: Number(e.target.value) || 1 })} /></Field>}
        <p className="mb-2 text-sm font-semibold">Hace falta {need} de {ap.length}. Un solo rechazo lo para.</p>
        <Toggle checked={r.onlyApprovers} onChange={(v) => set({ onlyApprovers: v })} label="Solo ellos pueden decidir" />
        <p className="mt-1 text-xs text-ink-soft">Si alguien más pulsa los botones en el chat de informes, o abre un email reenviado, no cuenta. Los administradores de la organización pueden decidir siempre desde el panel.</p></>}
      <p className="mt-2 text-xs text-ink-soft">Guarda el equipo antes si acabas de cambiar quién puede aprobar.</p>
      <div className="mt-3 flex justify-end"><Button onClick={onSave}>Guardar regla</Button></div>
    </Section>
  );
}
