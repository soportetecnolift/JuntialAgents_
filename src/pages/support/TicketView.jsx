import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errMsg } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { useAuth, isStaff } from '../../lib/auth.jsx';
import { Button, Badge, Select, Toggle, fmtDate, useToast } from '../../components/ui.jsx';
import { STATUS } from './Support.jsx';

export default function TicketView() {
  const { id } = useParams(); const { user } = useAuth(); const staff = isStaff(user); const toast = useToast(); const qc = useQueryClient();
  const { data, refetch } = useQuery({ queryKey: ['ticket', id], queryFn: () => api.get(`/support/${id}`).then((r) => r.data) });
  const [body, setBody] = useState(''); const [internal, setInternal] = useState(false); const [typing, setTyping] = useState(false);
  const end = useRef(null);
  useEffect(() => {
    const s = getSocket(); s.emit('ticket:join', id);
    const onMsg = (m) => qc.setQueryData(['ticket', id], (d) => (d && !d.messages.some((x) => x._id === m._id) ? { ...d, messages: [...d.messages, m] } : d));
    const onUpd = () => refetch(); let t;
    const onTyping = (e) => { if (e.userId !== user.id) { setTyping(true); clearTimeout(t); t = setTimeout(() => setTyping(false), 2500); } };
    s.on('ticket:message', onMsg); s.on('ticket:updated', onUpd); s.on('ticket:typing', onTyping);
    return () => { s.off('ticket:message', onMsg); s.off('ticket:updated', onUpd); s.off('ticket:typing', onTyping); };
  }, [id, qc, refetch, user.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages?.length]);
  if (!data) return <p className="text-ink-soft">Cargando…</p>;
  const { ticket, messages } = data; const closed = ['closed'].includes(ticket.status);

  async function send(e) {
    e.preventDefault(); if (!body.trim()) return;
    try { const { data: m } = await api.post(`/support/${id}/messages`, { body, internal }); setBody(''); qc.setQueryData(['ticket', id], (d) => (d.messages.some((x) => x._id === m._id) ? d : { ...d, messages: [...d.messages, m] })); } catch (e2) { toast(errMsg(e2), 'bad'); }
  }
  const patch = async (b) => { await api.patch(`/support/${id}`, b); refetch(); };
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px] md:gap-5">
      <div className="panel order-2 flex h-[calc(100dvh-var(--nav-h)-env(safe-area-inset-bottom)-10rem)] min-h-[420px] flex-col md:order-1 md:h-[calc(100vh-11rem)]">
        <div className="border-b border-line px-5 py-3"><h2>{ticket.subject}</h2><p className="text-xs text-ink-soft">{ticket.channel === 'chat' ? 'Chat directo' : 'Ticket'} #{ticket._id.slice(-6)}{data.tenant && ` · ${data.tenant.name}`}</p></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((m) => { const mine = m.authorId === user.id; return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : ''}`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-lg px-3.5 py-2 text-sm ${m.internal ? 'border border-dashed border-signal bg-signal-tint' : mine ? 'bg-tide text-white' : 'bg-mist'}`}>
                <p className={`text-xs font-semibold ${mine && !m.internal ? 'text-white/80' : 'text-ink-soft'}`}>{m.authorName}{m.authorRole !== 'client' && !mine && ' · Soporte'}{m.internal && ' · nota interna'}</p>
                <p className="whitespace-pre-wrap">{m.body}</p><p className={`mt-1 text-[11px] ${mine && !m.internal ? 'text-white/70' : 'text-ink-soft'}`}>{fmtDate(m.createdAt)}</p>
              </div></div>); })}
          {typing && <p className="text-xs text-ink-soft">Escribiendo…</p>}<div ref={end} />
        </div>
        {closed ? <p className="border-t border-line px-5 py-3 text-sm text-ink-soft">Esta conversación está cerrada. Abre una nueva si necesitas más ayuda.</p> : (
          <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
            <textarea rows={2} className="field flex-1 resize-none" value={body} onChange={(e) => { setBody(e.target.value); getSocket().emit('ticket:typing', id); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} placeholder="Escribe tu mensaje… (Enter para enviar)" />
            <Button aria-label="Enviar">Enviar</Button>
          </form>)}
      </div>
      <aside className="order-1 space-y-4 md:order-2">
        <div className="panel grid grid-cols-2 gap-3 p-4 md:grid-cols-1">
          <div><p className="label">Estado</p>{staff ? <Select value={ticket.status} onChange={(e) => patch({ status: e.target.value })} options={Object.entries(STATUS).map(([value, [label]]) => ({ value, label }))} /> : <Badge tone={STATUS[ticket.status][1]}>{STATUS[ticket.status][0]}</Badge>}</div>
          {staff && <div><p className="label">Prioridad</p><Select value={ticket.priority} onChange={(e) => patch({ priority: e.target.value })} options={[{ value: 'low', label: 'Baja' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Alta' }, { value: 'urgent', label: 'Urgente' }]} /></div>}
          {staff && <div><p className="label">Asignado</p><p className="text-sm">{ticket.assignee?.name || 'Nadie'}</p>{String(ticket.assignee?._id) !== user.id && <Button size="sm" variant="secondary" className="mt-1" onClick={() => patch({ assignee: user.id })}>Asignarme</Button>}</div>}
          {staff && <Toggle checked={internal} onChange={setInternal} label="Nota interna" hint="Solo la ve el equipo." />}
          {!staff && !closed && <Button variant="secondary" className="w-full" onClick={() => patch({ status: 'closed' })}>Cerrar conversación</Button>}
        </div>
      </aside>
    </div>
  );
}
