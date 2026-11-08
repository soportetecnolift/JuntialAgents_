# Arquitectura del panel de JuntialAgents

Habla **solo** con `juntial-agents-bk` (`VITE_API_URL`). Lo que es de la organización se administra en Juntial Center (`VITE_CENTER_URL`): aquí solo se enlaza o se lee de `/api/org/*`.

## Piezas comunes
| Pieza | Dónde | Qué hace |
|---|---|---|
| Cliente HTTP | `src/lib/api.js` | Axios con `VITE_API_URL`. Añade el access token a cada petición; ante un 401 renueva la sesión **una sola vez** (`refresh()` compartido) y repite la petición. `errMsg()` convierte los errores en mensajes legibles. |
| Sesión | `src/lib/auth.jsx` | Contexto con el usuario. Al cargar intenta `POST /api/auth/refresh` (con cookie): si responde, hay sesión. El access token vive **solo en memoria** (nunca en `localStorage`). |
| Organización | `src/lib/center.js`, `components/OrgSwitcher.jsx` | Organización activa, permisos y cambio de organización. |
| Interfaz | `src/components/ui.jsx` | Botones, campos, tablas, modales, avisos… **Reutilízalos siempre.** |
| Estructura | `components/Layout.jsx`, `nav.js`, `CommandPalette.jsx` | Menú por rol (barra lateral en escritorio, barra inferior en móvil), paleta de comandos (Ctrl+K). |
| Tema | `src/lib/theme.js` | Claro y oscuro. |
| Datos | TanStack Query | Caché de las peticiones; se invalida tras cada cambio. |

**Stack:** React 18 · Vite · Tailwind · TanStack Query · React Router · lucide-react.

**Guardas de ruta:** sin sesión → `/login` (la ruta de origen se guarda en `sessionStorage['ja-next']` para volver después).

**Además:** CodeMirror + acorn (IDE de funciones), socket.io (avisos en tiempo real; `src/lib/socket.js`), `components/LogViewer.jsx` (registro de actividad).

## Login
Un solo botón, **«Entrar con Juntial Center»** → `VITE_API_URL/api/auth/sso/start`. El backend hace el resto y vuelve con la sesión (cookie `ja_rt`). Aquí no hay contraseñas, ni Google, ni 2FA.

## Páginas
| Ruta | Página |
|---|---|
| `/` | Resumen |
| `/bots`, `/bots/:id` | Agentes. El detalle tiene pestañas por tipo: Telegram y web (`WebTabs.jsx`), **empleado digital** (`WorkerTabs.jsx`: Trabajo, Chat, Puesto, Aprobaciones…; `WorkerTeam.jsx`: Equipo; `WorkerBlueprint.jsx`: Guion) |
| `/connectors` | Conectores MCP |
| `/crm/contacts`, `/fields`, `/workflows`, `/functions` | CRM, campos, reglas (editor visual `WorkflowEditor.jsx`) y funciones (**IDE a pantalla completa** `FunctionEditor.jsx`, carga diferida) |
| `/plans`, `/support`, `/developers` | Plan y consumo, soporte, API keys |
| `/admin/tenants`, `/plans`, `/audit` | Equipo de la plataforma: organizaciones (planes), planes, auditoría |
| `/notifications`, `/settings` | Avisos y ajustes (la seguridad de la cuenta, en Center) |

## Deuda conocida
- El paquete principal supera los 500 kB: falta dividir el código por rutas.
- El IDE de funciones es pesado (CodeMirror): ya se carga en diferido.
