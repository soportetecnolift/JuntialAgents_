import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Input, Textarea, Select, Toggle } from '../../components/ui.jsx';

export const useFields = () => useQuery({ queryKey: ['crm-fields'], queryFn: () => api.get('/crm/fields').then((r) => r.data) });
export const useMeta = () => useQuery({ queryKey: ['crm-meta'], queryFn: () => api.get('/crm/meta').then((r) => r.data), staleTime: Infinity });
export const TYPE_ES = { text: 'Texto', textarea: 'Texto largo', email: 'Email', phone: 'Teléfono', number: 'Número', currency: 'Moneda', boolean: 'Sí / No', date: 'Fecha', datetime: 'Fecha y hora', picklist: 'Lista de opciones', multiselect: 'Selección múltiple', url: 'URL' };
export const STATUS_TONE = { Nuevo: 'neutral', Contactado: 'warn', Cualificado: 'ok', Cliente: 'ok', Perdido: 'bad' };
export const fmtValue = (f, v) => {
  if (v == null || v === '') return '—';
  if (f?.type === 'boolean') return v ? 'Sí' : 'No';
  if (f?.type === 'date') return new Date(v).toLocaleDateString('es-ES');
  if (f?.type === 'datetime') return new Date(v).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  if (f?.type === 'currency') return Number(v).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
};
const toLocal = (v, withTime) => { if (!v) return ''; const d = new Date(v); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}${withTime ? `T${p(d.getHours())}:${p(d.getMinutes())}` : ''}`; };

/** Control de edición según el tipo de campo. */
export function FieldInput({ field: f, value, onChange }) {
  switch (f.type) {
    case 'textarea': return <Textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'boolean': return <Toggle checked={!!value} onChange={onChange} label={value ? 'Sí' : 'No'} />;
    case 'number': case 'currency': return <Input type="number" step="any" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'date': return <Input type="date" value={toLocal(value)} onChange={(e) => onChange(e.target.value || null)} />;
    case 'datetime': return <Input type="datetime-local" value={toLocal(value, true)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
    case 'picklist': return <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} options={[{ value: '', label: '—' }, ...(f.options || []).map((o) => ({ value: o, label: o }))]} />;
    case 'multiselect': return (
      <div className="flex flex-wrap gap-1.5">{(f.options || []).map((o) => { const on = (value || []).includes(o); return <button type="button" key={o} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...(value || []), o])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-tide bg-tide text-white' : 'border-line'}`}>{o}</button>; })}</div>);
    default: return <Input type={f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : f.type === 'phone' ? 'tel' : 'text'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

/** Chips de variables para plantillas {{record.campo}} */
export function VarChips({ fields, onPick, extra = [] }) {
  const vars = [...(fields || []).map((f) => [`{{record.${f.key}}}`, f.label]), ['{{record.url}}', 'Enlace a la ficha'], ['{{rule.name}}', 'Nombre de la regla'], ['{{now}}', 'Fecha y hora'], ...extra];
  return (
    <div className="scroll-x mt-1.5 gap-1.5">{vars.map(([v, l]) => <button type="button" key={v} title={v} onClick={() => onPick(v)} className="shrink-0 rounded-md bg-mist px-2 py-1 font-mono text-[11px] text-ink-soft hover:bg-tide-tint hover:text-tide-dark">{l}</button>)}</div>
  );
}
