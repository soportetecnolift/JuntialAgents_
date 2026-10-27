import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UsageGrid } from '../Plans.jsx';
import { api, errMsg } from '../../lib/api.js';
import { useAuth, hasRole } from '../../lib/auth.jsx';
import { PageHeader, Section, Table, Badge, Button, Modal, fmtDate, useToast } from '../../components/ui.jsx';

export default function AdminTenants() {
  const { user } = useAuth(); const toast = useToast(); const canWrite = hasRole(user, 'superadmin', 'admin');
  const { data = [], refetch } = useQuery({ queryKey: ['tenants'], queryFn: () => api.get('/admin/tenants').then((r) => r.data) });
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/plans').then((r) => r.data) });
  const reqs = useQuery({ queryKey: ['plan-requests'], enabled: canWrite, queryFn: () => api.get('/plans/requests/all').then((r) => r.data) });
  const [usageOf, setUsageOf] = useState(null);
  const usage = useQuery({ queryKey: ['tenant-usage', usageOf?._id], enabled: !!usageOf, queryFn: () => api.get(`/admin/tenants/${usageOf._id}/usage`).then((r) => r.data) });
  const act = async (fn, msg) => { try { await fn(); toast(msg); refetch(); reqs.refetch(); } catch (e) { toast(errMsg(e), 'bad'); } };
  return (
    <>
      <PageHeader title="Clientes" subtitle="Cuentas de cliente, su plan y su estado." />
      {canWrite && reqs.data?.length > 0 && <div className="mb-5"><Section title="Solicitudes de cambio de plan">
        <Table rows={reqs.data} columns={[{ key: 't', label: 'Cliente', render: (r) => r.tenantId?.name }, { key: 'p', label: 'Plan solicitado', render: (r) => r.planId?.name }, { key: 'd', label: 'Fecha', render: (r) => fmtDate(r.createdAt) },
          { key: 'o', label: '', render: (r) => <div className="flex justify-end gap-1"><Button size="sm" onClick={() => act(() => api.post(`/plans/requests/${r._id}/approve`), 'Plan aprobado')}>Aprobar</Button><Button size="sm" variant="ghost" onClick={() => act(() => api.post(`/plans/requests/${r._id}/reject`), 'Solicitud rechazada')}>Rechazar</Button></div> }]} />
      </Section></div>}
      <div className="panel"><Table rows={data} columns={[
        { key: 'n', label: 'Cliente', render: (t) => <><b>{t.name}</b><span className="block text-xs text-ink-soft">{t.ownerId?.email}</span></> },
        { key: 'p', label: 'Plan', render: (t) => (canWrite ? <select className="field py-1" value={t.subscription?.planId?._id || ''} onChange={(e) => act(() => api.post(`/admin/tenants/${t._id}/plan`, { planId: e.target.value }), 'Plan asignado')}>{(plans.data || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select> : t.subscription?.planId?.name) },
        { key: 'b', label: 'Bots', render: (t) => t.bots },
        { key: 's', label: 'Estado', render: (t) => <Badge tone={t.status === 'active' ? 'ok' : 'bad'}>{t.status === 'active' ? 'Activo' : 'Suspendido'}</Badge> },
        { key: 'c', label: 'Alta', render: (t) => fmtDate(t.createdAt) },
        { key: 'o', label: '', render: (t) => <div className="flex justify-end gap-1"><Button size="sm" variant="secondary" onClick={() => setUsageOf(t)}>Consumo</Button>{canWrite && <Button size="sm" variant="ghost" onClick={() => act(() => api.patch(`/admin/tenants/${t._id}`, { status: t.status === 'active' ? 'suspended' : 'active' }), 'Estado actualizado')}>{t.status === 'active' ? 'Suspender' : 'Reactivar'}</Button>}</div> },
      ]} /></div>
      <Modal open={!!usageOf} onClose={() => setUsageOf(null)} title={`Consumo · ${usageOf?.name || ''}`}>{usage.data ? <UsageGrid resources={usage.data} /> : <p className="text-ink-soft">Cargando…</p>}</Modal>
    </>
  );
}
