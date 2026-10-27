import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../../lib/api.js';
import { useAuth, isStaff } from '../../lib/auth.jsx';
import { PageHeader, Button, Modal, Field, Input, Textarea, Select, Table, Badge, fmtDate, useToast, Tabs } from '../../components/ui.jsx';

export const STATUS = { open: ['Abierto', 'warn'], in_progress: ['En curso', 'ok'], waiting_customer: ['Esperando respuesta', 'neutral'], resolved: ['Resuelto', 'neutral'], closed: ['Cerrado', 'neutral'] };
const PRIO = { low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente' };

export default function Support() {
  const { user } = useAuth(); const staff = isStaff(user); const nav = useNavigate(); const toast = useToast();
  const [view, setView] = useState(staff ? 'open' : 'all');
  const qs = { open: '?status=open,in_progress', mine: '?mine=1&status=open,in_progress,waiting_customer', unassigned: '?unassigned=1&status=open', all: '' }[view];
  const { data = [] } = useQuery({ queryKey: ['tickets', view], queryFn: () => api.get(`/support${qs}`).then((r) => r.data), refetchInterval: 20000 });
  const [f, setF] = useState(null);
  async function create(channel) {
    try { const { data: t } = await api.post('/support', { ...f, channel }); nav(`/support/${t._id}`); } catch (e) { toast(errMsg(e), 'bad'); }
  }
  return (
    <>
      <PageHeader title={staff ? 'Bandeja de soporte' : 'Soporte'} subtitle={staff ? 'Tickets y chats directos de todos los clientes.' : 'Abre un ticket o habla directamente con nuestro equipo.'}
        actions={!staff && <div className="flex gap-2"><Button variant="secondary" onClick={async () => { const { data: t } = await api.post('/support', { subject: 'Chat directo', body: 'Hola, necesito ayuda.', channel: 'chat' }); nav(`/support/${t._id}`); }}>Chat directo</Button><Button onClick={() => setF({ subject: '', body: '', category: 'technical', priority: 'normal' })}>Nuevo ticket</Button></div>} />
      {staff && <Tabs value={view} onChange={setView} tabs={[{ id: 'open', label: 'Abiertos' }, { id: 'unassigned', label: 'Sin asignar' }, { id: 'mine', label: 'Asignados a mí' }, { id: 'all', label: 'Todos' }]} />}
      <div className="panel"><Table rows={data} empty="No hay solicitudes." columns={[
        { key: 's', label: 'Asunto', render: (t) => <button className="text-left font-semibold text-tide-dark" onClick={() => nav(`/support/${t._id}`)}>{t.unreadForStaff && staff && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-flare" />}{t.subject}<span className="block text-xs font-normal text-ink-soft">{t.channel === 'chat' ? 'Chat directo' : 'Ticket'} · #{t._id.slice(-6)}{staff && t.createdBy && ` · ${t.createdBy.email}`}</span></button> },
        { key: 'st', label: 'Estado', render: (t) => <Badge tone={STATUS[t.status][1]}>{STATUS[t.status][0]}</Badge> },
        { key: 'p', label: 'Prioridad', render: (t) => PRIO[t.priority] },
        ...(staff ? [{ key: 'a', label: 'Asignado', render: (t) => t.assignee?.name || '—' }] : []),
        { key: 'l', label: 'Actividad', render: (t) => fmtDate(t.lastMessageAt) },
      ]} /></div>
      <Modal open={!!f} onClose={() => setF(null)} title="Nuevo ticket" footer={<Button onClick={() => create('ticket')}>Enviar ticket</Button>}>
        {f && <>
          <Field label="Asunto"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={[{ value: 'technical', label: 'Técnico' }, { value: 'billing', label: 'Facturación' }, { value: 'feature', label: 'Sugerencia' }, { value: 'other', label: 'Otro' }]} /></Field>
            <Field label="Prioridad"><Select value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} options={Object.entries(PRIO).map(([value, label]) => ({ value, label }))} /></Field>
          </div>
          <Field label="Describe el problema" hint="Incluye el nombre del bot y qué esperabas que pasara."><Textarea rows={6} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        </>}
      </Modal>
    </>
  );
}
