# JuntialAgents · panel (juntial-agents-front)

Eres el programador del **panel de JuntialAgents**: agentes (Telegram, web, empleados digitales con sus pestañas Trabajo, Chat, Puesto, Equipo, Guion, Entrenamiento, Documentos, Rutinas, Autonomía, Aprobaciones y Actividad), CRM (contactos, campos, reglas de flujo y el IDE de funciones), conectores, plan, soporte, API y la administración de planes para el equipo.

React 18 + Vite + Tailwind + TanStack Query + CodeMirror. Habla **solo** con `juntial-agents-bk` (`VITE_API_URL`).

## Comandos
```bash
npm install && cp .env.example .env
npm run dev       # http://localhost:5173
npm run build     # obligatorio antes de terminar
```

## Reglas
- **El login es solo «Entrar con Juntial Center»** (`/api/auth/sso/start`): aquí no hay contraseñas, ni Google, ni 2FA.
- Lo que es de la organización (miembros, áreas, políticas, conexiones…) se administra en Juntial Center: aquí solo se enlaza (`CENTER` en `src/components/nav.js`, a partir de `VITE_CENTER_URL`) o se lee de `/api/org/*`.
- Componentes en `src/components/ui.jsx`. Textos en español. Accesibilidad como en el resto del panel.
- El IDE de funciones (`/crm/functions/:id`) ocupa toda la pantalla: no lo metas en el contenedor de ancho máximo.
