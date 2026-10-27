import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, KeyRound, RotateCw, ShieldCheck } from 'lucide-react';
import { api, errMsg } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { PageHeader, Section, Button, Modal, Field, Input, Select, Table, Badge, Tabs, Secret, CopyButton, Empty, fmtDate, useToast } from '../components/ui.jsx';

const PRESETS = {
  client: { 'Solo lectura': ['bots:read', 'chats:read', 'tasks:read', 'webhooks:read', 'usage:read'], Mensajería: ['bots:read', 'chats:read', 'messages:send'], 'Agente IA': ['bots:read', 'agent:run', 'chats:read'], Completo: '*client' },
  admin: { 'Admin lectura': ['admin:read'], 'Admin completo': ['admin:read', 'admin:write', 'admin:support', 'platform:webhooks'], Todo: '*all' },
};
const group = (scopes) => Object.entries(scopes).reduce((g, [k, d]) => { const r = k.split(':')[0]; (g[r] ||= []).push([k, d]); return g; }, {});
const RES_ES = { bots: 'Bots', messages: 'Mensajería', agent: 'Agente IA', chats: 'Chats', tasks: 'Tareas', webhooks: 'Webhooks', mcp: 'Conectores', usage: 'Uso', support: 'Soporte', admin: 'Administración', platform: 'Eventos de plataforma' };

function snippets(base, kind) {
  const ex = kind === 'admin' ? `${base}/admin/stats` : `${base}/bots`;
  return {
    curl: `curl ${ex} \\\n  -H "Authorization: Bearer $JUNTIAL_KEY"\n\n# Enviar un aviso a un grupo\ncurl -X POST ${base}/bots/BOT_ID/messages \\\n  -H "Authorization: Bearer $JUNTIAL_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: $(uuidgen)" \\\n  -d '{"chatIds":[-1001234567890],"text":"🔔 Obra PRJ-204: fase 13"}'`,
    node: `const res = await fetch('${base}/bots/BOT_ID/agent', {\n  method: 'POST',\n  headers: {\n    Authorization: \`Bearer \${process.env.JUNTIAL_KEY}\`,\n    'Content-Type': 'application/json',\n  },\n  body: JSON.stringify({ input: 'Resume los tratos abiertos de esta semana' }),\n});\nif (!res.ok) throw new Error((await res.json()).error.message);\nconst { output, usage } = await res.json();`,
    python: `import os, requests\n\nr = requests.post(\n    "${base}/bots/BOT_ID/agent",\n    headers={"Authorization": f"Bearer {os.environ['JUNTIAL_KEY']}"},\n    json={"input": "Resume los tratos abiertos de esta semana"},\n    timeout=120,\n)\nr.raise_for_status()\nprint(r.json()["output"])`,
    verify: `// Verificar la firma de un webhook (Node)\nimport crypto from 'node:crypto';\nfunction verify(rawBody, header, secret) {\n  const { t, v1 } = Object.fromEntries(header.split(',').map((p) => p.split('=')));\n  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;\n  const sig = crypto.createHmac('sha256', secret).update(\`\${t}.\${rawBody}\`).digest('hex');\n  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(v1));\n}`,
  };
}

