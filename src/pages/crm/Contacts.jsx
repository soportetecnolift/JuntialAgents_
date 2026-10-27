import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Bot, Workflow, PenLine, StickyNote, Sparkles } from 'lucide-react';
import { api, errMsg } from '../../lib/api.js';
import { PageHeader, Button, Input, Select, Table, Badge, Modal, Field, Tabs, Textarea, Empty, fmtDate, useToast } from '../../components/ui.jsx';
import { useFields, FieldInput, fmtValue, STATUS_TONE } from './common.jsx';

const BY_ES = { agent: 'el agente', user: 'el panel', api: 'la API', workflow: 'una regla', function: 'una función', schedule: 'la programación' };

export default function Contacts() {
  const [sp, setSp] = useSearchParams(); const [q, setQ] = useState(''); const [status, setStatus] = useState(''); const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  const fields = useFields();
  const list = useQuery({ queryKey: ['crm-records', debounced, status], queryFn: () => api.get(`/crm/records?q=${encodeURIComponent(debounced)}&status=${status}`).then((r) => r.data), refetchInterval: 20000 });
  const openId = sp.get('id'); const setOpen = (id) => setSp(id ? { id } : {});
  const statusField = fields.data?.find((f) => f.key === 'status');
  return (
    <>
      <PageHeader title="Contactos" subtitle={list.data ? `${list.data.total} contactos · tus agentes rellenan las fichas mientras conversan` : ''} actions={<Button onClick={() => setOpen('new')}><UserPlus size={16} />Nuevo contacto</Button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row"><Input placeholder="Buscar por nombre, email, teléfono o empresa" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-md" />
        <div className="sm:w-52"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'Todos los estados' }, ...(statusField?.options || []).map((o) => ({ value: o, label: o }))]} /></div></div>
      {list.data && !list.data.items.length && !debounced && !status ? <Empty title="Aún no hay contactos" action={<Button onClick={() => setOpen('new')}>Crear contacto</Button>}>Se crean solos cuando tus agentes conversan y recogen datos, o puedes añadirlos a mano o por API.</Empty> : (
        <div className="panel"><Table rows={list.data?.items || []} onRowClick={(r) => setOpen(r._id)} empty="Sin resultados." columns={[
          { key: 'n', label: 'Contacto', render: (r) => <><b className="text-sm">{r.data.name || r.data.email || 'Sin nombre'}</b><span className="block text-xs text-ink-soft">{r.data.email || r.data.phone || ''}</span></> },
          { key: 's', label: 'Estado', render: (r) => (r.data.status ? <Badge tone={STATUS_TONE[r.data.status] || 'neutral'}>{r.data.status}</Badge> : '—') },
          { key: 'p', label: 'Teléfono', render: (r) => r.data.phone || '—' },
          { key: 'c', label: 'Empresa', render: (r) => r.data.company || '—' },
          { key: 'o', label: 'Origen', render: (r) => r.data.source || '—' },
          { key: 'u', label: 'Actualizado', render: (r) => fmtDate(r.updatedAt) },
        ]} /></div>)}
      {openId && <RecordModal id={openId} fields={fields.data || []} onClose={() => setOpen(null)} onCreated={(id) => setOpen(id)} />}
    </>
  );
}

