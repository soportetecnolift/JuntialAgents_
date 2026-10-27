import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth, isStaff } from '../lib/auth.jsx';
import { PageHeader, Section, Badge, Button, Empty } from '../components/ui.jsx';

const Stat = ({ label, value, sub }) => <div className="panel p-4"><p className="text-sm text-ink-soft">{label}</p><p className="mt-1 text-2xl font-extrabold">{value ?? '—'}</p>{sub && <p className="text-xs text-ink-soft">{sub}</p>}</div>;

function StaffDashboard() {
  const { data } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get('/admin/stats').then((r) => r.data), refetchInterval: 15000 });
  return (
    <>
      <PageHeader title="Panel de la plataforma" subtitle="Estado en tiempo casi real de clientes, bots y colas." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Clientes" value={data?.tenants} /><Stat label="Usuarios" value={data?.users} />
        <Stat label="Bots activos" value={data?.activeBots} sub={`de ${data?.bots ?? '—'}`} />
        <Stat label="Mensajes este mes" value={data?.messagesThisMonth?.toLocaleString('es-ES')} />
        <Stat label="Tickets abiertos" value={data?.openTickets} />
      </div>
      <div className="mt-6"><Section title="Colas de trabajo" description="Si 'en espera' crece de forma sostenida, añade réplicas del worker.">
        <div className="grid gap-3 md:grid-cols-3">{Object.entries(data?.queues || {}).map(([k, c]) => (
          <div key={k} className="rounded-md border border-line p-3"><p className="font-semibold">{k}</p>
            <p className="mt-1 text-sm text-ink-soft">En espera {c.waiting} · Activos {c.active} · Programados {c.delayed}</p>
            {c.failed > 0 && <Badge tone="bad">{c.failed} fallidos</Badge>}</div>))}</div>
      </Section></div>
    </>
  );
}

function ClientDashboard() {
  const { user } = useAuth();
  const bots = useQuery({ queryKey: ['bots'], queryFn: () => api.get('/bots').then((r) => r.data) });
  const plan = useQuery({ queryKey: ['my-plan'], queryFn: () => api.get('/plans/me').then((r) => r.data) });
  const lim = plan.data?.plan?.limits?.messagesPerMonth; const used = plan.data?.usage?.messages || 0;
  const pct = lim > 0 ? Math.min(100, Math.round((used / lim) * 100)) : 0;
  return (
    <>
      <PageHeader title={`Hola, ${user.name?.split(' ')[0] || ''}`} subtitle="Así van tus bots este mes." actions={<Link to="/bots"><Button>Crear bot</Button></Link>} />
      <div className="grid gap-3 md:grid-cols-3">
        <Stat label="Bots" value={bots.data?.length} sub={`Tu plan permite ${plan.data?.plan?.limits?.bots ?? '—'}`} />
        <div className="panel p-4"><p className="text-sm text-ink-soft">Mensajes procesados</p><p className="mt-1 text-2xl font-extrabold">{used.toLocaleString('es-ES')}<span className="text-sm font-semibold text-ink-soft"> / {lim < 0 ? '∞' : lim?.toLocaleString('es-ES')}</span></p>
          <div className="mt-2 h-1.5 rounded bg-mist"><div className={`h-1.5 rounded ${pct >= 80 ? 'bg-signal' : 'bg-tide'}`} style={{ width: `${pct}%` }} /></div></div>
        <Stat label="Plan" value={plan.data?.plan?.name} sub={<Link className="text-tide" to="/plans">Ver planes</Link>} />
      </div>
      <div className="mt-6">
        {bots.data?.length === 0 ? <Empty title="Aún no tienes bots" action={<Link to="/bots"><Button>Crear mi primer bot</Button></Link>}>Crea un bot en @BotFather, pega aquí su token y elige si piensa con Claude o con GPT.</Empty> : (
          <Section title="Tus bots">{bots.data?.map((b) => (
            <Link key={b._id} to={`/bots/${b._id}`} className="flex items-center justify-between border-b border-line py-3 last:border-0">
              <div><p className="font-semibold">{b.name}</p><p className="text-xs text-ink-soft">{b.telegram?.username ? `@${b.telegram.username}` : 'Sin conectar'} · {b.ai.provider === 'openai' ? 'GPT' : 'Claude'}</p></div>
              <div className="text-right text-xs text-ink-soft"><Badge tone={b.status === 'active' ? 'ok' : b.status === 'error' ? 'bad' : 'neutral'}>{{ active: 'Activo', paused: 'En pausa', error: 'Con error' }[b.status]}</Badge><p className="mt-1">{b.stats.messagesIn} recibidos</p></div>
            </Link>))}</Section>
        )}
      </div>
    </>
  );
}
export default function Dashboard() { const { user } = useAuth(); return isStaff(user) ? <StaffDashboard /> : <ClientDashboard />; }