export default function Developers() {
  const { user } = useAuth(); const toast = useToast();
  const meta = useQuery({ queryKey: ['dev-meta'], queryFn: () => api.get('/developer/meta').then((r) => r.data), retry: false });
  const keys = useQuery({ queryKey: ['dev-keys'], enabled: !!meta.data, queryFn: () => api.get('/developer/keys').then((r) => r.data) });
  const [tab, setTab] = useState('keys');
  const [form, setForm] = useState(null); const [reveal, setReveal] = useState(null);
  if (meta.error) return <Empty title="Sin acceso a la API">{errMsg(meta.error)}</Empty>;
  if (!meta.data) return null;
  const kind = meta.data.kind; const isAdmin = kind === 'admin';
  const tabs = [{ id: 'keys', label: 'API keys' }, { id: 'logs', label: 'Peticiones' }, ...(isAdmin ? [{ id: 'events', label: 'Eventos de plataforma' }] : []), { id: 'guide', label: 'Guía rápida' }];

  async function create() {
    try { const { data } = await api.post('/developer/keys', { ...form, expiresInDays: form.expiresInDays ? +form.expiresInDays : null, ipAllowlist: form.ip.split(',').map((s) => s.trim()).filter(Boolean), ip: undefined }); setForm(null); setReveal(data); keys.refetch(); }
    catch (e) { toast(errMsg(e), 'bad'); }
  }
  const applyPreset = (p) => {
    const all = Object.keys(meta.data.scopes);
    setForm({ ...form, scopes: p === '*all' ? all : p === '*client' ? all.filter((s) => !s.startsWith('admin') && !s.startsWith('platform')) : p });
  };

  return (
    <>
      <PageHeader title={isAdmin ? 'API de administrador' : 'API para integraciones'}
        subtitle={isAdmin ? 'Claves con alcance de plataforma para desarrollos a medida: clientes, planes, soporte, auditoría y eventos.' : 'Conecta tus bots con tu CRM, ERP, Make o cualquier sistema mediante una API REST.'}
        actions={<><a href={meta.data.docsUrl} target="_blank" rel="noreferrer"><Button variant="secondary"><BookOpen size={16} />Documentación</Button></a><Button onClick={() => setForm({ name: '', scopes: [], expiresInDays: '', ip: '' })}><KeyRound size={16} />Crear clave</Button></>} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'keys' && (keys.data?.length === 0 ? <Empty title="Aún no tienes claves" action={<Button onClick={() => setForm({ name: '', scopes: [], expiresInDays: '', ip: '' })}>Crear mi primera clave</Button>}>Crea una clave con los permisos mínimos que necesite tu integración.</Empty> : (
        <div className="panel"><Table rows={keys.data || []} columns={[
          { key: 'n', label: 'Clave', render: (k) => <><b>{k.name}</b> {k.revokedAt ? <Badge tone="bad">Revocada</Badge> : k.expiresAt && new Date(k.expiresAt) < new Date() ? <Badge tone="warn">Caducada</Badge> : <Badge tone="ok">Activa</Badge>}<code className="mt-0.5 block font-mono text-xs text-ink-soft">{k.display}</code></> },
          { key: 's', label: 'Permisos', render: (k) => <span className="text-xs">{k.scopes.length > 3 ? `${k.scopes.slice(0, 3).join(', ')} +${k.scopes.length - 3}` : k.scopes.join(', ')}</span> },
          { key: 'u', label: 'Último uso', render: (k) => <>{fmtDate(k.lastUsedAt)}<span className="block text-xs text-ink-soft">{k.requests.toLocaleString('es-ES')} peticiones</span></> },
          { key: 'e', label: 'Caduca', render: (k) => (k.expiresAt ? fmtDate(k.expiresAt) : 'Nunca') },
          { key: 'o', label: '', render: (k) => !k.revokedAt && <div className="flex justify-end gap-1">
            <Button size="sm" variant="secondary" onClick={async () => { if (confirm('Se generará una clave nueva y la actual dejará de funcionar. ¿Continuar?')) { const { data } = await api.post(`/developer/keys/${k.id}/roll`); setReveal(data); keys.refetch(); } }}><RotateCw size={14} />Rotar</Button>
            <Button size="sm" variant="danger" onClick={async () => { if (confirm('¿Revocar la clave? Las integraciones que la usen dejarán de funcionar.')) { await api.delete(`/developer/keys/${k.id}`); keys.refetch(); toast('Clave revocada'); } }}>Revocar</Button></div> },
        ]} /></div>
      ))}
      {tab === 'logs' && <Logs keys={keys.data || []} />}
      {tab === 'events' && <PlatformEvents events={meta.data.platformEvents} />}
      {tab === 'guide' && <Guide meta={meta.data} />}

      <Modal open={!!form} onClose={() => setForm(null)} title="Nueva API key" footer={<><Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button><Button disabled={!form?.name || !form?.scopes.length} onClick={create}>Crear clave</Button></>}>
        {form && <>
          <Field label="Nombre" hint="Para reconocerla: el sistema que la usará."><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Make — avisos de obra" /></Field>
          <div><p className="label">Plantillas</p><div className="scroll-x gap-2">{Object.entries(PRESETS[kind]).map(([l, p]) => <Button key={l} size="sm" variant="secondary" type="button" onClick={() => applyPreset(p)}>{l}</Button>)}</div></div>
          <div><p className="label">Permisos ({form.scopes.length})</p>
            <div className="space-y-3 rounded-lg border border-line p-3">{Object.entries(group(meta.data.scopes)).map(([res, list]) => (
              <fieldset key={res}><legend className="mb-1 text-xs font-bold text-ink-soft">{RES_ES[res] || res}</legend>
                {list.map(([s, d]) => <label key={s} className="flex min-h-10 items-start gap-2.5 py-1 md:min-h-0"><input type="checkbox" className="mt-1 h-4 w-4 accent-tide" checked={form.scopes.includes(s)} onChange={(e) => setForm({ ...form, scopes: e.target.checked ? [...form.scopes, s] : form.scopes.filter((x) => x !== s) })} /><span><code className="font-mono text-xs font-semibold">{s}</code><span className="block text-xs text-ink-soft">{d}</span></span></label>)}
              </fieldset>))}</div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Caducidad"><Select value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: e.target.value })} options={[{ value: '', label: 'Sin caducidad' }, { value: '30', label: '30 días' }, { value: '90', label: '90 días' }, { value: '365', label: '1 año' }]} /></Field>
            <Field label="IPs permitidas" hint="Opcional. IPs o rangos CIDR, separados por comas."><Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="203.0.113.0/24" /></Field>
          </div>
        </>}
      </Modal>
      <Modal open={!!reveal} onClose={() => setReveal(null)} title="Copia tu clave ahora" footer={<Button onClick={() => setReveal(null)}>Ya la he guardado</Button>}>
        <p className="flex gap-2 rounded-lg bg-signal-tint p-3 text-sm text-signal"><ShieldCheck size={18} className="shrink-0" />Por seguridad solo guardamos su huella. Si la pierdes, rótala.</p>
        <Secret value={reveal?.secret} />
        <p className="text-xs text-ink-soft">Guárdala en una variable de entorno (por ejemplo <code>JUNTIAL_KEY</code>) o en el gestor de secretos de tu herramienta. Nunca en código del navegador.</p>
      </Modal>
    </>
  );
}

