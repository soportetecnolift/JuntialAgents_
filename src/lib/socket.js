import { io } from 'socket.io-client';
import { API_URL, getAccessToken, refresh } from './api.js';
let socket;
export function getSocket() {
  if (socket) return socket;
  socket = io(API_URL, { path: '/ws', auth: (cb) => cb({ token: getAccessToken() }), transports: ['websocket'] });
  socket.on('connect_error', async (e) => { if (e.message === 'unauthorized') { await refresh().catch(() => {}); socket.connect(); } });
  return socket;
}
export const closeSocket = () => { socket?.disconnect(); socket = null; };
