import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Plus, Trash2, GripVertical, Play, RotateCw } from 'lucide-react';
import { api, errMsg } from '../../lib/api.js';
import { Button, Field, Input, Textarea, Select, Toggle, Badge, Section, Modal, Secret, CopyButton, Empty, fmtDate, useToast } from '../../components/ui.jsx';

const saveWeb = (bot, save, body, msg) => save(() => api.put(`/bots/${bot._id}/web`, body), msg);

/* ── Instalar: script, dominios y vista previa en vivo ── */
export function InstallTab({ bot, save }) {
  const { data, refetch } = useQuery({ queryKey: ['web-install', bot._id], queryFn: () => api.get(`/bots/${bot._id}/web/install`).then((r) => r.data) });
  const [origins, setOrigins] = useState(null); const toast = useToast();
  useEffect(() => { if (data && origins === null) setOrigins(data.allowedOrigins.join('\n')); }, [data, origins]);
  if (!data) return null;
  const preview = () => {
    document.querySelectorAll('[id^="juntial-agent-"]').forEach((n) => n.remove());
    document.querySelectorAll('script[data-agent]').forEach((n) => n.remove());
    window.__juntialAgents = {};
    const s = document.createElement('script'); s.src = `${data.scriptUrl}?v=${Date.now()}`; s.dataset.agent = data.publicKey; s.async = true; document.body.appendChild(s);
    toast('Vista previa cargada: abre el agente en la esquina de la pantalla');
  };
  return (
    <div className="space-y-5">
      {!bot.ai?.apiKeyMask && <div className="flex flex-col gap-3 rounded-xl border-2 border-signal/50 bg-signal-tint p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex gap-2 text-sm text-signal"><ShieldAlert size={18} className="shrink-0" /><span><b>Falta la API key de IA.</b> El agente no podrá responder hasta que configures Claude o GPT.</span></p>
        <a href="?tab=ai"><Button size="sm">Configurar modelo</Button></a>
      </div>}
      <Section title="Pega este código en tu web" description="Justo antes de </body>, en todas las páginas donde quieras el agente. Funciona con WordPress, Shopify, Wix, Webflow o cualquier HTML.">
        <Secret value={data.snippet} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={preview}><Play size={16} />Probar aquí</Button>
          <Button variant="secondary" onClick={async () => { if (confirm('El código actual dejará de funcionar y tendrás que pegar el nuevo en tu web. ¿Continuar?')) { await api.post(`/bots/${bot._id}/web/rotate-key`); refetch(); toast('Clave pública renovada'); } }}><RotateCw size={16} />Renovar clave</Button>
        </div>
        <p className="hint mt-3">En WordPress: Apariencia → Editor de temas → footer.php, o un plugin tipo “Insert Headers and Footers”.</p>
      </Section>
      <Section title="Dominios autorizados" description="Solo estas webs podrán usar tu agente. Así nadie puede copiar el código y gastar tu cuota desde otro sitio.">
        <Field label="Un dominio por línea" hint="Ejemplos: https://tecnolift.es · https://*.tecnolift.es (subdominios). La vista previa del panel siempre está permitida.">
          <Textarea rows={4} className="font-mono text-sm" value={origins || ''} onChange={(e) => setOrigins(e.target.value)} placeholder="https://tudominio.com" />
        </Field>
        {!data.allowedOrigins.length && <p className="mt-2 flex gap-2 rounded-lg bg-signal-tint p-3 text-sm text-signal"><ShieldAlert size={18} className="shrink-0" />Aún no has autorizado ningún dominio: el agente solo funciona en la vista previa.</p>}
        <Button className="mt-4" onClick={async () => { await saveWeb(bot, save, { allowedOrigins: origins.split('\n').map((s) => s.trim()).filter(Boolean) }, 'Dominios guardados'); refetch(); }}>Guardar dominios</Button>
      </Section>
    </div>
  );
}

