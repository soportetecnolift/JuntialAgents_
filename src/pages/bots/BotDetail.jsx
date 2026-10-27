import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../../lib/api.js';
import { Button, Field, Input, Textarea, Select, Toggle, Badge, Section, Tabs, Table, Modal, Secret, fmtDate, useToast, PageHeader, Empty } from '../../components/ui.jsx';
import { InstallTab, AppearanceTab, VoiceTab, CaptureTab, SecurityTab, ConversationsTab, PlaybooksTab, McpPublicWarning } from './WebTabs.jsx';
import LogViewer from '../../components/LogViewer.jsx';
import { WorkerWorkTab, WorkerDocsTab, WorkerChatTab, WorkerJobTab, WorkerTrainingTab, WorkerRoutinesTab, WorkerAutonomyTab, WorkerApprovalsTab, WorkerActivityTab } from './WorkerTabs.jsx';
import { WorkerBlueprintTab } from './WorkerBlueprint.jsx';
import { WorkerTeamTab } from './WorkerTeam.jsx';

const TABS = [
  { id: 'telegram', label: 'Telegram' }, { id: 'ai', label: 'Modelo de IA' }, { id: 'prompt', label: 'Instrucciones' }, { id: 'playbooks', label: 'Procedimientos' }, { id: 'behavior', label: 'Comportamiento' },
  { id: 'mcp', label: 'Conectores' }, { id: 'tasks', label: 'Tareas programadas' }, { id: 'webhooks', label: 'Webhooks' }, { id: 'chats', label: 'Chats' }, { id: 'logs', label: 'Registro' },
];
const WORKER_TABS = [
  { id: 'work', label: 'Trabajo' }, { id: 'chat', label: 'Chat' }, { id: 'job', label: 'Puesto' }, { id: 'team', label: 'Equipo' }, { id: 'blueprint', label: 'Guion' }, { id: 'training', label: 'Entrenamiento' }, { id: 'documents', label: 'Documentos' }, { id: 'routines', label: 'Rutinas' },
  { id: 'autonomy', label: 'Autonomía' }, { id: 'approvals', label: 'Aprobaciones' }, { id: 'activity', label: 'Actividad' }, { id: 'mcp', label: 'Conectores' }, { id: 'ai', label: 'Modelo de IA' }, { id: 'logs', label: 'Registro' },
];
const WEB_TABS = [
  { id: 'install', label: 'Instalar' }, { id: 'ai', label: 'Modelo de IA' }, { id: 'prompt', label: 'Instrucciones' }, { id: 'playbooks', label: 'Procedimientos' },
  { id: 'appearance', label: 'Apariencia' }, { id: 'voice', label: 'Voz' }, { id: 'capture', label: 'Captación' }, { id: 'security', label: 'Seguridad' },
  { id: 'mcp', label: 'Conectores' }, { id: 'webhooks', label: 'Webhooks' }, { id: 'conversations', label: 'Conversaciones' }, { id: 'logs', label: 'Registro' },
];
const useSave = (id, refetch) => { const toast = useToast(); return async (fn, okMsg = 'Cambios guardados') => { try { const r = await fn(); toast(okMsg); refetch(); return r; } catch (e) { toast(errMsg(e), 'bad'); throw e; } }; };

export default function BotDetail() {
  const { id } = useParams(); const [sp, setSp] = useSearchParams();
  const { data: bot, refetch } = useQuery({ queryKey: ['bot', id], queryFn: () => api.get(`/bots/${id}`).then((r) => r.data) });
  const save = useSave(id, refetch); const nav = useNavigate();
  if (!bot) return <p className="text-ink-soft">Cargando…</p>;
  const isWeb = bot.kind === 'web'; const isWorker = bot.kind === 'worker'; const tab = sp.get('tab') || (isWorker ? 'work' : isWeb ? 'install' : 'telegram');
  const P = { bot, save, refetch };
  return (
    <>
      <PageHeader title={bot.name} subtitle={isWorker ? `🧠 Empleado digital · ${bot.worker?.title || ''}` : isWeb ? 'Agente web incrustado' : bot.telegram?.username ? `@${bot.telegram.username}` : 'Telegram sin conectar'} actions={
        <div className="flex flex-wrap items-center gap-2 [&>button]:flex-1 md:[&>button]:flex-none">
          <Badge tone={bot.status === 'active' ? 'ok' : bot.status === 'error' ? 'bad' : 'neutral'}>{{ active: 'Activo', paused: 'En pausa', error: 'Con error' }[bot.status]}</Badge>
          {bot.status === 'active' ? <Button variant="secondary" onClick={() => save(() => api.put(`/bots/${id}/status`, { status: 'paused' }), 'Bot en pausa')}>Pausar</Button>
            : <Button onClick={() => save(() => api.put(`/bots/${id}/status`, { status: 'active' }), 'Bot activado')}>Activar</Button>}
          <Button variant="danger" onClick={async () => { if (confirm('¿Eliminar el bot, su historial y sus tareas? No se puede deshacer.')) { await save(() => api.delete(`/bots/${id}`), 'Bot eliminado'); nav('/bots'); } }}>Eliminar</Button>
        </div>} />
      <Tabs tabs={isWorker ? WORKER_TABS : isWeb ? WEB_TABS : TABS} value={tab} onChange={(t) => setSp({ tab: t })} />
      {tab === 'work' && <WorkerWorkTab {...P} />}{tab === 'chat' && <WorkerChatTab {...P} />}{tab === 'job' && <WorkerJobTab {...P} />}{tab === 'team' && <WorkerTeamTab {...P} />}{tab === 'blueprint' && <WorkerBlueprintTab {...P} />}{tab === 'training' && <WorkerTrainingTab {...P} />}
      {tab === 'documents' && <WorkerDocsTab {...P} />}{tab === 'routines' && <WorkerRoutinesTab {...P} />}{tab === 'autonomy' && <WorkerAutonomyTab {...P} />}{tab === 'approvals' && <WorkerApprovalsTab {...P} />}{tab === 'activity' && <WorkerActivityTab {...P} />}
      {tab === 'install' && <InstallTab {...P} />}{tab === 'appearance' && <AppearanceTab {...P} />}{tab === 'voice' && <VoiceTab {...P} />}
      {tab === 'capture' && <CaptureTab {...P} />}{tab === 'security' && <SecurityTab {...P} />}{tab === 'conversations' && <ConversationsTab {...P} />}
      {tab === 'playbooks' && <PlaybooksTab {...P} />}
      {tab === 'telegram' && <TelegramTab {...P} />}{tab === 'ai' && <AiTab {...P} />}{tab === 'prompt' && <PromptTab {...P} />}
      {tab === 'behavior' && <BehaviorTab {...P} />}{tab === 'mcp' && <McpTab {...P} />}{tab === 'tasks' && <TasksTab {...P} />}
      {tab === 'webhooks' && <WebhooksTab {...P} />}{tab === 'chats' && <ChatsTab {...P} />}{tab === 'logs' && <LogsTab {...P} />}
    </>
  );
}

