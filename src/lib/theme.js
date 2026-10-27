// Tema: system | light | dark (persistido). El script inline de index.html evita el parpadeo.
export const getTheme = () => { try { return localStorage.getItem('ja-theme') || 'system'; } catch { return 'system'; } };
export function setTheme(t) {
  try { localStorage.setItem('ja-theme', t); } catch { /* modo privado */ }
  if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
}
export const haptic = () => { try { navigator.vibrate?.(8); } catch { /* sin soporte */ } };
export const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