/* ── Apariencia y bienvenida ── */
export function AppearanceTab({ bot, save }) {
  const w = bot.web || {}; const [a, setA] = useState({ title: bot.name, subtitle: '', avatarUrl: '', primaryColor: '#0E7C86', position: 'right', theme: 'auto', launcherLabel: '', ...w.appearance });
  const [greeting, setGreeting] = useState(w.greeting || ''); const [sugs, setSugs] = useState((w.suggestions || []).join('\n'));
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Section title="Apariencia" description="Cómo se ve el agente en tu web.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre visible"><Input value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} /></Field>
          <Field label="Subtítulo"><Input value={a.subtitle} onChange={(e) => setA({ ...a, subtitle: e.target.value })} placeholder="Normalmente responde al instante" /></Field>
          <Field label="Color principal"><div className="flex gap-2"><input type="color" value={a.primaryColor} onChange={(e) => setA({ ...a, primaryColor: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" aria-label="Color" /><Input className="font-mono" value={a.primaryColor} onChange={(e) => setA({ ...a, primaryColor: e.target.value })} /></div></Field>
          <Field label="URL del avatar (opcional)"><Input value={a.avatarUrl} onChange={(e) => setA({ ...a, avatarUrl: e.target.value })} placeholder="https://…/logo.png" /></Field>
          <Field label="Posición"><Select value={a.position} onChange={(e) => setA({ ...a, position: e.target.value })} options={[{ value: 'right', label: 'Abajo a la derecha' }, { value: 'left', label: 'Abajo a la izquierda' }]} /></Field>
          <Field label="Tema"><Select value={a.theme} onChange={(e) => setA({ ...a, theme: e.target.value })} options={[{ value: 'auto', label: 'Automático (según el visitante)' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} /></Field>
          <Field label="Texto del botón (opcional)" hint="Vacío = solo icono."><Input value={a.launcherLabel} onChange={(e) => setA({ ...a, launcherLabel: e.target.value })} placeholder="¿Hablamos?" /></Field>
        </div>
        <div className="mt-5 grid gap-4">
          <Field label="Mensaje de bienvenida"><Textarea rows={2} value={greeting} onChange={(e) => setGreeting(e.target.value)} /></Field>
          <Field label="Sugerencias iniciales" hint="Una por línea (máx. 6). Aparecen como botones al abrir el chat."><Textarea rows={3} value={sugs} onChange={(e) => setSugs(e.target.value)} placeholder={'Quiero un presupuesto\nMantenimiento de mi ascensor\nHablar con una persona'} /></Field>
        </div>
        <Button className="mt-4" onClick={() => saveWeb(bot, save, { appearance: a, greeting, suggestions: sugs.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6) })}>Guardar apariencia</Button>
      </Section>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-sm font-semibold">Vista previa</p>
        <div className="overflow-hidden rounded-2xl border border-line bg-white text-[#1d2733] shadow-lg">
          <div className="flex items-center gap-3 p-3.5 text-white" style={{ background: a.primaryColor }}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 bg-cover bg-center font-bold" style={a.avatarUrl ? { backgroundImage: `url("${a.avatarUrl}")` } : {}}>{a.avatarUrl ? '' : (a.title || 'A')[0]}</span>
            <div><b className="block text-sm">{a.title || bot.name}</b><small className="text-xs opacity-85">{a.subtitle || 'Normalmente responde al instante'}</small></div>
          </div>
          <div className="space-y-2 p-4"><div className="max-w-[85%] rounded-2xl rounded-bl bg-[#f3f5f8] px-3 py-2 text-sm">{greeting || '¡Hola! ¿En qué puedo ayudarte?'}</div>
            <div className="flex flex-wrap gap-1.5 pt-1">{sugs.split('\n').filter(Boolean).slice(0, 6).map((s) => <span key={s} className="rounded-full border-[1.5px] px-3 py-1 text-xs font-semibold" style={{ borderColor: a.primaryColor, color: a.primaryColor }}>{s}</span>)}</div></div>
        </div>
      </div>
    </div>
  );
}

/* ── Voz ── */
const OPENAI_VOICES = ['coral', 'nova', 'sage', 'shimmer', 'alloy', 'ash', 'ballad', 'echo', 'fable', 'onyx', 'verse'];
export function VoiceTab({ bot, save }) {
  const v0 = bot.web?.voice || {};
  const [v, setV] = useState({ enabled: true, mode: 'browser', voice: 'coral', elevenVoiceId: '', language: 'es-ES', silenceMs: 800, bargeIn: true, instructions: '', ...v0, key: '' });
  const needsKey = v.mode === 'elevenlabs' || (v.mode === 'openai' && bot.ai.provider !== 'openai');
  const body = { ...v }; if (!body.key) delete body.key; delete body.keyMask;
  return (
    <Section title="Conversación por voz" description="Los visitantes pueden hablar con el agente manos libres, como en una llamada: solo activan el micrófono y conversan. El cerebro sigue siendo tu modelo (Claude o GPT); aquí eliges cómo escucha y cómo habla.">
      <div className="space-y-5">
        <Toggle checked={v.enabled} onChange={(x) => setV({ ...v, enabled: x })} label="Activar modo voz" hint="Aparece el botón de onda junto al campo de texto." />
        {v.enabled && <>
          <div className="grid gap-2 md:grid-cols-3">
            {[['browser', 'Navegador', 'Gratis. Usa el reconocimiento y la voz del dispositivo. Calidad variable; mejor en Chrome, Edge y Safari.'],
              ['openai', 'OpenAI', 'Voz natural y baja latencia (gpt-4o-mini-transcribe + gpt-4o-mini-tts). Funciona aunque el agente piense con Claude.'],
              ['elevenlabs', 'ElevenLabs', 'Las voces más expresivas (Scribe + Flash v2.5). Ideal para marca propia.']].map(([id, t, d]) => (
              <label key={id} className={`cursor-pointer rounded-xl border p-3.5 ${v.mode === id ? 'border-tide bg-tide-tint' : 'border-line'}`}>
                <span className="flex items-center gap-2"><input type="radio" className="accent-tide" checked={v.mode === id} onChange={() => setV({ ...v, mode: id })} /><b className="text-sm">{t}</b>{id === 'openai' && <Badge tone="ok">Recomendado</Badge>}</span>
                <span className="mt-1 block text-xs text-ink-soft">{d}</span>
              </label>))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {needsKey && <Field label={v.mode === 'openai' ? 'API key de OpenAI (solo para la voz)' : 'API key de ElevenLabs'} hint={v0.keyMask ? `Guardada: ${v0.keyMask}. Vacío para conservarla.` : 'Se guarda cifrada.'}><Input type="password" className="font-mono" value={v.key} onChange={(e) => setV({ ...v, key: e.target.value.trim() })} /></Field>}
            {v.mode === 'openai' && <Field label="Voz"><Select value={v.voice} onChange={(e) => setV({ ...v, voice: e.target.value })} options={OPENAI_VOICES.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }))} /></Field>}
            {v.mode === 'elevenlabs' && <Field label="ID de voz de ElevenLabs" hint="En ElevenLabs → Voices → copiar Voice ID."><Input className="font-mono" value={v.elevenVoiceId} onChange={(e) => setV({ ...v, elevenVoiceId: e.target.value.trim() })} /></Field>}
            <Field label="Idioma"><Select value={v.language} onChange={(e) => setV({ ...v, language: e.target.value })} options={[['es-ES', 'Español (España)'], ['es-CO', 'Español (Colombia)'], ['es-MX', 'Español (México)'], ['en-US', 'Inglés (EE. UU.)'], ['pt-BR', 'Portugués (Brasil)'], ['fr-FR', 'Francés'], ['ca-ES', 'Catalán']].map(([value, label]) => ({ value, label }))} /></Field>
            <Field label={`Pausa para responder: ${(v.silenceMs / 1000).toFixed(1)} s`} hint="Silencio que espera antes de contestar. Más bajo = más ágil; más alto = no interrumpe a quien piensa en voz alta."><input type="range" min="400" max="2000" step="100" value={v.silenceMs} onChange={(e) => setV({ ...v, silenceMs: +e.target.value })} className="w-full accent-tide" /></Field>
          </div>
          <Toggle checked={v.bargeIn} onChange={(x) => setV({ ...v, bargeIn: x })} label="Permitir interrumpir al agente" hint="Si el visitante empieza a hablar mientras el agente habla, este se calla y escucha (como en una conversación real)." />
          {v.mode === 'openai' && <Field label="Estilo de voz (opcional)" hint="Instrucciones de entonación para la voz."><Input value={v.instructions} onChange={(e) => setV({ ...v, instructions: e.target.value })} placeholder="Tono cálido y profesional, ritmo tranquilo" /></Field>}
        </>}
        <Button onClick={() => saveWeb(bot, save, { voice: body }, 'Voz guardada')}>Guardar voz</Button>
      </div>
    </Section>
  );
}

