import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, Lock } from 'lucide-react';
import { api, errMsg } from '../../lib/api.js';
import { PageHeader, Button, Modal, Field, Input, Textarea, Select, Toggle, Table, Badge, useToast } from '../../components/ui.jsx';
import { useFields, TYPE_ES } from './common.jsx';

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'c_$1').slice(0, 40);

export default function Fields() {
  const { data = [] } = useFields(); const qc = useQueryClient(); const toast = useToast(); const [f, setF] = useState(null);
  async function save() {
    try {
      const body = { label: f.label, type: f.type, options: f.optionsText.split('\n').map((x) => x.trim()).filter(Boolean), required: f.required, agentWritable: f.agentWritable, aiHint: f.aiHint };
      if (f._id) await api.put(`/crm/fields/${f._id}`, body); else await api.post('/crm/fields', { ...body, key: f.key });
      toast('Campo guardado'); setF(null); qc.invalidateQueries({ queryKey: ['crm-fields'] });
    } catch (e) { toast(errMsg(e), 'bad'); }
  }
  return (
    <>
      <PageHeader title="Campos de contacto" subtitle="Define qué información guardas de cada contacto. Marca los que tus agentes pueden rellenar solos durante la conversación." actions={<Button onClick={() => setF({ label: '', key: '', type: 'text', optionsText: '', required: false, agentWritable: true, aiHint: '' })}><Plus size={16} />Nuevo campo</Button>} />
      <div className="panel"><Table rows={data} onRowClick={(x) => setF({ ...x, optionsText: (x.options || []).join('\n') })} columns={[
        { key: 'l', label: 'Campo', render: (x) => <><b className="text-sm">{x.label}</b> {x.system && <Lock size={12} className="inline text-ink-soft" aria-label="Campo de sistema" />}<code className="block font-mono text-xs text-ink-soft">{x.key}</code></> },
        { key: 't', label: 'Tipo', render: (x) => <>{TYPE_ES[x.type]}{x.options?.length ? <span className="block text-xs text-ink-soft">{x.options.slice(0, 4).join(', ')}{x.options.length > 4 ? '…' : ''}</span> : null}</> },
        { key: 'a', label: 'Agente', render: (x) => (x.agentWritable ? <Badge tone="ok"><Sparkles size={11} className="mr-1" />Lo rellena</Badge> : <Badge>Manual</Badge>) },
        { key: 'h', label: 'Indicación para la IA', render: (x) => <span className="text-xs text-ink-soft">{x.aiHint || '—'}</span> },
      ]} /></div>
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? `Editar «${f.label}»` : 'Nuevo campo'} footer={<>{f?._id && !f.system && <Button variant="danger" onClick={async () => { if (confirm('¿Eliminar el campo? Los datos guardados en él dejarán de mostrarse.')) { await api.delete(`/crm/fields/${f._id}`); setF(null); qc.invalidateQueries({ queryKey: ['crm-fields'] }); } }}>Eliminar</Button>}<Button onClick={save}>Guardar campo</Button></>}>
        {f && <>
          <Field label="Nombre visible"><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value, key: f._id ? f.key : slug(e.target.value) })} placeholder="Fecha de visita" /></Field>
          <Field label="Nombre API" hint={f._id ? 'No se puede cambiar.' : 'Úsalo en reglas, funciones ({{record.' + (f.key || 'campo') + '}}) y en la API.'}><Input className="font-mono" disabled={!!f._id} value={f.key} onChange={(e) => setF({ ...f, key: slug(e.target.value) })} /></Field>
          <Field label="Tipo"><Select value={f.type} disabled={!!f._id} onChange={(e) => setF({ ...f, type: e.target.value })} options={Object.entries(TYPE_ES).map(([value, label]) => ({ value, label }))} /></Field>
          {['picklist', 'multiselect'].includes(f.type) && <Field label="Opciones" hint="Una por línea."><Textarea rows={4} value={f.optionsText} onChange={(e) => setF({ ...f, optionsText: e.target.value })} /></Field>}
          <Toggle checked={f.required} onChange={(v) => setF({ ...f, required: v })} label="Obligatorio al crear manualmente" />
          <Toggle checked={f.agentWritable} onChange={(v) => setF({ ...f, agentWritable: v })} label="El agente puede rellenarlo" hint="Lo guardará en cuanto el contacto le dé ese dato en la conversación." />
          {f.agentWritable && <Field label="Indicación para la IA" hint="Cómo debe interpretarlo o cuándo rellenarlo."><Input value={f.aiHint} onChange={(e) => setF({ ...f, aiHint: e.target.value })} placeholder="Presupuesto aproximado en euros que menciona el cliente" /></Field>}
        </>}
      </Modal>
    </>
  );
}
