import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../../lib/api.js';
import { PageHeader, Button, Modal, Field, Input, Toggle, Table, Badge, useToast } from '../../components/ui.jsx';

const fmt = (n) => (n < 0 ? '∞' : Number(n).toLocaleString('es-ES'));
const blank = (labels) => ({ name: '', slug: '', description: '', priceMonthly: 0, currency: 'USD', limits: Object.fromEntries(Object.keys(labels).map((k) => [k, 0])), features: [], isPublic: true, active: true });

export default function AdminPlans() {
  const toast = useToast();
  const { data = [], refetch } = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/plans').then((r) => r.data) });
  const labels = useQuery({ queryKey: ['plan-limits'], queryFn: () => api.get('/plans/limits').then((r) => r.data), staleTime: Infinity });
  const [f, setF] = useState(null);
  const L = labels.data || {}; const groups = Object.entries(L).reduce((g, [k, m]) => { (g[m.group] ||= []).push([k, m]); return g; }, {});
  async function save() {
    try { const { _id, createdAt, updatedAt, __v, ...b } = f; _id ? await api.put(`/plans/${_id}`, b) : await api.post('/plans', b); toast('Plan guardado'); setF(null); refetch(); }
    catch (e) { toast(errMsg(e), 'bad'); }
  }
  return (
    <>
      <PageHeader title="Planes" subtitle="Usa -1 para ilimitado. Los cambios se aplican al momento a todos los clientes del plan. Los límites nuevos que añada la plataforma se rellenan solos en los planes existentes." actions={<Button onClick={() => setF(blank(L))}>Nuevo plan</Button>} />
      <div className="panel"><Table rows={data} onRowClick={(p) => setF(structuredClone(p))} columns={[
        { key: 'n', label: 'Plan', render: (p) => <><b>{p.name}</b> <code className="text-xs text-ink-soft">{p.slug}</code></> },
        { key: 'p', label: 'Precio', render: (p) => `${p.priceMonthly} ${p.currency}` },
        ...['bots', 'messagesPerMonth', 'contacts', 'workflows', 'functions'].map((k) => ({ key: k, label: L[k]?.label?.replace(/^./, (c) => c.toUpperCase()) || k, render: (p) => fmt(p.limits?.[k] ?? -1) })),
        { key: 'v', label: 'Visibilidad', render: (p) => <>{!p.active && <Badge tone="bad">Inactivo</Badge>} {p.isPublic ? <Badge tone="ok">Público</Badge> : <Badge>Privado</Badge>}</> },
      ]} /></div>
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? `Editar ${f.name}` : 'Nuevo plan'} footer={<Button onClick={save}>Guardar plan</Button>}>
        {f && <>
          <div className="grid grid-cols-2 gap-3"><Field label="Nombre"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Slug"><Input value={f.slug} disabled={!!f._id} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
            <Field label="Precio mensual"><Input type="number" value={f.priceMonthly} onChange={(e) => setF({ ...f, priceMonthly: +e.target.value })} /></Field><Field label="Moneda"><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field></div>
          {Object.entries(groups).map(([g, list]) => (
            <fieldset key={g}><legend className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{g}</legend>
              <div className="grid grid-cols-2 gap-3">{list.map(([k, m]) => <Field key={k} label={m.label.replace(/^./, (c) => c.toUpperCase())}><Input type="number" min="-1" value={f.limits?.[k] ?? -1} onChange={(e) => setF({ ...f, limits: { ...f.limits, [k]: e.target.value === '' ? 0 : Math.max(-1, Math.trunc(+e.target.value)) } })} /></Field>)}</div></fieldset>))}
          <Field label="Características" hint="Una por línea; se muestran al cliente."><textarea className="field" rows={3} value={f.features.join('\n')} onChange={(e) => setF({ ...f, features: e.target.value.split('\n').filter(Boolean) })} /></Field>
          <Toggle checked={f.isPublic} onChange={(v) => setF({ ...f, isPublic: v })} label="Visible para clientes" />
          <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Activo" />
        </>}
      </Modal>
    </>
  );
}