/* ── Captación y derivación ── */
const DEFAULT_FIELDS = [{ key: 'name', label: 'Nombre', type: 'text', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'phone', label: 'Teléfono', type: 'tel', required: false }];
export function CaptureTab({ bot, save }) {
  const w = bot.web || {}; const [crmOn, setCrmOn] = useState(bot.crm?.enabled !== false); const bots = useQuery({ queryKey: ['bots'], queryFn: () => api.get('/bots').then((r) => r.data) });
  const [lf, setLf] = useState({ enabled: false, preChat: false, title: 'Déjanos tus datos', ...w.leadForm, fields: w.leadForm?.fields?.length ? w.leadForm.fields : DEFAULT_FIELDS });
  const [ho, setHo] = useState({ enabled: true, message: '', ...w.handoff, telegram: { botId: w.handoff?.telegram?.botId || '', chatId: w.handoff?.telegram?.chatId || '' } });
  const chats = useQuery({ queryKey: ['chats', ho.telegram.botId], enabled: !!ho.telegram.botId, queryFn: () => api.get(`/bots/${ho.telegram.botId}/chats`).then((r) => r.data) });
  const setField = (i, k, val) => setLf({ ...lf, fields: lf.fields.map((f, j) => (j === i ? { ...f, [k]: val } : f)) });
  return (
    <div className="space-y-5">
      <Section title="Captación de contactos" description="El agente siempre puede guardar los datos que el visitante le dé hablando. Además, puedes mostrar un formulario.">
        <div className="space-y-4">
          <Toggle checked={crmOn} onChange={async (v) => { setCrmOn(v); await save(() => api.put(`/bots/${bot._id}`, { crm: { enabled: v } }), v ? 'El agente rellenará la ficha CRM' : 'Ficha CRM desactivada'); }} label="Rellenar la ficha CRM del visitante" hint="Guarda en Contactos los datos que da en la conversación (incluidos tus campos personalizados) y dispara tus reglas de flujo." />
          <Toggle checked={lf.enabled} onChange={(x) => setLf({ ...lf, enabled: x })} label="Formulario de contacto" hint="El agente lo muestra cuando necesita los datos del visitante." />
          {lf.enabled && <>
            <Toggle checked={lf.preChat} onChange={(x) => setLf({ ...lf, preChat: x })} label="Pedirlo antes de empezar a chatear" hint="Útil para soporte a clientes. Para ventas suele convertir mejor pedirlo durante la conversación." />
            <Field label="Título del formulario"><Input value={lf.title} onChange={(e) => setLf({ ...lf, title: e.target.value })} /></Field>
            <div className="space-y-2">{lf.fields.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[auto_1fr_1fr_140px_auto_auto] sm:items-center">
                <GripVertical size={16} className="hidden text-ink-soft sm:block" />
                <Input value={f.label} onChange={(e) => setField(i, 'label', e.target.value)} placeholder="Etiqueta" />
                <Input className="font-mono" value={f.key} onChange={(e) => setField(i, 'key', e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))} placeholder="clave" />
                <Select value={f.type} onChange={(e) => setField(i, 'type', e.target.value)} options={[{ value: 'text', label: 'Texto' }, { value: 'email', label: 'Email' }, { value: 'tel', label: 'Teléfono' }, { value: 'textarea', label: 'Texto largo' }]} />
                <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" className="accent-tide" checked={f.required} onChange={(e) => setField(i, 'required', e.target.checked)} />Obligatorio</label>
                <button className="grid h-10 w-10 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare" aria-label="Quitar campo" onClick={() => setLf({ ...lf, fields: lf.fields.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
              </div>))}
              {lf.fields.length < 8 && <Button size="sm" variant="secondary" onClick={() => setLf({ ...lf, fields: [...lf.fields, { key: `campo_${lf.fields.length + 1}`, label: 'Nuevo campo', type: 'text', required: false }] })}><Plus size={14} />Añadir campo</Button>}
            </div>
          </>}
          <Button onClick={() => saveWeb(bot, save, { leadForm: lf }, 'Captación guardada')}>Guardar captación</Button>
        </div>
      </Section>
      <Section title="Derivar a una persona" description="Cuando el visitante lo pide, está molesto o la consulta supera al agente, este registra el caso, te avisa y te pasa un resumen.">
        <div className="space-y-4">
          <Toggle checked={ho.enabled} onChange={(x) => setHo({ ...ho, enabled: x })} label="Permitir derivar a humano" />
          {ho.enabled && <>
            <Field label="Mensaje al visitante"><Input value={ho.message} onChange={(e) => setHo({ ...ho, message: e.target.value })} placeholder="Te pongo en contacto con una persona del equipo…" /></Field>
            <p className="text-sm text-ink-soft">Siempre recibirás un aviso en la plataforma y por email. Opcionalmente, también un mensaje en un grupo de Telegram:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bot de Telegram"><Select value={ho.telegram.botId} onChange={(e) => setHo({ ...ho, telegram: { botId: e.target.value, chatId: '' } })} options={[{ value: '', label: 'No avisar por Telegram' }, ...(bots.data || []).filter((b) => b.kind !== 'web' && b.telegram?.connected).map((b) => ({ value: b._id, label: `${b.name} (@${b.telegram.username})` }))]} /></Field>
              {ho.telegram.botId && <Field label="Chat o grupo"><Select value={String(ho.telegram.chatId)} onChange={(e) => setHo({ ...ho, telegram: { ...ho.telegram, chatId: Number(e.target.value) } })} options={[{ value: '', label: 'Elige…' }, ...(chats.data || []).map((c) => ({ value: String(c.chatId), label: c.title || c.username || String(c.chatId) }))]} /></Field>}
            </div>
          </>}
          <Button onClick={() => saveWeb(bot, save, { handoff: { enabled: ho.enabled, message: ho.message, telegram: { botId: ho.telegram.botId || null, chatId: ho.telegram.chatId || null } } }, 'Derivación guardada')}>Guardar derivación</Button>
        </div>
      </Section>
    </div>
  );
}