function Logs({ keys }) {
  const [keyId, setKeyId] = useState(''); const [errors, setErrors] = useState(false);
  const { data = [] } = useQuery({ queryKey: ['dev-logs', keyId, errors], queryFn: () => api.get(`/developer/logs?keyId=${keyId}${errors ? '&errors=1' : ''}`).then((r) => r.data), refetchInterval: 10000 });
  const names = useMemo(() => Object.fromEntries(keys.map((k) => [k.id, k.name])), [keys]);
  return (
    <Section title="Peticiones recientes" description="Últimos 30 días. Usa el ID de petición al abrir un ticket de soporte."
      actions={<><Select value={keyId} onChange={(e) => setKeyId(e.target.value)} options={[{ value: '', label: 'Todas las claves' }, ...keys.map((k) => ({ value: k.id, label: k.name }))]} /><Button variant={errors ? 'primary' : 'secondary'} onClick={() => setErrors(!errors)}>Solo errores</Button></>}>
      <Table rows={data} empty="Sin peticiones todavía." columns={[
        { key: 'p', label: 'Petición', render: (l) => <span className="font-mono text-xs"><b>{l.method}</b> {l.path.replace('/v1', '')}</span> },
        { key: 's', label: 'Estado', render: (l) => <Badge tone={l.status < 300 ? 'ok' : l.status < 500 ? 'warn' : 'bad'}>{l.status}</Badge> },
        { key: 'ms', label: 'Duración', render: (l) => `${l.ms} ms` },
        { key: 'k', label: 'Clave', render: (l) => names[l.keyId] || '—' },
        { key: 'd', label: 'Fecha', render: (l) => <>{fmtDate(l.createdAt)}<span className="block font-mono text-[11px] text-ink-soft">{l.requestId?.slice(0, 8)}</span></> },
      ]} />
    </Section>
  );
}

