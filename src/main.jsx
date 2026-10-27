import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { AuthProvider, useAuth, isStaff } from './lib/auth.jsx';
import { ToastProvider } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BotsList from './pages/bots/BotsList.jsx';
import BotDetail from './pages/bots/BotDetail.jsx';
import Connectors from './pages/Connectors.jsx';
import Plans from './pages/Plans.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Support from './pages/support/Support.jsx';
import TicketView from './pages/support/TicketView.jsx';
import AdminTenants from './pages/admin/AdminTenants.jsx';
import AdminPlans from './pages/admin/AdminPlans.jsx';
import AdminAudit from './pages/admin/AdminAudit.jsx';
import Developers from './pages/Developers.jsx';
import Contacts from './pages/crm/Contacts.jsx';
import { useLocation } from 'react-router-dom';
import Fields from './pages/crm/Fields.jsx';
import Workflows from './pages/crm/Workflows.jsx';
import Functions from './pages/crm/Functions.jsx';
// El editor de código y el de reglas se cargan solo cuando se usan (el resto del panel sigue ligero)
const WorkflowEditor = lazy(() => import('./pages/crm/WorkflowEditor.jsx'));
const FunctionEditor = lazy(() => import('./pages/crm/FunctionEditor.jsx'));
const Lazy = ({ C }) => <Suspense fallback={<p className="text-ink-soft">Cargando…</p>}><C /></Suspense>;

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: false } } });

function Guard({ children, staff }) {
  const { user, loading } = useAuth(); const loc = useLocation();
  if (loading) return <div className="grid min-h-[100dvh] place-items-center"><img src="/icon.svg" alt="Cargando" className="h-12 w-12 animate-pulse" /></div>;
  // Cada perfil vuelve a SU pantalla de acceso cuando caduca la sesión
  if (!user) { if (loc.pathname !== '/') sessionStorage.setItem('ja-next', loc.pathname + loc.search); return <Navigate to="/login" replace />; }
  if (staff && !isStaff(user)) return <Navigate to="/" replace />;
  return children;
}

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <QueryClientProvider client={qc}><ToastProvider><AuthProvider><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Guard><Layout /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="bots" element={<BotsList />} />
            <Route path="bots/:id" element={<BotDetail />} />
            <Route path="connectors" element={<Connectors />} />
            <Route path="plans" element={<Plans />} />
            <Route path="support" element={<Support />} />
            <Route path="support/:id" element={<TicketView />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
            <Route path="developers" element={<Developers />} />
            <Route path="crm/contacts" element={<Contacts />} />
            <Route path="crm/fields" element={<Fields />} />
            <Route path="crm/workflows" element={<Workflows />} />
            <Route path="crm/workflows/:id" element={<Lazy C={WorkflowEditor} />} />
            <Route path="crm/functions" element={<Functions />} />
            <Route path="crm/functions/:id" element={<Lazy C={FunctionEditor} />} />
            <Route path="admin/tenants" element={<Guard staff><AdminTenants /></Guard>} />
            <Route path="admin/plans" element={<Guard staff><AdminPlans /></Guard>} />
            <Route path="admin/audit" element={<Guard staff><AdminAudit /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter></AuthProvider></ToastProvider></QueryClientProvider>
  </React.StrictMode>,
);