/* ── Seguridad del canal público ── */
export function SecurityTab({ bot, save }) {
  const [g, setG] = useState({ allowedTopics: '', blockedTopics: '', maxChars: 2000, visitorPerMinute: 8, ...bot.web?.guardrails });
  return (
    <Section title="Límites y seguridad" description="Tu agente es público: cualquiera puede escribirle. Estos límites protegen tu cuota, tu marca y tus datos.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Temas permitidos" hint="Si lo rellenas, el agente reconduce cualquier otra conversación."><Textarea rows={3} value={g.allowedTopics} onChange={(e) => setG({ ...g, allowedTopics: e.target.value })} placeholder="Ascensores, montacargas, mantenimiento, presupuestos, horarios" /></Field>
        <Field label="Temas prohibidos"><Textarea rows={3} value={g.blockedTopics} onChange={(e) => setG({ ...g, blockedTopics: e.target.value })} placeholder="Política, precios de la competencia, asesoría legal" /></Field>
        <Field label="Longitud máxima de cada mensaje (caracteres)"><Input type="number" value={g.maxChars} onChange={(e) => setG({ ...g, maxChars: +e.target.value })} /></Field>
        <Field label="Mensajes por minuto por visitante"><Input type="number" value={g.visitorPerMinute} onChange={(e) => setG({ ...g, visitorPerMinute: +e.target.value })} /></Field>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        <li>Siempre activo: el agente no revela sus instrucciones ni claves, y trata a los visitantes como no confiables (protección frente a inyección de instrucciones).</li>
        <li>Siempre activo: solo responde en los dominios autorizados, con límites por visitante, por IP y por agente.</li>
      </ul>
      <Button className="mt-4" onClick={() => saveWeb(bot, save, { guardrails: g }, 'Seguridad guardada')}>Guardar seguridad</Button>
    </Section>
  );
}