function TelegramTab({ bot, save }) {
  const [token, setToken] = useState(''); const [hint, setHint] = useState(null); const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_320px]">
      <Section title="Conectar con Telegram" description="Pega el token que te da @BotFather al crear el bot. Lo guardamos cifrado y configuramos el webhook automáticamente.">
        {bot.telegram?.connected && <p className="mb-4 rounded-md bg-tide-tint px-3 py-2 text-sm text-tide-dark">Conectado como <b>@{bot.telegram.username}</b> · token {bot.telegram.tokenMask}</p>}
        {bot.telegram?.lastError && <p className="mb-4 rounded-md bg-flare-tint px-3 py-2 text-sm text-flare">{bot.telegram.lastError}. Pega un token nuevo.</p>}
        <Field label={bot.telegram?.connected ? 'Reemplazar token' : 'Token del bot'}><Input className="font-mono" value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="123456789:AAH…" /></Field>
        <div className="mt-4 flex gap-2">
          <Button loading={busy} disabled={!token} onClick={async () => { setBusy(true); try { const r = await save(() => api.put(`/bots/${bot._id}/telegram`, { token }), 'Telegram conectado'); setHint(r.data.hint); setToken(''); } finally { setBusy(false); } }}>Conectar</Button>
          {bot.telegram?.connected && <Button variant="secondary" onClick={() => save(() => api.delete(`/bots/${bot._id}/telegram`), 'Desconectado')}>Desconectar</Button>}
        </div>
        {hint && <p className="mt-4 rounded-md bg-signal-tint px-3 py-2 text-sm text-signal">{hint}</p>}
      </Section>
      <Section title="Cómo obtener el token">
        <ol className="list-decimal space-y-1.5 pl-4 text-sm text-ink-soft">
          <li>Abre <b>@BotFather</b> en Telegram.</li><li>Envía <code>/newbot</code> y elige nombre y usuario.</li><li>Copia el token y pégalo aquí.</li>
          <li>Para que entienda el contexto de grupos: <code>/setprivacy</code> → Disable.</li>
        </ol>
      </Section>
    </div>
  );
}

