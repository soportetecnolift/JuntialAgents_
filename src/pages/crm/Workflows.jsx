import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Mail, Send, Webhook, PenLine, Bell, Braces, Users, Globe, Brain } from 'lucide-react';
import { api } from '../../lib/api.js';
import { PageHeader, Button, Table, Badge, Toggle, Empty, fmtDate, useToast } from '../../components/ui.jsx';

export const ACTION_ICON = { email: Mail, telegram: Send, webhook: Webhook, field_update: PenLine, notify: Bell, function: Braces, agent_task: Brain };
export const TRIGGER_ES = { create: 'Al crear', edit: 'Al editar', create_or_edit: 'Al crear o editar', field_update: 'Al cambiar campos', delete: 'Al eliminar', date: 'Por fecha' };

export default function Workflows() {
  const nav = useNavigate(); const toast = useToast();
  const { data = [], refetch } = useQuery({ queryKey: ['crm-workflows'], queryFn: () => api.get('/crm/workflows').then((r) => r.data) });
  return (
    <>
      <PageHeader title="Reglas de flujo" subtitle="Automatiza lo que pasa cuando un contacto se crea o cambia: emails, Telegram, webhooks, actualizar campos o ejecutar tu propio código."
        actions={<Button onClick={() => nav('/crm/workflows/new')}><Plus size={16} />Nueva regla</Button>} />
      {!data.length ? <Empty title="Aún no tienes reglas" action={<Button onClick={() => nav('/crm/workflows/new')}>Crear mi primera regla</Button>}>Ejemplo: cuando el agente marque un contacto como «Cualificado», enviar un email al comercial y un aviso al grupo de Telegram.</Empty> : (
        <div className="panel"><Table rows={data} onRowClick={(w) => nav(`/crm/workflows/${w._id}`)} columns={[
          { key: 'n', label: 'Regla', render: (w) => <><b className="text-sm">{w.name}</b><span className="block text-xs text-ink-soft">{TRIGGER_ES[w.trigger.event]}{w.trigger.event === 'field_update' && w.trigger.fields?.length ? `: ${w.trigger.fields.join(', ')}` : ''}{w.conditions?.rules?.length ? ` · ${w.conditions.rules.length} condición(es)` : ''}</span></> },
          { key: 's', label: 'Alcance', render: (w) => (w.scope?.type === 'agents' ? <span className="flex flex-wrap gap-1">{(w.scope.agentIds || []).map((a) => <Badge key={a._id}>{a.kind === 'web' ? '🌐' : '✈️'} {a.name}</Badge>)}</span> : <Badge tone="ok"><Globe size={11} className="mr-1" />Todos los agentes</Badge>) },
          { key: 'a', label: 'Acciones', render: (w) => <span className="flex gap-1.5 text-ink-soft">{w.actions.map((a, i) => { const I = ACTION_ICON[a.type]; return <span key={i} title={a.type} className="relative"><I size={16} />{a.delayMinutes > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-signal" />}</span>; })}</span> },
          { key: 'r', label: 'Ejecuciones', render: (w) => <>{w.stats?.runs || 0}{w.stats?.errors ? <Badge tone="bad">{w.stats.errors} con error</Badge> : null}<span className="block text-xs text-ink-soft">{fmtDate(w.stats?.lastRunAt)}</span></> },
          { key: 'o', label: '', render: (w) => <span onClick={(e) => e.stopPropagation()}><Toggle checked={w.enabled} onChange={async (v) => { await api.put(`/crm/workflows/${w._id}`, { enabled: v }); toast(v ? 'Regla activada' : 'Regla pausada'); refetch(); }} label={w.enabled ? 'Activa' : 'Pausada'} /></span> },
        ]} /></div>)}
    </>
  );
}