/* ── Aviso obligatorio antes de conectar MCP a un agente público ── */
export function McpPublicWarning({ bot, onAck }) {
  const [ok, setOk] = useState(false); const toast = useToast();
  if (bot.web?.mcpAck?.at) return <p className="mb-4 flex gap-2 rounded-lg bg-signal-tint p-3 text-sm text-signal"><ShieldAlert size={18} className="shrink-0" />Agente público: usa solo conectores con permisos mínimos y limita sus herramientas en <i>Conectores → Herramientas permitidas</i>. Aviso aceptado el {fmtDate(bot.web.mcpAck.at)}.</p>;
  return (
    <div className="mb-5 rounded-xl border-2 border-flare/40 bg-flare-tint p-4 text-sm">
      <p className="flex items-center gap-2 font-bold text-flare"><ShieldAlert size={20} />Importante: este agente es PÚBLICO</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink">
        <li>Cualquier visitante anónimo puede hablar con él e intentar <b>manipularlo</b> para que use sus herramientas (inyección de instrucciones).</li>
        <li><b>No conectes MCP que den acceso a información sensible</b>: datos de clientes, facturación, contabilidad, RR. HH. o cualquier dato personal.</li>
        <li>Usa conectores con <b>credenciales propias de solo lectura</b> y con el mínimo de datos (catálogo, horarios, estado de pedidos por código).</li>
        <li>Limita las herramientas en <i>Conectores → Herramientas permitidas</i> y evita las que crean, modifican o borran datos.</li>
      </ul>
      <label className="mt-3 flex items-start gap-2"><input type="checkbox" className="mt-1 accent-tide" checked={ok} onChange={(e) => setOk(e.target.checked)} />Entiendo los riesgos y conectaré solo conectores seguros para uso público.</label>
      <Button className="mt-3" disabled={!ok} onClick={async () => { try { await api.post(`/bots/${bot._id}/web/mcp-ack`); toast('Aviso aceptado'); onAck(); } catch (e) { toast(errMsg(e), 'bad'); } }}>Continuar</Button>
    </div>
  );
}

