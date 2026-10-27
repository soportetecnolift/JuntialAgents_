import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../lib/api.js';
import { PageHeader, Button, Modal, Field, Input, Select, Table, Badge, Empty, Secret, useToast, fmtDate } from '../components/ui.jsx';

const AUTH = [
  { value: 'none', label: 'Sin autenticación' }, { value: 'bearer', label: 'Bearer token' }, { value: 'api_key', label: 'API key en cabecera' },
  { value: 'basic', label: 'Usuario y contraseña (Basic)' }, { value: 'headers', label: 'Cabeceras personalizadas' },
  { value: 'oauth2_code', label: 'OAuth 2.0 (iniciar sesión en el servicio)' }, { value: 'oauth2_client_credentials', label: 'OAuth 2.0 client credentials' },
];
const blank = { name: '', url: '', transport: 'auto', authType: 'none', credentials: {}, oauth: {}, toolAllowlist: [] };

export default function Connectors() {
  const { data, refetch } = useQuery({ queryKey: ['mcp'], queryFn: () => api.get('/mcp').then((r) => r.data) });
  const [sp, setSp] = useSearchParams(); const toast = useToast();
  const [f, setF] = useState(null); const [tools, setTools] = useState(null); const [busy, setBusy] = useState(false); const [headersText, setHeadersText] = useState('');
  useEffect(() => { const o = sp.get('oauth'); if (o) { toast(o === 'ok' ? 'Conector autorizado' : `OAuth: ${sp.get('msg')}`, o === 'ok' ? 'ok' : 'bad'); setSp({}); refetch(); } }, []); // eslint-disable-line
  const cred = (k) => (e) => setF({ ...f, credentials: { ...f.credentials, [k]: e.target.value } });
  const oa = (k) => (e) => setF({ ...f, oauth: { ...f.oauth, [k]: e.target.value || undefined } });

  async function save() {
    setBusy(true);
    try {
      const body = { ...f, credentials: { ...f.credentials } };
      if (f.authType === 'headers') body.credentials.headers = Object.fromEntries(headersText.split('\n').map((l) => l.split(':').map((s) => s.trim())).filter(([k, v]) => k && v).map(([k, ...v]) => [k, v.join(':')]));
      const { data: r } = f._id ? await api.put(`/mcp/${f._id}`, body) : await api.post('/mcp', body);
      setF(null); refetch();
      if (r.needsOAuth) { const { data: s } = await api.get(`/mcp/${r.server._id}/oauth/start`); window.location.href = s.url; return; }
      toast(r.test?.ok === false ? `Guardado, pero no conecta: ${r.test.error}` : 'Conector guardado', r.test?.ok === false ? 'bad' : 'ok');
    } catch (e) { toast(errMsg(e), 'bad'); } finally { setBusy(false); }
  }
  return (
    <>
      <PageHeader title="Conectores MCP" subtitle="Herramientas externas que tus bots pueden usar: CRM, calendarios, bases de datos o tus propias APIs." actions={<Button onClick={() => { setF(blank); setHeadersText(''); }}>Añadir conector</Button>} />
      {data && !data.items.length ? <Empty title="Sin conectores" action={<Button onClick={() => setF(blank)}>Añadir conector</Button>}>Añade la URL de un servidor MCP remoto (Streamable HTTP o SSE) y su forma de autenticación.</Empty> : (
        <div className="panel"><Table rows={data?.items || []} columns={[
          { key: 'n', label: 'Conector', render: (s) => <><b>{s.name}</b><span className="block text-xs text-ink-soft">{s.url}</span></> },
          { key: 'a', label: 'Autenticación', render: (s) => AUTH.find((a) => a.value === s.authType)?.label },
          { key: 's', label: 'Estado', render: (s) => (s.authType === 'oauth2_code' && !s.oauth?.connected ? <Badge tone="warn">Falta autorizar</Badge> : s.lastCheck?.ok ? <Badge tone="ok">{s.lastCheck.toolCount} herramientas</Badge> : <Badge tone="bad" >{s.lastCheck?.error?.slice(0, 40) || 'Sin probar'}</Badge>) },
          { key: 'c', label: 'Comprobado', render: (s) => fmtDate(s.lastCheck?.at) },
          { key: 'o', label: '', render: (s) => <div className="flex justify-end gap-1">
            {s.authType === 'oauth2_code' && <Button size="sm" onClick={async () => { const { data: r } = await api.get(`/mcp/${s._id}/oauth/start`).catch((e) => (toast(errMsg(e), 'bad'), {})); if (r?.url) window.location.href = r.url; }}>{s.oauth?.connected ? 'Reautorizar' : 'Autorizar'}</Button>}
            <Button size="sm" variant="secondary" onClick={async () => { const { data: r } = await api.post(`/mcp/${s._id}/test`); setTools(r); refetch(); }}>Probar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setF({ ...blank, ...s, credentials: {} }); setHeadersText(''); }}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={async () => { if (confirm('¿Eliminar el conector? Se quitará de todos los bots.')) { await api.delete(`/mcp/${s._id}`); refetch(); } }}>Eliminar</Button></div> },
        ]} /></div>
      )}
      <Modal open={!!f} onClose={() => setF(null)} title={f?._id ? 'Editar conector' : 'Nuevo conector'} footer={<><Button variant="secondary" onClick={() => setF(null)}>Cancelar</Button><Button loading={busy} onClick={save}>{f?.authType === 'oauth2_code' && !f?._id ? 'Guardar y autorizar' : 'Guardar y probar'}</Button></>}>
        {f && <>
          <Field label="Nombre"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="CRM de la empresa" /></Field>
          <Field label="URL del servidor MCP"><Input className="font-mono" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://mcp.ejemplo.com/mcp" /></Field>
          <Field label="Transporte"><Select value={f.transport} onChange={(e) => setF({ ...f, transport: e.target.value })} options={[{ value: 'auto', label: 'Automático (Streamable HTTP y, si falla, SSE)' }, { value: 'streamable-http', label: 'Streamable HTTP' }, { value: 'sse', label: 'SSE (legacy)' }]} /></Field>
          <Field label="Autenticación"><Select value={f.authType} onChange={(e) => setF({ ...f, authType: e.target.value })} options={AUTH} /></Field>
          {f._id && f.authType !== 'none' && <p className="hint">Las credenciales guardadas no se muestran. Deja los campos vacíos para conservarlas.</p>}
          {f.authType === 'bearer' && <Field label="Token"><Input type="password" className="font-mono" onChange={cred('token')} /></Field>}
          {f.authType === 'api_key' && <div className="grid grid-cols-2 gap-3"><Field label="Cabecera"><Input placeholder="X-API-Key" onChange={cred('headerName')} /></Field><Field label="Valor"><Input type="password" onChange={cred('apiKey')} /></Field></div>}
          {f.authType === 'basic' && <div className="grid grid-cols-2 gap-3"><Field label="Usuario"><Input onChange={cred('username')} /></Field><Field label="Contraseña"><Input type="password" onChange={cred('password')} /></Field></div>}
          {f.authType === 'headers' && <Field label="Cabeceras" hint="Una por línea: Nombre: valor"><textarea className="field font-mono text-xs" rows={4} value={headersText} onChange={(e) => setHeadersText(e.target.value)} placeholder={'X-Org-Id: 1234\nAuthorization: Zoho-oauthtoken …'} /></Field>}
          {f.authType.startsWith('oauth2') && <>
            <p className="hint">{f.authType === 'oauth2_code' ? 'Si el servidor soporta descubrimiento y registro dinámico (spec MCP), deja todo vacío.' : 'Indica las credenciales de la aplicación.'} URI de redirección: <Secret value={data?.oauthRedirectUri} /></p>
            <div className="grid grid-cols-2 gap-3"><Field label="Client ID"><Input value={f.oauth?.clientId || ''} onChange={oa('clientId')} /></Field><Field label="Client secret"><Input type="password" onChange={cred('clientSecret')} /></Field></div>
            <Field label="URL de autorización"><Input value={f.oauth?.authorizationUrl || ''} onChange={oa('authorizationUrl')} /></Field>
            <Field label="URL de token"><Input value={f.oauth?.tokenUrl || ''} onChange={oa('tokenUrl')} /></Field>
            <Field label="Scopes"><Input value={f.oauth?.scopes || ''} onChange={oa('scopes')} /></Field>
          </>}
          <Field label="Herramientas permitidas (opcional)" hint="Nombres separados por comas. Vacío = todas."><Input value={(f.toolAllowlist || []).join(', ')} onChange={(e) => setF({ ...f, toolAllowlist: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} /></Field>
        </>}
      </Modal>
      <Modal open={!!tools} onClose={() => setTools(null)} title={tools?.ok ? `${tools.tools.length} herramientas disponibles` : 'No se pudo conectar'}>
        {tools?.ok ? <ul className="space-y-2 text-sm">{tools.tools.map((t) => <li key={t.name}><code className="font-mono text-xs font-semibold">{t.name}</code><p className="text-ink-soft">{t.description}</p></li>)}</ul> : <p className="text-sm text-flare">{tools?.error}</p>}
      </Modal>
    </>
  );
}
