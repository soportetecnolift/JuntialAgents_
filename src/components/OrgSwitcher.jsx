import { useState } from 'react';
import { ChevronsUpDown, Check, Plus, Building2 } from 'lucide-react';
import { useCenter, useSwitchOrg } from '../lib/center.js';
import { api, errMsg } from '../lib/api.js';
import { Modal, Field, Input, Button, useToast } from './ui.jsx';

/** Selector de organización (Juntial Center), como en Zoho One. */
export default function OrgSwitcher({ compact }) {
  const { data } = useCenter(); const sw = useSwitchOrg(); const toast = useToast();
  const [open, setOpen] = useState(false); const [create, setCreate] = useState(false); const [name, setName] = useState('');
  const cur = data?.organizations?.find((o) => o.active);
  if (!data) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left text-white hover:bg-white/10">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/15 text-xs font-bold">{cur?.logo ? <img src={cur.logo} alt="" className="h-7 w-7 rounded-md object-cover" /> : (cur?.name || '?').slice(0, 2).toUpperCase()}</span>
        {!compact && <><span className="min-w-0 flex-1"><b className="block truncate text-sm">{cur?.name || 'Organización'}</b><span className="block text-[11px] text-white/60">Juntial Center · {({ owner: 'Propietario', admin: 'Administrador', member: 'Miembro' })[cur?.role] || ''}</span></span><ChevronsUpDown size={14} className="text-white/60" /></>}
      </button>
      {open && <div role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 min-w-[230px] overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-xl">
        <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Tus organizaciones</p>
        {data.organizations.map((o) => <button key={o._id} role="option" aria-selected={o.active} onClick={() => (o.active ? setOpen(false) : sw(o._id))} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-mist"><Building2 size={15} className="text-ink-soft" /><span className="flex-1 truncate">{o.name}</span>{o.active && <Check size={15} className="text-tide" />}</button>)}
        <a href={data.centerUrl} className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-semibold text-tide hover:bg-mist"><Plus size={15} />Gestionar en Juntial Center</a>
      </div>}
    </div>
  );
}
