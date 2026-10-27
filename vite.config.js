import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: {
    // El popup de «Iniciar sesión con Google» necesita poder comunicarse con la ventana
    headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' }, port: 5173 } });
