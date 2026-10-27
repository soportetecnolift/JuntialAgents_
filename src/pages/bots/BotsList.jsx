import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../../lib/api.js';
import { useAuth, isStaff } from '../../lib/auth.jsx';
import { PageHeader, Button, Modal, Field, Input, Table, Badge, fmtDate, Empty } from '../../components/ui.jsx';

export default function BotsList() {
  const { user } = useAuth(); const nav = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['bots'], queryFn: () => api.get('/bots').then((r) => r.data) });
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [kind, setKind] = useState('telegram'); const [role, setRole] = useState('comercial'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function create() { setBusy(true); setErr(''); try { const { data: b } = await api.post('/bots', { name, kind, ...(kind === 'worker' ? { role } : {}) }); nav(`/bots/${b._id}`); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); } }
  return (
    <>
      <PageHeader title="Agentes" subtitle="Bots de Telegram y agentes para tu web, cada uno con su modelo de IA, conectores y procedimientos." actions={!isStaff(user) && <Button onClick={() => setOpen(true)}>Crear agente</Button>} />
      {!isLoading && !data.length ? <Empty title="Sin bots todavía" action={<Button onClick={() => setOpen(true)}>Crear bot</Button>}>Empieza con un nombre; después conectas Telegram y la IA.</Empty> : (
        <div className="panel"><Table rows={data} columns={[
          { key: 'name', label: 'Bot', render: (b) => <button className="text-left font-semibold text-tide-dark" onClick={() => nav(`/bots/${b._id}`)}>{b.name}<span className="block text-xs font-normal text-ink-soft">{b.kind === 'worker' ? `🧠 ${b.worker?.title || 'Empleado digital'}` : b.kind === 'web' ? '🌐 Agente web' : b.telegram?.username ? `@${b.telegram.username}` : 'Telegram sin conectar'}</span></button> },
          { key: 'ai', label: 'IA', render: (b) => `${b.ai.provider === 'openai' ? 'GPT' : 'Claude'} · ${b.ai.model || 'por defecto'}` },
          { key: 'status', label: 'Estado', render: (b) => <Badge tone={b.status === 'active' ? 'ok' : b.status === 'error' ? 'bad' : 'neutral'}>{{ active: 'Activo', paused: 'En pausa', error: 'Con error' }[b.status]}</Badge> },
          { key: 'msgs', label: 'Mensajes', render: (b) => `${b.stats.messagesIn} / ${b.stats.messagesOut}` },
          { key: 'last', label: 'Última actividad', render: (b) => fmtDate(b.stats.lastActivityAt) },
        ]} /></div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo agente" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={busy} disabled={name.length < 2} onClick={create}>Crear agente</Button></>}>
        <div className="grid gap-2 sm:grid-cols-3">{[['telegram', '✈️ Bot de Telegram', 'Responde en chats y grupos de Telegram.'], ['web', '🌐 Agente web', 'Chat y voz en tu web con un código.'], ['worker', '🧠 Empleado digital', 'Trabaja por su cuenta: rutinas, decisiones y aprobaciones.']].map(([k, t, d]) => (
          <label key={k} className={`cursor-pointer rounded-xl border p-3.5 ${kind === k ? 'border-tide bg-tide-tint' : 'border-line'}`}><span className="flex items-center gap-2"><input type="radio" className="accent-tide" checked={kind === k} onChange={() => setKind(k)} /><b className="text-sm">{t}</b></span><span className="mt-1 block text-xs text-ink-soft">{d}</span></label>))}</div>
        {kind === 'worker' && <Field label="Puesto" hint="Plantilla de partida: misión, rutinas y autonomía. Todo se puede ajustar."><div className="grid gap-1.5 sm:grid-cols-2">{[['comercial', '📈 Comercial · seguimiento'], ['soporte', '🛟 Soporte · atención'], ['finanzas', '💶 Administración · cobros'], ['operaciones', '🏗️ Operaciones · proyectos'], ['asistente', '🧭 Asistente de dirección'], ['personalizado', '✨ Personalizado']].map(([k, l]) => <button type="button" key={k} onClick={() => setRole(k)} className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${role === k ? 'border-tide bg-tide-tint' : 'border-line'}`}>{l}</button>)}</div></Field>}
        <Field label="Nombre" hint={kind === 'web' ? 'Lo verán los visitantes; puedes cambiarlo después.' : 'Solo lo ves tú. El nombre público lo define Telegram.'} error={err}><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'worker' ? 'Lucía' : kind === 'web' ? 'Sara · Tecnolift' : 'Asistente de obras'} /></Field>
      </Modal>
    </>
  );
}
