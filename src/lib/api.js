import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

export const api = axios.create({ baseURL: `${API_URL}/api`, withCredentials: true });
api.interceptors.request.use((cfg) => { if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`; return cfg; });

// Refresh single-flight: múltiples 401 simultáneos esperan una única renovación
let refreshing = null;
export function refresh() {
  refreshing ??= axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true })
    .then((r) => { setAccessToken(r.data.accessToken); return r.data; })
    .finally(() => { refreshing = null; });
  return refreshing;
}
api.interceptors.response.use((r) => r, async (err) => {
  const cfg = err.config;
  if (err.response?.status === 401 && !cfg._retry && !cfg.url.includes('/auth/')) {
    cfg._retry = true;
    try { await refresh(); return api(cfg); } catch { window.dispatchEvent(new Event('auth:expired')); }
  }
  return Promise.reject(err);
});
export const errMsg = (e) => e?.response?.data?.error?.message || e?.message || 'Error inesperado';