function PlatformEvents({ events }) {
  const toast = useToast();
  const { data, refetch } = useQuery({ queryKey: ['pwh'], queryFn: () => api.get('/developer/platform-webhooks').then((r) => r.data) });
  const [f, setF] = useState(null); const [secret, setSecret] = useState(null);
  return (
    <Section title="Eventos de plataforma" description="Recibe en tu sistema cada alta de usuario, nuevo cliente, cambio de plan, ticket o bot. Ideal para sincronizar CRM, facturación o BI."
      actions={<Button onClick={() => setF({ name: '', url: '', events: ['*'] })}>Nueva suscripción</Button>}>
      <Table rows={data?.items || []} empty="Sin suscripciones." columns={[
        { key: 'n', label: 'Destino', render: (w) => <><b>{w.name}</b><span className="block break-all text-xs text-ink-soft">{w.url}</span></> },
        { key: 'e', label: 'Eventos', render: (w) => <span className="text-xs">{w.events.join(', ')}</span> },
        { key: 's', label: 'Estado', render: (w) => (w.enabled ? <Badge tone={w.consecutiveFailures ? 'warn' : 'ok'}>{w.consecutiveFailures ? `${w.consecutiveFailures} fallos` : 'Activo'}</Badge> : <Badge tone="bad">Desactivado</Badge>) },
        { key: 'o', label: '', render: (w) => <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={async () => { await api.put(`/developer/platform-webhooks/${w._id}`, { enabled: !w.enabled }); refetch(); }}>{w.enabled ? 'Desactivar' : 'Activar'}</Button>
          <Button size="sm" variant="ghost" onClick={async () => { if (confirm('¿Eliminar la suscripción?')) { await api.delete(`/developer/platform-webhooks/${w._id}`); refetch(); } }}>Eliminar</Button></div> },
      ]} />
      <Modal open={!!f} onClose={() => setF(null)} title="Nueva suscripción" footer={<Button onClick={async () => { try { const { data: r } = await api.post('/developer/platform-webhooks', f); setF(null); setSecret(r.secret); refetch(); } catch (e) { toast(errMsg(e), 'bad'); } }}>Crear suscripción</Button>}>
        {f && <>
          <Field label="Nombre"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="URL (HTTPS)"><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://hook.eu1.make.com/…" /></Field>
          <div><p className="label">Eventos</p><div className="grid gap-1 sm:grid-cols-2">{['*', ...events].map((ev) => <label key={ev} className="flex min-h-10 items-center gap-2 text-sm md:min-h-0"><input type="checkbox" className="h-4 w-4 accent-tide" checked={f.events.includes(ev)} onChange={(e) => setF({ ...f, events: e.target.checked ? [...f.events, ev] : f.events.filter((x) => x !== ev) })} /><code className="font-mono text-xs">{ev === '*' ? 'todos' : ev}</code></label>)}</div></div>
        </>}
      </Modal>
      <Modal open={!!secret} onClose={() => setSecret(null)} title="Secreto de firma" footer={<Button onClick={() => setSecret(null)}>Ya lo he guardado</Button>}><Secret value={secret} /><p className="text-xs text-ink-soft">Úsalo para verificar la cabecera X-JuntialAgents-Signature.</p></Modal>
    </Section>
  );
}

function Guide({ meta }) {
  const [lang, setLang] = useState('curl'); const code = snippets(meta.baseUrl, meta.kind);
  return (
    <div className="space-y-5">
      <Section title="Datos de conexión">
        <div className="space-y-3"><Field label="URL base"><Secret value={meta.baseUrl} /></Field><Field label="Especificación OpenAPI 3.1"><Secret value={meta.openapiUrl} /></Field></div>
        <p className="hint mt-3">Importa la especificación en Postman, Insomnia, Make (HTTP) o genera un SDK con openapi-generator.</p>
      </Section>
      <Section title="Ejemplos" actions={<CopyButton value={code[lang]} />}>
        <div className="scroll-x mb-3 gap-1.5">{[['curl', 'cURL'], ['node', 'Node.js'], ['python', 'Python'], ['verify', 'Verificar webhook']].map(([k, l]) => <button key={k} onClick={() => setLang(k)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${lang === k ? 'bg-harbor text-white' : 'bg-mist text-ink-soft'}`}>{l}</button>)}</div>
        <pre className="overflow-x-auto rounded-lg bg-[#0F1A26] p-4 font-mono text-[12.5px] leading-relaxed text-[#D6E2EE]"><code>{code[lang]}</code></pre>
      </Section>
      <Section title="Buenas prácticas">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>Una clave por integración y con los permisos mínimos.</li>
          <li>Envía <code>Idempotency-Key</code> en los POST para reintentar sin duplicar mensajes.</li>
          <li>Ante un 429, espera los segundos de <code>Retry-After</code>.</li>
          <li>Rota las claves periódicamente y limita por IP las de servidores fijos.</li>
        </ul>
      </Section>
    </div>
  );
}
