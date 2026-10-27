import { Orbit, Inbox, ShieldCheck, LayoutDashboard, Bot, Plug, CreditCard, LifeBuoy, Code2, Users, Building2, Layers, ScrollText, Bell, Settings, Contact, Workflow, Braces, Columns3 } from 'lucide-react';

/** Dirección de Juntial Center (VITE_CENTER_URL). */
export const CENTER = (import.meta.env.VITE_CENTER_URL || 'http://localhost:5174').replace(/\/$/, '');

/** Navegación por rol. `primary` = va en la barra inferior móvil (máx. 4 + "Más"). */
export function navFor(user) {
  const admin = ['admin', 'superadmin'].includes(user.role);
  if (user.role === 'client') return [
    { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true, primary: true },
    { to: '/bots', label: 'Agentes', icon: Bot, primary: true },
    // Juntial Center vive en su propia dirección (organización, equipo, aprobaciones con política…)
    { href: CENTER, label: 'Juntial Center', icon: Orbit, group: 'Juntial Center' },
    { href: `${CENTER}/center/approvals`, label: 'Aprobaciones', icon: Inbox, group: 'Juntial Center' },
    { href: `${CENTER}/center/policies`, label: 'Políticas', icon: ShieldCheck, group: 'Juntial Center' },
    { to: '/crm/contacts', label: 'Contactos', icon: Contact, primary: true, group: 'CRM' },
    { to: '/crm/workflows', label: 'Reglas de flujo', icon: Workflow, group: 'CRM' },
    { to: '/crm/functions', label: 'Funciones', icon: Braces, group: 'CRM' },
    { to: '/crm/fields', label: 'Campos', icon: Columns3, group: 'CRM' },
    { to: '/connectors', label: 'Conectores', icon: Plug },
    { to: '/support', label: 'Soporte', icon: LifeBuoy, primary: true },
    { to: '/plans', label: 'Plan y uso', icon: CreditCard },
    { to: '/developers', label: 'API', icon: Code2 },
  ];
  return [
    { to: '/', label: 'Panel', icon: LayoutDashboard, end: true, primary: true },
    { to: '/support', label: 'Soporte', icon: LifeBuoy, primary: true },
    { to: '/admin/tenants', label: 'Clientes', icon: Building2, primary: true },
    { href: `${CENTER}/admin/users`, label: 'Usuarios (Center)', icon: Users },
    ...(admin ? [{ to: '/admin/plans', label: 'Planes', icon: Layers }, { to: '/admin/audit', label: 'Auditoría', icon: ScrollText }, { to: '/developers', label: 'API admin', icon: Code2 }] : []),
  ];
}
export const utilNav = [{ to: '/notifications', label: 'Avisos', icon: Bell }, { to: '/settings', label: 'Ajustes', icon: Settings }];