const LINE_LABEL = { fable: 'Fable', opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku', mythos: 'Mythos' };
const SPEED = { fable: 'Más lento', opus: 'Moderado', sonnet: 'Rápido', haiku: 'El más rápido' };

/** Selector de modelos en vivo: consulta al proveedor con la clave del bot (o una nueva) y muestra solo lo disponible. */
function ModelPicker({ botId, provider, apiKey, value, onChange }) {
  const [state, setState] = useState({ loading: true, models: [] }); const [showLegacy, setShowLegacy] = useState(false);
  const load = async (refresh = false) => {
    setState((s) => ({ ...s, loading: true }));
    try { const { data } = await api.post(`/bots/${botId}/ai/models`, { provider, ...(apiKey.length >= 20 ? { apiKey } : {}), refresh }); setState({ loading: false, ...data }); }
    catch (e) { setState({ loading: false, models: [], error: errMsg(e) }); }
  };
  useEffect(() => { const t = setTimeout(() => load(), apiKey ? 600 : 0); return () => clearTimeout(t); }, [provider, apiKey]); // eslint-disable-line
  const latest = state.models.filter((m) => m.latest); const legacy = state.models.filter((m) => !m.latest);
  useEffect(() => { if (legacy.some((m) => m.id === value)) setShowLegacy(true); }, [state.models]); // eslint-disable-line
  const Row = (m) => (
    <label key={m.id} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${value === m.id ? 'border-tide bg-tide-tint' : 'border-line hover:border-harbor-300'}`}>
      <input type="radio" name="model" className="mt-1 h-4 w-4 accent-tide" checked={value === m.id} onChange={() => onChange(m.id)} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5"><b className="text-sm">{m.name}</b>{m.latest && m.line && <Badge tone="ok">Más reciente</Badge>}{m.line && SPEED[m.line] && <Badge>{SPEED[m.line]}</Badge>}</span>
        <code className="block font-mono text-xs text-ink-soft">{m.id}</code>
        {m.info && <span className="mt-0.5 block text-xs text-ink-soft">{m.info}</span>}
      </span>
    </label>
  );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2"><p className="label mb-0">Modelo</p>
        <button type="button" onClick={() => load(true)} className="text-xs font-semibold text-tide">{state.loading ? 'Consultando…' : 'Actualizar lista'}</button></div>
      {state.error && <p className="mb-2 rounded-lg bg-flare-tint px-3 py-2 text-sm text-flare">{state.error}</p>}
      {state.warning && <p className="mb-2 rounded-lg bg-signal-tint px-3 py-2 text-sm text-signal">{state.warning}</p>}
      {state.source === 'fallback' && !state.warning && <p className="mb-2 text-xs text-ink-soft">Lista de referencia. Guarda o escribe la API key para ver exactamente los modelos de tu cuenta.</p>}
      {state.source === 'live' && <p className="mb-2 text-xs text-ink-soft">Modelos disponibles ahora mismo para tu API key, consultados al proveedor.</p>}
      {state.currentAvailable === false && <p className="mb-2 rounded-lg bg-flare-tint px-3 py-2 text-sm text-flare">El modelo actual (<code>{state.current}</code>) ya no está disponible. Elige otro.</p>}
      {state.newer && <p className="mb-2 rounded-lg bg-tide-tint px-3 py-2 text-sm text-tide-dark">Hay una versión nueva de su familia: <b>{state.newer.name}</b> <button type="button" className="ml-1 font-bold underline" onClick={() => onChange(state.newer.id)}>Usarla</button></p>}
      <div className="grid gap-2 md:grid-cols-2">{latest.map(Row)}</div>
      {legacy.length > 0 && <>
        <button type="button" onClick={() => setShowLegacy(!showLegacy)} className="mt-3 text-sm font-semibold text-ink-soft">{showLegacy ? 'Ocultar' : 'Ver'} modelos anteriores ({legacy.length})</button>
        {showLegacy && <div className="mt-2 grid gap-2 md:grid-cols-2">{legacy.map(Row)}</div>}
      </>}
      {value && !state.models.some((m) => m.id === value) && !state.loading && <p className="hint">Modelo personalizado: <code>{value}</code></p>}
      <details className="mt-2"><summary className="cursor-pointer text-xs text-ink-soft">Escribir un ID de modelo a mano</summary><Input className="mt-2 font-mono" value={value} onChange={(e) => onChange(e.target.value.trim())} /></details>
    </div>
  );
}

function AiTab({ bot, save }) {
  const [f, setF] = useState({ provider: bot.ai.provider, model: bot.ai.model || '', apiKey: '', transcribeKey: '', temperature: bot.ai.temperature, maxTokens: bot.ai.maxTokens, maxToolSteps: bot.ai.maxToolSteps, autoUpgrade: bot.ai.autoUpgrade !== false });
  const [test, setTest] = useState(null); const [busy, setBusy] = useState(false);
  const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null));
  return (
    <Section title="Modelo de IA" description="El bot usa tu propia clave: el consumo se factura en tu cuenta de Anthropic u OpenAI.">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Proveedor"><Select value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value, model: '' })} options={[{ value: 'anthropic', label: 'Claude (Anthropic)' }, { value: 'openai', label: 'GPT (OpenAI)' }]} /></Field>
          <Field label="API key" hint={bot.ai.apiKeyMask && f.provider === bot.ai.provider ? `Guardada: ${bot.ai.apiKeyMask}. Déjalo vacío para conservarla.` : 'Obligatoria para que el bot responda.'}><Input type="password" className="font-mono" value={f.apiKey} onChange={(e) => setF({ ...f, apiKey: e.target.value.trim() })} placeholder={f.provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'} /></Field>
        </div>
        <ModelPicker botId={bot._id} provider={f.provider} apiKey={f.apiKey} value={f.model} onChange={(model) => setF({ ...f, model })} />
        <Toggle checked={f.autoUpgrade} onChange={(v) => setF({ ...f, autoUpgrade: v })} label="Actualizar el modelo automáticamente si se retira" hint="Revisamos tus modelos cada día. Si el que usas desaparece, el bot pasa a la versión más reciente de la misma familia (Sonnet → Sonnet) y te avisamos. Si hay una versión nueva, te avisamos para que decidas." />
        <div className="grid gap-4 md:grid-cols-2">
          {f.provider === 'anthropic' && <Field label="Clave OpenAI para audios (opcional)" hint="Claude no transcribe audio; con esta clave el bot entiende notas de voz."><Input type="password" className="font-mono" value={f.transcribeKey} onChange={(e) => setF({ ...f, transcribeKey: e.target.value.trim() })} /></Field>}
          {f.provider === 'openai' && <Field label={`Creatividad: ${f.temperature}`} hint="Solo la usan algunos modelos GPT-4."><input type="range" min="0" max="1" step="0.1" value={f.temperature} onChange={(e) => setF({ ...f, temperature: +e.target.value })} className="w-full accent-tide" /></Field>}
          <Field label="Longitud máxima de respuesta (tokens)" hint="Menos tokens = respuestas más rápidas. Se ajusta al límite del modelo."><Input type="number" value={f.maxTokens} onChange={(e) => setF({ ...f, maxTokens: +e.target.value })} /></Field>
          <Field label="Pasos máximos con herramientas" hint="Cuántas consultas encadenadas puede hacer por mensaje."><Input type="number" value={f.maxToolSteps} onChange={(e) => setF({ ...f, maxToolSteps: +e.target.value })} /></Field>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => save(() => api.put(`/bots/${bot._id}/ai`, body))}>Guardar modelo</Button>
        <Button variant="secondary" loading={busy} onClick={async () => { setBusy(true); setTest((await api.post(`/bots/${bot._id}/ai/test`).catch((e) => ({ data: { ok: false, error: errMsg(e) } }))).data); setBusy(false); }}>Probar conexión</Button>
        {test && (test.ok ? <Badge tone="ok">Responde en {test.ms} ms: “{test.reply}”</Badge> : <Badge tone="bad">{test.error}</Badge>)}
      </div>
    </Section>
  );
}

function PromptTab({ bot, save }) {
  const [p, setP] = useState(bot.systemPrompt);
  return (
    <Section title="Instrucciones del bot" description="Define quién es, qué sabe, qué tono usa y qué no debe hacer. La plataforma añade automáticamente el contexto del chat, la fecha y el proyecto vinculado."
      actions={<Button onClick={() => save(() => api.put(`/bots/${bot._id}`, { systemPrompt: p }))}>Guardar instrucciones</Button>}>
      <Textarea rows={18} className="font-mono text-[13px] leading-relaxed" value={p} onChange={(e) => setP(e.target.value)} />
      <p className="hint">{p.length.toLocaleString('es-ES')} / 20.000 caracteres</p>
    </Section>
  );
}

const DEMO_STEPS = ['Leyendo 3 mensajes', 'Cargando herramientas', 'Consultando CRM › buscar_trato', 'Redactando respuesta'];
function ProgressPreview({ enabled }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % (DEMO_STEPS.length + 2)), 1300); return () => clearInterval(t); }, []);
  const final = i > DEMO_STEPS.length;
  return (
    <div className="rounded-xl bg-[#DCE7F0] p-4 text-[#1D2733]">
      <div className="ml-auto mb-2 w-fit max-w-[85%] rounded-lg rounded-br-sm bg-[#E1F5D0] px-3 py-2 text-sm">@obras_bot ¿cómo va el montaje de Calle Mayor 12?</div>
      <div className="w-fit max-w-[85%] rounded-lg rounded-bl-sm bg-white px-3 py-2 text-sm shadow-sm" aria-live="polite">
        {!enabled ? (i > 2 ? 'El montaje está en fase 13: guías instaladas, falta la cabina (llega el jueves).' : <span className="text-[#55616F]">escribiendo…</span>)
          : final ? <>El montaje está en <b>fase 13</b>: guías instaladas, falta la cabina (llega el jueves).</>
            : <><i className="text-[#55616F]">Procesando…</i>{DEMO_STEPS.slice(0, i + 1).map((s, k) => <p key={s}>{k === Math.min(i, DEMO_STEPS.length - 1) ? '⏳' : '✅'} {s}</p>)}</>}
      </div>
    </div>
  );
}

const DEFAULT_BTNS = { agent: true, menu: { enabled: false, buttons: [] }, sets: [] };
const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
/** Vista previa de cómo se ven los botones en Telegram. */
function TgButtonsPreview({ cfg }) {
  const set = cfg.sets?.find((x) => x.buttons?.length);
  const inline = (set?.buttons || ['🏠 Vivienda', '🏢 Comunidad', '🏭 Industrial']).map((x) => x.split('|')[0].trim()).slice(0, 6);
  return (
    <div className="mt-4 rounded-xl bg-[#DCE7F0] p-3 text-[#1D2733]">
      <div className="w-fit max-w-[90%] rounded-lg rounded-bl-sm bg-white px-3 py-2 text-sm shadow-sm">{set ? `Elige una opción (${set.name}):` : '¿Para qué tipo de instalación es?'}</div>
      <div className="mt-1 grid max-w-[90%] gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(...inline.map((x) => x.length)) <= 12 ? 3 : 2}, minmax(0,1fr))` }}>
        {inline.map((t) => <span key={t} className="truncate rounded-md bg-[#517DA2]/80 px-2 py-1.5 text-center text-xs font-semibold text-white">{t}</span>)}</div>
      {cfg.menu?.enabled && cfg.menu.buttons?.length > 0 && <div className="mt-3 rounded-lg bg-[#F1F3F5] p-1.5"><div className="grid grid-cols-3 gap-1">{cfg.menu.buttons.slice(0, 9).map((t) => <span key={t} className="truncate rounded bg-white px-1.5 py-2 text-center text-[11px] font-medium shadow-sm">{t}</span>)}</div><p className="mt-1 text-center text-[10px] text-[#6b7785]">Menú fijo bajo el campo de texto</p></div>}
    </div>
  );
}

