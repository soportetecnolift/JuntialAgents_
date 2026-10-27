import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { api, errMsg } from '../lib/api.js';
import { PageHeader, Section, Button, Badge, useToast } from '../components/ui.jsx';

const fmt = (n) => (n < 0 ? 'Ilimitado' : Number(n).toLocaleString('es-ES'));

/** Barras de consumo por recurso, agrupadas (Agentes, Integraciones, CRM, Datos). */
export function UsageGrid({ resources = [] }) {
  const groups = resources.reduce((g, r) => { (g[r.group] ||= []).push(r); return g; }, {});
  return (
    <div className="grid gap-5 md:grid-cols-2">{Object.entries(groups).map(([g, list]) => (
      <div key={g}><p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{g}</p>
        <ul className="space-y-3">{list.map((r) => {
          const tone = r.unlimited ? 'bg-tide' : r.pct >= 100 ? 'bg-flare' : r.pct >= 80 ? 'bg-signal' : 'bg-tide';
          const right = r.kind === 'rate' || r.kind === 'retention' ? fmt(r.limit) : r.unlimited ? `${fmt(r.used)} · ilimitado` : `${fmt(r.used)} / ${fmt(r.limit)}`;
          return (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm"><span className="first-letter:uppercase">{r.label}{r.kind === 'monthly' && <span className="text-xs text-ink-soft"> · este mes</span>}</span><b className={r.pct >= 100 && !r.unlimited ? 'text-flare' : ''}>{right}</b></div>
              {r.kind === 'count' || r.kind === 'monthly' ? <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label={r.label}><div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${r.unlimited ? 4 : Math.max(r.used ? 3 : 0, r.pct)}%` }} /></div> : null}
              {r.pct >= 100 && !r.unlimited && <p className="mt-0.5 text-xs text-flare">Límite alcanzado</p>}
            </li>);
        })}</ul></div>))}</div>
  );
}

export default function Plans() {
  const toast = useToast();
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api.get('/plans').then((r) => r.data) });
  const me = useQuery({ queryKey: ['my-plan'], queryFn: () => api.get('/plans/me').then((r) => r.data) });
  const labels = useQuery({ queryKey: ['plan-limits'], queryFn: () => api.get('/plans/limits').then((r) => r.data), staleTime: Infinity });
  const current = me.data?.plan?._id;
  return (
    <>
      <PageHeader title="Plan y uso" subtitle={me.data ? `Plan ${me.data.plan?.name} · renueva el ${new Date(me.data.subscription?.currentPeriodEnd).toLocaleDateString('es-ES')}` : ''} />
      {me.data?.pendingRequest && <p className="mb-5 rounded-md bg-signal-tint px-4 py-2.5 text-sm text-signal">Tienes una solicitud de cambio de plan pendiente. Te avisaremos al aprobarla.</p>}
      <div className="mb-6"><Section title="Tu consumo" description="Lo que estás usando de cada recurso de tu plan.">{me.data && <UsageGrid resources={me.data.resources} />}</Section></div>
      <div className="grid gap-4 md:grid-cols-3">
        {(plans.data || []).map((p) => (
          <div key={p._id} className={`panel flex flex-col p-5 ${p._id === current ? 'border-tide ring-1 ring-tide' : ''}`}>
            <div className="flex items-center justify-between"><h2>{p.name}</h2>{p._id === current && <Badge tone="ok">Tu plan</Badge>}</div>
            <p className="mt-2 text-2xl font-extrabold">{p.priceMonthly ? `${p.priceMonthly} ${p.currency}` : 'Gratis'}<span className="text-sm font-semibold text-ink-soft">{p.priceMonthly ? ' / mes' : ''}</span></p>
            <dl className="mt-4 space-y-1 text-sm">{Object.entries(labels.data || {}).map(([k, m]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-ink-soft first-letter:uppercase">{m.label}</dt><dd className="font-semibold">{fmt(p.limits?.[k] ?? -1)}</dd></div>))}</dl>
            <ul className="mt-4 flex-1 space-y-1 text-sm">{p.features.map((x) => <li key={x} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-tide" />{x}</li>)}</ul>
            {p._id !== current && <Button className="mt-5" variant="secondary" disabled={!!me.data?.pendingRequest} onClick={async () => { try { await api.post('/plans/request', { planId: p._id }); toast('Solicitud enviada'); me.refetch(); } catch (e) { toast(errMsg(e), 'bad'); } }}>Solicitar {p.name}</Button>}
          </div>
        ))}
      </div>
    </>
  );
}
