import { CENTER } from '../components/nav.js';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errMsg } from '../lib/api.js';
import { useAuth, isStaff } from '../lib/auth.jsx';
import { Secret as SecretBox } from '../components/ui.jsx';
import { ThemeSwitch } from '../components/Layout.jsx';
import { PageHeader, Section, Button, Field, Input, Toggle, Table, Badge, fmtDate, useToast } from '../components/ui.jsx';

export default function Settings() {
  const { user, sessionExpiresAt, setUser } = useAuth(); const toast = useToast();
  const sessions = useQuery({ queryKey: ['sessions'], queryFn: () => api.get('/auth/sessions').then((r) => r.data) });
  const [pw, setPw] = useState({ current: '', password: '' });
  const [prefs, setPrefs] = useState(user.notificationPrefs || { email: true, inApp: true });
  return (
    <>
      <PageHeader title="Ajustes" subtitle={`${user.email} · tu sesión caduca el ${new Date(sessionExpiresAt).toLocaleDateString('es-ES')} (30 días desde que entraste)`} />
      <div className="space-y-5">
        <Section title="Sesiones abiertas" description="Por seguridad, cada sesión dura 30 días como máximo. Cierra las que no reconozcas.">
          <Table rows={sessions.data || []} columns={[
            { key: 'ua', label: 'Dispositivo', render: (s) => <><span className="text-sm">{s.userAgent?.slice(0, 70)}</span>{s.current && <Badge tone="ok">Esta sesión</Badge>}</> },
            { key: 'm', label: 'Método', render: (s) => ({ google: 'Google', otp: 'Código', password: 'Contraseña', staff: 'Admin + 2FA' }[s.method]) },
            { key: 'ip', label: 'IP' }, { key: 'u', label: 'Último uso', render: (s) => fmtDate(s.lastUsedAt) }, { key: 'e', label: 'Caduca', render: (s) => fmtDate(s.expiresAt) },
            { key: 'o', label: '', render: (s) => !s.current && <Button size="sm" variant="ghost" onClick={async () => { await api.delete(`/auth/sessions/${s._id}`); sessions.refetch(); }}>Cerrar</Button> },
          ]} />
        </Section>
        <Section title="Tu cuenta" description="La contraseña, el inicio de sesión con Google, la verificación en dos pasos y tus organizaciones se gestionan en Juntial Center."><a href={`${CENTER}/settings`} className="font-semibold text-tide hover:underline">Abrir la seguridad de mi cuenta en Juntial Center →</a></Section>
        <Section title="Apariencia" description="Por defecto sigue el modo claro u oscuro de tu dispositivo."><div className="max-w-sm"><ThemeSwitch /></div></Section>
        <Section title="Avisos">
          <div className="space-y-3">
            <Toggle checked={prefs.email} onChange={(v) => setPrefs({ ...prefs, email: v })} label="Recibir avisos por email" hint="Los avisos de seguridad (códigos, nuevos accesos) se envían siempre." />
            <Toggle checked={prefs.inApp} onChange={(v) => setPrefs({ ...prefs, inApp: v })} label="Avisos dentro de la plataforma" />
          </div>
          <Button className="mt-4" variant="secondary" onClick={async () => { await api.put('/notifications/prefs', prefs); setUser({ ...user, notificationPrefs: prefs }); toast('Preferencias guardadas'); }}>Guardar preferencias</Button>
        </Section>
      </div>
    </>
  );
}