/* ── Conversaciones con visitantes ── */
export function ConversationsTab({ bot }) {
  const [filter, setFilter] = useState(''); const [open, setOpen] = useState(null);
  const { data = [] } = useQuery({ queryKey: ['web-convs', bot._id, filter], queryFn: () => api.get(`/bots/${bot._id}/web/conversations?filter=${filter}`).then((r) => r.data), refetchInterval: 15000 });
  const detail = useQuery({ queryKey: ['web-conv', open], enabled: !!open, queryFn: () => api.get(`/bots/${bot._id}/web/conversations/${open}`).then((r) => r.data) });
  return (
    <Section title="Conversaciones" description="Lo que hablan los visitantes con tu agente, con sus datos de contacto y las derivaciones."
      actions={<Select value={filter} onChange={(e) => setFilter(e.target.value)} options={[{ value: '', label: 'Todas' }, { value: 'leads', label: 'Con datos de contacto' }, { value: 'handoff', label: 'Pidieron una persona' }]} />}>
      {!data.length ? <Empty title="Aún no hay conversaciones">Instala el código en tu web o usa “Probar aquí” en la pestaña Instalar.</Empty> : (
        <ul className="divide-y divide-line">{data.map((c) => (
          <li key={c._id}><button onClick={() => setOpen(c._id)} className="flex w-full flex-col gap-1 py-3 text-left sm:flex-row sm:items-center sm:gap-4">
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><b className="text-sm">{c.lead?.name || c.lead?.email || 'Visitante anónimo'}</b>{(c.lead?.email || c.lead?.phone) && <Badge tone="ok">Contacto</Badge>}{c.handoff?.requested && <Badge tone="warn">Pide persona</Badge>}</span>
              <span className="block truncate text-sm text-ink-soft">{c.preview || '—'}</span></span>
            <span className="text-xs text-ink-soft">{c.messageCount} mensajes · {fmtDate(c.lastMessageAt)}</span>
          </button></li>))}</ul>)}
      <Modal open={!!open} onClose={() => setOpen(null)} title="Conversación">
        {detail.data && <>
          {(detail.data.lead?.email || detail.data.lead?.phone || detail.data.lead?.name) && <div className="rounded-lg bg-tide-tint p-3 text-sm"><b>Contacto:</b> {[detail.data.lead.name, detail.data.lead.email, detail.data.lead.phone, detail.data.lead.company].filter(Boolean).join(' · ')}{detail.data.lead.notes && <span className="block text-ink-soft">{detail.data.lead.notes}</span>}</div>}
          {detail.data.handoff?.requested && <div className="rounded-lg bg-signal-tint p-3 text-sm"><b>Pidió una persona:</b> {detail.data.handoff.reason}{detail.data.handoff.summary && <span className="block">{detail.data.handoff.summary}</span>}</div>}
          <p className="text-xs text-ink-soft">{detail.data.meta?.url}</p>
          <div className="space-y-2">{detail.data.messages.map((m, i) => <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'assistant' ? 'bg-mist' : 'ml-auto bg-tide text-white'}`}>{m.voice && '🎤 '}{m.images ? `📷×${m.images} ` : ''}{m.text}</div>)}</div>
        </>}
      </Modal>
    </Section>
  );
}

/* ── Playbooks (para agentes web y bots de Telegram) ── */
const PB_EXAMPLE = { name: 'Solicitud de presupuesto', when: 'El visitante quiere precio o presupuesto de un ascensor o montacargas', steps: '1. Pregunta el tipo de instalación (vivienda, comunidad, local, industrial).\n2. Pregunta el número de plantas y si hay hueco de ascensor.\n3. Pregunta la ciudad.\n4. Pide nombre, teléfono y email y guárdalos con capture_lead.\n5. Confirma que un técnico le llamará en 24 h laborables.', enabled: true };
export function PlaybooksTab({ bot, save }) {
  const [list, setList] = useState(bot.playbooks?.length ? bot.playbooks.map(({ _id, ...p }) => p) : []);
  const upd = (i, k, v) => setList(list.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <Section title="Procedimientos (playbooks)" description="Define pasos concretos para situaciones concretas. El agente decide cuándo aplicar cada uno y los sigue en orden, pero sin sonar a robot: responde dudas y vuelve al procedimiento. Es el enfoque que hoy recomiendan las plataformas líderes, más flexible que un diagrama de flujo."
      actions={<Button variant="secondary" onClick={() => setList([...list, list.length ? { name: '', when: '', steps: '', enabled: true } : PB_EXAMPLE])}><Plus size={16} />Añadir procedimiento</Button>}>
      {!list.length ? <Empty title="Sin procedimientos" action={<Button onClick={() => setList([PB_EXAMPLE])}>Usar un ejemplo</Button>}>Ejemplos: pedir presupuesto, reservar una visita técnica, avisar de una avería urgente.</Empty> : (
        <div className="space-y-4">{list.map((p, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><Badge tone={p.enabled ? 'ok' : 'neutral'}>{i + 1}</Badge>
              <div className="flex items-center gap-3"><Toggle checked={p.enabled} onChange={(x) => upd(i, 'enabled', x)} label="Activo" /><button aria-label="Eliminar procedimiento" onClick={() => setList(list.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-lg text-ink-soft hover:bg-flare-tint hover:text-flare"><Trash2 size={16} /></button></div></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Nombre"><Input value={p.name} onChange={(e) => upd(i, 'name', e.target.value)} /></Field>
              <Field label="Cuándo aplicarlo"><Input value={p.when} onChange={(e) => upd(i, 'when', e.target.value)} placeholder="El visitante quiere…" /></Field>
            </div>
            <Field label="Pasos" hint="Uno por línea. Puedes indicar acciones: show_options (botones), capture_lead (guardar datos), request_contact_form (formulario), handoff_human (pasar a una persona)."><Textarea rows={5} className="font-mono text-[13px]" value={p.steps} onChange={(e) => upd(i, 'steps', e.target.value)} /></Field>
          </div>))}</div>)}
      {list.length > 0 && <Button className="mt-4" onClick={() => save(() => api.put(`/bots/${bot._id}/playbooks`, { playbooks: list.filter((p) => p.name && p.steps) }), 'Procedimientos guardados')}>Guardar procedimientos</Button>}
    </Section>
  );
}
