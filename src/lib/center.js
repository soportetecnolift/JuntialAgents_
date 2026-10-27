import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, refresh } from './api.js';
import { useAuth } from './auth.jsx';

/** Organizaciones y permisos (los da Juntial Center; JuntialAgents los sirve en /api/org). */
export const useCenter = () => useQuery({ queryKey: ['org-me'], queryFn: () => api.get('/org/me').then((r) => r.data), staleTime: 30000 });
export function useSwitchOrg() {
  const { accept } = useAuth(); const qc = useQueryClient();
  return async (orgId) => { await api.post('/auth/switch-org', { orgId }); accept(await refresh()); qc.clear(); window.location.assign('/'); };
}
export const isOrgAdmin = (c) => ['owner', 'admin'].includes(c?.membership?.orgRole);
