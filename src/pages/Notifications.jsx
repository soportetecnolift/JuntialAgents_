import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { PageHeader, Button, Empty, fmtDate } from '../components/ui.jsx';

const DOT = { success: 'bg-tide', info: 'bg-harbor-300', warning: 'bg-signal', error: 'bg-flare' };
export default function Notifications() {
  const { data, refetch } = useQuery({ queryKey: ['notifications', 'list'], queryFn: () => api.get('/notifications?limit=100').then((r) => r.data) });
  return (
    <>
      <PageHeader title="Avisos" actions={data?.unread > 0 && <Button variant="secondary" onClick={async () => { await api.post('/notifications/read-all'); refetch(); }}>Marcar todo como leído</Button>} />
      {data && !data.items.length ? <Empty title="Sin avisos">Aquí verás registros, conexiones de bots, límites del plan y respuestas de soporte.</Empty> : (
        <div className="panel divide-y divide-line">{data?.items.map((n) => (
          <div key={n._id} className={`flex gap-3 px-4 py-3 ${n.readAt ? 'opacity-70' : ''}`} onMouseEnter={() => !n.readAt && api.post(`/notifications/${n._id}/read`)}>
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT[n.severity]}`} />
            <div className="flex-1"><p className="font-semibold">{n.title}</p><p className="text-sm text-ink-soft">{n.body}</p></div>
            <div className="text-right text-xs text-ink-soft">{fmtDate(n.createdAt)}{n.link && <Link className="mt-1 block font-semibold text-tide" to={new URL(n.link).pathname + new URL(n.link).search}>Ver</Link>}</div>
          </div>))}</div>
      )}
    </>
  );
}
