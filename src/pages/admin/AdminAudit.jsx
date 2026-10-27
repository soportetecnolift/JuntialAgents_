import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { PageHeader, Input, Table, fmtDate } from '../../components/ui.jsx';

export default function AdminAudit() {
  const [action, setAction] = useState('');
  const { data = [] } = useQuery({ queryKey: ['audit', action], queryFn: () => api.get(`/admin/audit?action=${action}`).then((r) => r.data) });
  return (
    <>
      <PageHeader title="Auditoría" subtitle="Quién hizo qué y cuándo. Se conserva 12 meses." />
      <Input className="mb-4 max-w-xs" placeholder="Filtrar por acción (ej. bot., user.)" value={action} onChange={(e) => setAction(e.target.value)} />
      <div className="panel"><Table rows={data} columns={[
        { key: 'd', label: 'Fecha', render: (a) => fmtDate(a.createdAt) }, { key: 'u', label: 'Actor', render: (a) => <>{a.actorEmail}<span className="block text-xs text-ink-soft">{a.actorRole}</span></> },
        { key: 'a', label: 'Acción', render: (a) => <code className="font-mono text-xs">{a.action}</code> }, { key: 't', label: 'Objeto', render: (a) => a.target?.kind && `${a.target.kind} ${a.target.id?.slice(-6)}` },
        { key: 'ip', label: 'IP / petición', render: (a) => <span className="font-mono text-xs">{a.ip}<span className="block text-ink-soft">{a.requestId?.slice(0, 8)}</span></span> },
      ]} /></div>
    </>
  );
}
