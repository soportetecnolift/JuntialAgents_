import { useSearchParams, Navigate } from 'react-router-dom';
import { Orbit, ArrowRight } from 'lucide-react';
import { API_URL } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

/**
 * Acceso a JuntialAgents: siempre con Juntial Center (SSO). El registro, la contraseña, Google, los códigos y el
 * 2FA del equipo están en Center; aquí solo se vuelve con la sesión abierta.
 */
export default function Login() {
  const { user } = useAuth(); const [sp] = useSearchParams(); const error = sp.get('error');
  if (user) { const next = sessionStorage.getItem('ja-next'); sessionStorage.removeItem('ja-next'); return <Navigate to={next && next.startsWith('/') && !next.startsWith('//') ? next : '/'} replace />; }
  const next = sessionStorage.getItem('ja-next') || '/';
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-mist p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 text-center shadow-sm">
        <img src="/icon.svg" alt="" className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-2xl font-extrabold">JuntialAgents</h1>
        <p className="mt-1 text-sm text-ink-soft">Agentes de IA, CRM, reglas de flujo y empleados digitales.</p>
        {error && <p role="alert" className="mt-4 rounded-md bg-flare-tint px-3 py-2 text-left text-sm text-flare">{error}</p>}
        <a href={`${API_URL}/api/auth/sso/start?next=${encodeURIComponent(next)}`} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tide font-bold text-white hover:bg-tide-dark">
          <Orbit size={18} />Entrar con Juntial Center<ArrowRight size={16} />
        </a>
        <p className="mt-4 text-xs text-ink-soft">Tu cuenta, tu organización y tu equipo se gestionan en Juntial Center. Si no tienes cuenta, la creas allí en un minuto.</p>
      </div>
    </main>
  );
}
