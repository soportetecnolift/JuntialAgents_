import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Braces } from 'lucide-react';
import { api, errMsg } from '../../lib/api.js';
import { PageHeader, Button, Table, Badge, Empty, fmtDate, useToast } from '../../components/ui.jsx';

export const TEMPLATE = `/**
 * Se ejecuta desde una regla de flujo (acción «Función JavaScript») o desde «Probar».
 *   record → datos del contacto: record.id, record.name, record.email, record.<campo>…
 *   ctx    → { event, changes, old, rule, agentId, by }
 * Las llamadas jx.* son síncronas, como en Deluge: no uses await.
 */
function main(record, ctx) {
  jx.log('Contacto:', record.name, '· cambios:', Object.keys(ctx.changes || {}));

  // Ejemplo: calcular la prioridad según el presupuesto y guardarla en la ficha
  const prioridad = (record.presupuesto || 0) >= 20000 ? 'Alta' : 'Normal';
  // jx.records.update(record.id, { prioridad });

  // Ejemplo: enviar el lead a tu ERP (guarda el token en «Variables»)
  // const r = jx.http.post('https://erp.tuempresa.com/api/leads',
  //   { nombre: record.name, email: record.email },
  //   { headers: { Authorization: 'Bearer ' + jx.env.ERP_TOKEN } });
  // jx.log('ERP respondió', r.status, r.body);

  return { prioridad };
}
`;

export default function Functions() {
  const nav = useNavigate(); const toast = useToast();
  const { data = [] } = useQuery({ queryKey: ['crm-functions'], queryFn: () => api.get('/crm/functions').then((r) => r.data) });
  async function create() {
    const name = prompt('Nombre de la función', 'Nueva función'); if (!name) return;
    const apiName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 40) || 'funcion';
    try { const { data: f } = await api.post('/crm/functions', { name, apiName, code: TEMPLATE }); nav(`/crm/functions/${f._id}`); } catch (e) { toast(errMsg(e), 'bad'); }
  }
  return (
    <>
      <PageHeader title="Funciones" subtitle="Tu espacio de desarrollador: código JavaScript que recibe el contacto y puede leer o actualizar datos, llamar a APIs, enviar emails o mensajes. Se ejecuta aislado y con límites de seguridad."
        actions={<Button onClick={create}><Plus size={16} />Nueva función</Button>} />
      {!data.length ? <Empty title="Aún no tienes funciones" action={<Button onClick={create}>Crear función</Button>}>Úsalas como acción en tus reglas de flujo, igual que las funciones Deluge de Zoho, pero en JavaScript.</Empty> : (
        <div className="panel"><Table rows={data} onRowClick={(f) => nav(`/crm/functions/${f._id}`)} columns={[
          { key: 'n', label: 'Función', render: (f) => <span className="flex items-center gap-2"><Braces size={16} className="text-tide" /><span><b className="text-sm">{f.name}</b><code className="block font-mono text-xs text-ink-soft">{f.apiName}</code></span></span> },
          { key: 'd', label: 'Descripción', render: (f) => <span className="text-xs text-ink-soft">{f.description || '—'}</span> },
          { key: 'r', label: 'Ejecuciones', render: (f) => <>{f.stats?.runs || 0}{f.stats?.errors ? <Badge tone="bad">{f.stats.errors} errores</Badge> : null}</> },
          { key: 'l', label: 'Última', render: (f) => fmtDate(f.stats?.lastRunAt) },
        ]} /></div>)}
    </>
  );
}
