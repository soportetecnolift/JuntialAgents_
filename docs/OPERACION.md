# Operación del panel

- **Desarrollo:** `npm run dev` · **Compilar:** `npm run build` (genera `dist/`).
- **Producción:** se sirve `dist/` como web estática (Caddy en `juntial-local/Caddyfile`, Vercel, Netlify…). Todas las rutas tienen que devolver `index.html` (es una SPA).
- **Configuración:** variables `VITE_*` en `.env`. **Se leen al compilar**: si las cambias, vuelve a ejecutar `npm run build` (o a reiniciar `npm run dev`).
- **Publicar:** compilar la etiqueta `vX.Y.Z` y sustituir `dist/`. **Volver atrás:** compilar la etiqueta anterior.
- **Errores en el navegador:** DevTools → Consola y Red. Las respuestas de error del backend incluyen `requestId`, que se busca en los registros del backend.