function RecordModal({ id, fields, onClose, onCreated }) {
  const isNew = id === 'new'; const qc = useQueryClient(); const toast = useToast();
  const { data, refetch } = useQuery({ queryKey: ['crm-record', id], enabled: !isNew, queryFn: () => api.get(`/crm/records/${id}`).then((r) => r.data) });
  const [form, setForm] = useState(isNew ? { status: 'Nuevo' } : null); const [tab, setTab] = useState('data'); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !form) setForm(data.record.data); }, [data]); // eslint-disable-line
  const byKey = useMemo(() => Object.fromEntries(fields.map((f) => [f.key, f])), [fields]);
  async function save() {
    setBusy(true);
    try {
      const orig = data?.record.data || {};
      const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => JSON.stringify(v ?? null) !== JSON.stringify(orig[k] ?? null)));
      if (isNew) { const { data: r } = await api.post('/crm/records', { data: changed }); toast('Contacto creado'); onCreated(r._id); }
      else { const { data: r } = await api.put(`/crm/records/${id}`, { data: changed }); toast(Object.keys(r.changes).length ? 'Guardado · las reglas de flujo se están ejecutando' : 'Sin cambios'); refetch(); }
      qc.invalidateQueries({ queryKey: ['crm-records'] });
    } catch (e) { toast(errMsg(e), 'bad'); } finally { setBusy(false); }
  }
  const title = isNew ? 'Nuevo contacto' : form?.name || form?.email || 'Contacto';
  return (
    <Modal open onClose={onClose} title={title} footer={tab === 'data' && <>{!isNew && <Button variant="danger" onClick={async () => { if (confirm('¿Eliminar este contacto?')) { await api.delete(`/crm/records/${id}`); qc.invalidateQueries({ queryKey: ['crm-records'] }); onClose(); } }}>Eliminar</Button>}<Button loading={busy} onClick={save}>Guardar</Button></>}>
      {!isNew && <Tabs sticky={false} value={tab} onChange={setTab} tabs={[{ id: 'data', label: 'Datos' }, { id: 'activity', label: `Actividad${data ? ` (${data.activity.length})` : ''}` }]} />}
      {!form ? <p className="text-ink-soft">Cargando…</p> : tab === 'data' ? (
        <div className="grid gap-3 sm:grid-cols-2">{fields.map((f) => (
          <div key={f.key} className={['textarea', 'multiselect'].includes(f.type) ? 'sm:col-span-2' : ''}>
            <Field label={<span className="flex items-center gap-1.5">{f.label}{f.required && ' *'}{f.agentWritable && <Sparkles size={12} className="text-tide" aria-label="El agente puede rellenarlo" />}</span>}>
              <FieldInput field={f} value={form[f.key]} onChange={(v) => setForm({ ...form, [f.key]: v })} />
            </Field>
          </div>))}
          {!isNew && data?.record.agentIds?.length > 0 && <p className="text-xs text-ink-soft sm:col-span-2">Agentes que han hablado con este contacto: {data.record.agentIds.map((a) => a.name).join(', ')}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Añadir una nota…" /><Button disabled={!note.trim()} onClick={async () => { await api.post(`/crm/records/${id}/notes`, { text: note }); setNote(''); refetch(); }}>Añadir</Button></div>
          <ol className="relative space-y-3 border-l-2 border-line pl-4">{data.activity.map((a) => {
            const Icon = a.type === 'workflow' ? Workflow : a.type === 'note' ? StickyNote : a.by === 'agent' ? Bot : PenLine;
            return (
              <li key={a._id} className="relative"><span className="absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full bg-surface text-tide ring-2 ring-line"><Icon size={12} /></span>
                <p className="text-xs text-ink-soft">{fmtDate(a.createdAt)} · {a.type === 'note' ? a.by : a.type === 'created' ? `Creado por ${BY_ES[a.by] || a.by}` : a.type === 'workflow' ? 'Regla de flujo' : `Editado por ${BY_ES[a.by] || a.by}`}</p>
                {a.text && <p className="text-sm">{a.text}</p>}
                {a.changes && Object.keys(a.changes).length > 0 && <ul className="mt-0.5 text-sm">{Object.entries(a.changes).map(([k, c]) => <li key={k}><b>{byKey[k]?.label || k}:</b> <span className="text-ink-soft line-through">{fmtValue(byKey[k], c.old)}</span> → {fmtValue(byKey[k], c.new)}</li>)}</ul>}
              </li>);
          })}</ol>
          {data.runs.length > 0 && <p className="text-xs text-ink-soft">Reglas ejecutadas: {data.runs.map((r) => `${r.ruleId?.name || 'regla'} (${r.status})`).join(' · ')} · <Link to="/crm/workflows" className="text-tide">Ver reglas</Link></p>}
        </div>
      )}
    </Modal>
  );
}