function BehaviorTab({ bot, save }) {
  const [b, setB] = useState({ ...bot.behavior, buttons: { ...DEFAULT_BTNS, ...bot.behavior?.buttons, menu: { ...DEFAULT_BTNS.menu, ...bot.behavior?.buttons?.menu } } });
  const btn = b.buttons; const setBtn = (patch) => setB({ ...b, buttons: { ...btn, ...patch } }); const [fl, setFl] = useState(bot.flood); const [crm, setCrm] = useState(bot.crm?.enabled !== false);
  return (
    <div className="grid gap-5 md:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Section title="Cuándo responde en grupos">
          <div className="space-y-4">
            <Field label="Modo"><Select value={b.groupMode} onChange={(e) => setB({ ...b, groupMode: e.target.value })} options={[
              { value: 'mention', label: 'Cuando lo mencionan (@bot), le responden o usan un comando' }, { value: 'commands', label: 'Solo con comandos /…' }, { value: 'always', label: 'Siempre (todos los mensajes)' }]} /></Field>
            <Field label="Palabras que también lo activan" hint="Separadas por comas. Ej.: soporte, ayuda bot"><Input value={(b.triggerKeywords || []).join(', ')} onChange={(e) => setB({ ...b, triggerKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
            <Toggle checked={b.learnFromGroup} onChange={(v) => setB({ ...b, learnFromGroup: v })} label="Aprender del contexto del grupo" hint="Guarda los mensajes que no van dirigidos al bot (7 días) para entender de qué se habla y qué proyecto es." />
            <Toggle checked={b.progressMessages} onChange={(v) => setB({ ...b, progressMessages: v })} label="Mostrar el progreso mientras trabaja" hint="Envía un mensaje de espera y lo va editando con cada paso hasta la respuesta final." />
            <Toggle checked={crm} onChange={setCrm} label="Rellenar la ficha CRM del contacto" hint="El agente guarda en Contactos los datos que le dan (nombre, teléfono, campos personalizados…) y eso dispara tus reglas de flujo." />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mensajes de historial que recuerda"><Input type="number" value={b.historyTurns} onChange={(e) => setB({ ...b, historyTurns: +e.target.value })} /></Field>
              <Field label="Idioma por defecto"><Input value={b.language} onChange={(e) => setB({ ...b, language: e.target.value })} /></Field>
            </div>
            <Field label="Chats permitidos (IDs)" hint="Vacío = cualquier chat. Útil para limitar el bot a grupos concretos."><Input value={(b.allowedChatIds || []).join(', ')} onChange={(e) => setB({ ...b, allowedChatIds: e.target.value.split(',').map((s) => Number(s.trim())).filter(Boolean) })} /></Field>
          </div>
        </Section>
        <Section title="Botones" description="Botones bajo los mensajes para que el usuario decida con un toque. Al pulsarlos, la respuesta llega al agente y la conversación sigue.">
          <div className="space-y-5">
            <Toggle checked={btn.agent} onChange={(v) => setBtn({ agent: v })} label="El agente puede generar botones" hint="Decide él mismo cuándo ofrecer opciones (tipo de servicio, sí/no, horarios…) según la conversación." />
            <div className="rounded-xl border border-line p-4">
              <Toggle checked={btn.menu.enabled} onChange={(v) => setBtn({ menu: { ...btn.menu, enabled: v } })} label="Menú fijo en chats privados" hint="Botones permanentes bajo el campo de escritura. Aparecen con /start o /menu y al cambiarlos. Envían su texto como mensaje." />
              {btn.menu.enabled && <div className="mt-3"><Field label="Botones del menú" hint="Uno por línea (máx. 12)."><Textarea rows={4} value={(btn.menu.buttons || []).join('\n')} onChange={(e) => setBtn({ menu: { ...btn.menu, buttons: lines(e.target.value).slice(0, 12) } })} placeholder={'📋 Pedir presupuesto\n🛠️ Avisar de una avería\n📞 Hablar con una persona'} /></Field></div>}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2"><div><p className="font-semibold">Conjuntos de botones fijos</p><p className="text-xs text-ink-soft">Opciones que defines tú; el agente los muestra cuando se da la situación descrita.</p></div>
                <Button size="sm" variant="secondary" onClick={() => setBtn({ sets: [...(btn.sets || []), { name: '', when: '', buttons: [] }] })}>Añadir conjunto</Button></div>
              <div className="space-y-3">{(btn.sets || []).map((st, i) => (
                <div key={i} className="rounded-xl border border-line p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nombre"><Input value={st.name} onChange={(e) => setBtn({ sets: btn.sets.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Tipo de instalación" /></Field>
                    <Field label="Cuándo mostrarlo"><Input value={st.when} onChange={(e) => setBtn({ sets: btn.sets.map((x, j) => (j === i ? { ...x, when: e.target.value } : x)) })} placeholder="Cuando pida presupuesto" /></Field>
                  </div>
                  <Field label="Botones" hint='Uno por línea. Para un enlace: "Ver catálogo | https://tuweb.com/catalogo".'><Textarea rows={3} value={(st.buttons || []).join('\n')} onChange={(e) => setBtn({ sets: btn.sets.map((x, j) => (j === i ? { ...x, buttons: lines(e.target.value).slice(0, 12) } : x)) })} /></Field>
                  <button className="mt-2 text-xs font-semibold text-flare" onClick={() => setBtn({ sets: btn.sets.filter((_, j) => j !== i) })}>Eliminar conjunto</button>
                </div>))}</div>
            </div>
          </div>
        </Section>
        <Section title="Protección contra ráfagas" description="Si alguien envía decenas de mensajes seguidos, el bot los agrupa y responde una vez, en orden, sin bloquearse.">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Espera para agrupar (ms)"><Input type="number" value={fl.debounceMs} onChange={(e) => setFl({ ...fl, debounceMs: +e.target.value })} /></Field>
            <Field label="Máx. mensajes en cola por chat"><Input type="number" value={fl.maxPending} onChange={(e) => setFl({ ...fl, maxPending: +e.target.value })} /></Field>
            <Field label="Máx. por minuto por chat"><Input type="number" value={fl.perChatPerMinute} onChange={(e) => setFl({ ...fl, perChatPerMinute: +e.target.value })} /></Field>
          </div>
        </Section>
        <Button onClick={() => save(() => api.put(`/bots/${bot._id}`, { behavior: { ...b, buttons: { ...btn, sets: (btn.sets || []).filter((x) => x.name && x.buttons?.length) } }, flood: fl, crm: { enabled: crm } }))}>Guardar comportamiento</Button>
      </div>
      <div className="order-first md:order-none md:sticky md:top-6 md:self-start"><p className="mb-2 text-sm font-semibold">Así lo verán en Telegram</p><ProgressPreview enabled={b.progressMessages} /><TgButtonsPreview cfg={btn} /></div>
    </div>
  );
}

function McpTab({ bot, save, refetch }) {
  const { data } = useQuery({ queryKey: ['mcp'], queryFn: () => api.get('/mcp').then((r) => r.data) });
  const [sel, setSel] = useState(bot.mcpServerIds.map(String));
  if (!data) return null;
  if (bot.kind === 'web' && !bot.web?.mcpAck?.at) return <McpPublicWarning bot={bot} onAck={refetch} />;
  if (!data.items.length) return <Empty title="No tienes conectores" action={<Link to="/connectors"><Button>Añadir conector</Button></Link>}>Los conectores MCP dan al bot herramientas reales: CRM, calendario, bases de datos o tus propias APIs.</Empty>;
  return (
    <>{bot.kind === 'web' && <McpPublicWarning bot={bot} onAck={refetch} />}
    <Section title="Conectores que usa este bot" description="El bot decide cuándo usar cada herramienta según la conversación." actions={<Link to="/connectors" className="text-sm font-semibold text-tide">Gestionar conectores</Link>}>
      <div className="space-y-2">{data.items.map((s) => (
        <label key={s._id} className="flex items-center justify-between rounded-md border border-line px-3 py-2.5">
          <span className="flex items-center gap-3"><input type="checkbox" className="accent-tide" checked={sel.includes(s._id)} onChange={(e) => setSel(e.target.checked ? [...sel, s._id] : sel.filter((x) => x !== s._id))} />
            <span><span className="font-semibold">{s.name}</span><span className="block text-xs text-ink-soft">{s.url}</span></span></span>
          {s.lastCheck?.ok ? <Badge tone="ok">{s.lastCheck.toolCount} herramientas</Badge> : <Badge tone="bad">{s.authType === 'oauth2_code' && !s.oauth?.connected ? 'Falta autorizar' : 'Sin conexión'}</Badge>}
        </label>))}</div>
      <Button className="mt-4" onClick={() => save(() => api.put(`/bots/${bot._id}/mcp`, { serverIds: sel }))}>Guardar conectores</Button>
    </Section></>
  );
}

const CRON_PRESETS = [{ value: '0 9 * * 1-5', label: 'Laborables a las 9:00' }, { value: '0 8 * * 1', label: 'Lunes a las 8:00' }, { value: '0 */2 * * *', label: 'Cada 2 horas' }, { value: '30 18 * * *', label: 'Cada día a las 18:30' }];
function TasksTab({ bot }) {
  const { data = [], refetch } = useQuery({ queryKey: ['tasks', bot._id], queryFn: () => api.get(`/bots/${bot._id}/tasks`).then((r) => r.data) });
  const chats = useQuery({ queryKey: ['chats', bot._id], queryFn: () => api.get(`/bots/${bot._id}/chats`).then((r) => r.data) });
  const toast = useToast(); const [open, setOpen] = useState(false);
  const blank = { name: '', type: 'cron', cron: '0 9 * * 1-5', runAt: '', timezone: 'Europe/Madrid', action: 'agent', prompt: '', chatIds: [] };
  const [f, setF] = useState(blank);
  async function create() { try { await api.post(`/bots/${bot._id}/tasks`, { ...f, runAt: f.type === 'once' ? new Date(f.runAt).toISOString() : undefined }); toast('Tarea creada'); setOpen(false); setF(blank); refetch(); } catch (e) { toast(errMsg(e), 'bad'); } }
  return (
    <Section title="Tareas programadas" description="El bot trabaja aunque nadie le escriba: informes diarios, recordatorios o revisiones con sus herramientas." actions={<Button onClick={() => setOpen(true)}>Nueva tarea</Button>}>
      <Table rows={data} empty="Sin tareas. Ej.: cada lunes, resumir los tratos sin actividad y enviarlo al grupo de comerciales." columns={[
        { key: 'name', label: 'Tarea', render: (t) => <><b>{t.name}</b><span className="block text-xs text-ink-soft">{t.type === 'cron' ? `${t.cron} (${t.timezone})` : fmtDate(t.runAt)}{t.createdBy === 'bot' && ' · creada por el bot'}</span></> },
        { key: 'action', label: 'Acción', render: (t) => (t.action === 'agent' ? 'Razonar con IA' : 'Mensaje fijo') },
        { key: 'last', label: 'Última ejecución', render: (t) => <>{fmtDate(t.lastRunAt)} {t.lastStatus && <Badge tone={t.lastStatus === 'ok' ? 'ok' : 'bad'}>{t.lastStatus}</Badge>}{t.lastError && <span className="block text-xs text-flare">{t.lastError}</span>}</> },
        { key: 'ops', label: '', render: (t) => <div className="flex justify-end gap-1">
          <Button size="sm" variant="secondary" onClick={async () => { await api.post(`/bots/${bot._id}/tasks/${t._id}/run`); toast('Ejecutando ahora'); }}>Ejecutar</Button>
          <Button size="sm" variant="ghost" onClick={async () => { await api.put(`/bots/${bot._id}/tasks/${t._id}`, { enabled: !t.enabled }).catch((e) => toast(errMsg(e), 'bad')); refetch(); }}>{t.enabled ? 'Pausar' : 'Reanudar'}</Button>
          <Button size="sm" variant="ghost" onClick={async () => { if (confirm('¿Eliminar la tarea?')) { await api.delete(`/bots/${bot._id}/tasks/${t._id}`); refetch(); } }}>Eliminar</Button></div> },
      ]} />
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva tarea" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={create}>Crear tarea</Button></>}>
        <Field label="Nombre"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Cuándo"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} options={[{ value: 'cron', label: 'Se repite' }, { value: 'once', label: 'Una sola vez' }]} /></Field>
        {f.type === 'cron' ? <Field label="Frecuencia (cron)" hint="Mínimo cada 5 minutos."><Input className="font-mono" list="crons" value={f.cron} onChange={(e) => setF({ ...f, cron: e.target.value })} /><datalist id="crons">{CRON_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</datalist></Field>
          : <Field label="Fecha y hora"><Input type="datetime-local" value={f.runAt} onChange={(e) => setF({ ...f, runAt: e.target.value })} /></Field>}
        <Field label="Zona horaria"><Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Field>
        <Field label="Qué hace"><Select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} options={[{ value: 'agent', label: 'Razonar con IA y herramientas' }, { value: 'message', label: 'Enviar este texto tal cual' }]} /></Field>
        <Field label={f.action === 'agent' ? 'Instrucción para el bot' : 'Mensaje'}><Textarea rows={4} value={f.prompt} onChange={(e) => setF({ ...f, prompt: e.target.value })} /></Field>
        <Field label="Enviar a" hint={chats.data?.length ? 'Chats donde el bot ya ha estado.' : 'El bot aún no ha recibido mensajes. Escríbele primero desde el chat de destino.'}>
          <div className="max-h-40 space-y-1 overflow-y-auto">{(chats.data || []).map((c) => <label key={c.chatId} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-tide" checked={f.chatIds.includes(c.chatId)} onChange={(e) => setF({ ...f, chatIds: e.target.checked ? [...f.chatIds, c.chatId] : f.chatIds.filter((x) => x !== c.chatId) })} />{c.title || c.username || c.chatId}</label>)}</div>
        </Field>
      </Modal>
    </Section>
  );
}

function WebhooksTab({ bot }) {
  const { data, refetch } = useQuery({ queryKey: ['webhooks', bot._id], queryFn: () => api.get(`/bots/${bot._id}/webhooks`).then((r) => r.data) });
  const chats = useQuery({ queryKey: ['chats', bot._id], queryFn: () => api.get(`/bots/${bot._id}/chats`).then((r) => r.data) });
  const toast = useToast(); const [open, setOpen] = useState(null); const [reveal, setReveal] = useState(null); const [deliv, setDeliv] = useState(null);
  const [f, setF] = useState({});
  const start = (direction) => { setF(direction === 'inbound' ? { direction, name: '', action: 'send_message', template: '🔔 Estado actualizado: {{body.estado}} en {{body.proyecto}}', chatIds: [] } : { direction, name: '', url: '', events: ['message.replied'] }); setOpen(direction); };
  async function create() { try { const { data: r } = await api.post(`/bots/${bot._id}/webhooks`, f); setReveal(r); setOpen(null); refetch(); } catch (e) { toast(errMsg(e), 'bad'); } }
  return (
    <div className="space-y-5">
      <Section title="Webhooks" description="Entrantes: otro sistema avisa al bot y este notifica en Telegram. Salientes: el bot envía eventos firmados a tu sistema." actions={<div className="flex gap-2">{bot.kind !== 'web' && <Button variant="secondary" onClick={() => start('inbound')}>Nuevo entrante</Button>}<Button onClick={() => start('outbound')}>Nuevo saliente</Button></div>}>
        <Table rows={data?.items || []} empty="Sin webhooks." columns={[
          { key: 'name', label: 'Nombre', render: (w) => <><b>{w.name}</b><span className="block text-xs text-ink-soft">{w.direction === 'inbound' ? `Entrante · ${w.action === 'run_agent' ? 'razona con IA' : 'mensaje con plantilla'}` : `Saliente · ${w.url}`}</span></> },
          { key: 'ev', label: 'Eventos / destino', render: (w) => (w.direction === 'outbound' ? w.events.join(', ') : `${w.chatIds.length} chats`) },
          { key: 'st', label: 'Estado', render: (w) => (w.enabled ? <Badge tone={w.consecutiveFailures ? 'warn' : 'ok'}>{w.consecutiveFailures ? `${w.consecutiveFailures} fallos` : 'Activo'}</Badge> : <Badge tone="bad">Desactivado</Badge>) },
          { key: 'ops', label: '', render: (w) => <div className="flex justify-end gap-1">
            {w.direction === 'outbound' && <Button size="sm" variant="secondary" onClick={async () => setDeliv((await api.get(`/bots/${bot._id}/webhooks/${w._id}/deliveries`)).data)}>Entregas</Button>}
            <Button size="sm" variant="ghost" onClick={async () => { await api.put(`/bots/${bot._id}/webhooks/${w._id}`, { enabled: !w.enabled }); refetch(); }}>{w.enabled ? 'Desactivar' : 'Activar'}</Button>
            <Button size="sm" variant="ghost" onClick={async () => { if (confirm('¿Eliminar webhook?')) { await api.delete(`/bots/${bot._id}/webhooks/${w._id}`); refetch(); } }}>Eliminar</Button></div> },
        ]} />
      </Section>
      <Section title="Verificar webhooks salientes">
        <p className="text-sm text-ink-soft">Cada envío lleva la cabecera <code>X-JuntialAgents-Signature: t=…,v1=…</code>. Calcula HMAC-SHA256 de <code>t + "." + cuerpo</code> con tu secreto y compáralo con <code>v1</code>. Rechaza firmas con más de 5 minutos.</p>
      </Section>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open === 'inbound' ? 'Webhook entrante' : 'Webhook saliente'} footer={<Button onClick={create}>Crear webhook</Button>}>
        <Field label="Nombre"><Input value={f.name || ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        {open === 'inbound' ? <>
          <Field label="Qué hace al recibirlo"><Select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} options={[{ value: 'send_message', label: 'Enviar mensaje con plantilla' }, { value: 'run_agent', label: 'Pedir al bot que lo analice' }]} /></Field>
          <Field label="Plantilla" hint="Usa {{body.campo}} para insertar datos del JSON recibido."><Textarea rows={3} className="font-mono text-xs" value={f.template} onChange={(e) => setF({ ...f, template: e.target.value })} /></Field>
          <Field label="Chats de destino"><div className="max-h-40 space-y-1 overflow-y-auto">{(chats.data || []).map((c) => <label key={c.chatId} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-tide" checked={f.chatIds?.includes(c.chatId)} onChange={(e) => setF({ ...f, chatIds: e.target.checked ? [...f.chatIds, c.chatId] : f.chatIds.filter((x) => x !== c.chatId) })} />{c.title || c.username || c.chatId}</label>)}</div></Field>
        </> : <>
          <Field label="URL de destino (HTTPS)"><Input value={f.url || ''} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://hook.make.com/…" /></Field>
          <Field label="Eventos"><div className="space-y-1">{['*', ...(data?.events || [])].map((ev) => <label key={ev} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-tide" checked={f.events?.includes(ev)} onChange={(e) => setF({ ...f, events: e.target.checked ? [...f.events, ev] : f.events.filter((x) => x !== ev) })} /><code>{ev === '*' ? 'todos' : ev}</code></label>)}</div></Field>
        </>}
      </Modal>
      <Modal open={!!reveal} onClose={() => setReveal(null)} title="Webhook creado" footer={<Button onClick={() => setReveal(null)}>Ya lo he guardado</Button>}>
        <p className="text-sm text-ink-soft">{reveal?.note}</p>
        {reveal?.url && <Field label="URL para hacer POST"><Secret value={reveal.url} /></Field>}
        {reveal?.secret && <Field label="Secreto de firma"><Secret value={reveal.secret} /></Field>}
      </Modal>
      <Modal open={!!deliv} onClose={() => setDeliv(null)} title="Últimas entregas">
        <Table rows={deliv || []} columns={[{ key: 'event', label: 'Evento' }, { key: 'status', label: 'HTTP', render: (d) => <Badge tone={d.ok ? 'ok' : 'bad'}>{d.status || 'error'}</Badge> }, { key: 'attempt', label: 'Intento' }, { key: 'durationMs', label: 'ms' }, { key: 'at', label: 'Fecha', render: (d) => fmtDate(d.createdAt) }]} />
      </Modal>
    </div>
  );
}

function ChatsTab({ bot }) {
  const { data = [], refetch } = useQuery({ queryKey: ['chats', bot._id], queryFn: () => api.get(`/bots/${bot._id}/chats`).then((r) => r.data) });
  const [edit, setEdit] = useState(null); const toast = useToast();
  const msgs = useQuery({ queryKey: ['msgs', bot._id, edit?.chatId], enabled: !!edit, queryFn: () => api.get(`/bots/${bot._id}/chats/${edit.chatId}/messages`).then((r) => r.data) });
  return (
    <Section title="Chats y proyectos" description="Cada chat tiene su memoria. Vincula grupos a proyectos para que el bot sepa de qué obra o cliente se habla.">
      <Table rows={data} empty="El bot aún no ha recibido mensajes." columns={[
        { key: 't', label: 'Chat', render: (c) => <><b>{c.title || c.username || c.chatId}</b><span className="block text-xs text-ink-soft">{c.type} · {c.chatId}</span></> },
        { key: 'p', label: 'Proyecto', render: (c) => (c.project?.name ? <>{c.project.name}{c.project.code && <Badge>{c.project.code}</Badge>}</> : <span className="text-ink-soft">Sin vincular</span>) },
        { key: 'n', label: 'Notas', render: (c) => c.notes?.length || 0 },
        { key: 'l', label: 'Último mensaje', render: (c) => fmtDate(c.lastMessageAt) },
        { key: 'o', label: '', render: (c) => <Button size="sm" variant="secondary" onClick={() => setEdit(structuredClone(c))}>Abrir</Button> },
      ]} />
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.title || 'Chat'} footer={<>
        <Button variant="danger" onClick={async () => { if (confirm('¿Borrar el historial de este chat?')) { await api.delete(`/bots/${bot._id}/chats/${edit.chatId}/history`); toast('Historial borrado'); msgs.refetch(); } }}>Borrar historial</Button>
        <Button onClick={async () => { await api.put(`/bots/${bot._id}/chats/${edit.chatId}`, { project: edit.project?.name ? edit.project : undefined, notes: edit.notes }); toast('Chat actualizado'); setEdit(null); refetch(); }}>Guardar</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Proyecto"><Input value={edit?.project?.name || ''} onChange={(e) => setEdit({ ...edit, project: { ...edit.project, name: e.target.value } })} /></Field>
          <Field label="Código / ref. CRM"><Input value={edit?.project?.code || ''} onChange={(e) => setEdit({ ...edit, project: { ...edit.project, code: e.target.value } })} /></Field>
        </div>
        <Field label="Descripción del proyecto"><Textarea rows={2} value={edit?.project?.description || ''} onChange={(e) => setEdit({ ...edit, project: { ...edit.project, description: e.target.value } })} /></Field>
        <Field label="Notas que recuerda el bot" hint="Una por línea."><Textarea rows={4} value={(edit?.notes || []).map((n) => n.text).join('\n')} onChange={(e) => setEdit({ ...edit, notes: e.target.value.split('\n').filter(Boolean).map((text) => ({ text })) })} /></Field>
        <div><p className="label">Conversación reciente</p><div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md bg-mist p-2 text-xs">{(msgs.data || []).map((m) => <p key={m._id} className={m.role === 'assistant' ? 'text-tide-dark' : m.role === 'context' ? 'text-ink-soft' : ''}><b>{m.role === 'assistant' ? 'Bot' : m.from?.name}:</b> {m.text?.slice(0, 300)}</p>)}</div></div>
      </Modal>
    </Section>
  );
}

function LogsTab({ bot }) {
  return <LogViewer botId={bot._id} title="Registro de actividad" description="Errores, herramientas, turnos y conexiones de los últimos 30 días. Pulsa en una fila para ver el detalle y su traza." />;
}
