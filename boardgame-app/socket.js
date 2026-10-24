import { io } from 'socket.io-client';

// UPDATE THIS with your current IPv4 address from `ipconfig`
export const SERVER_URL = 'http://10.215.198.138:3000';

export const socket = io(SERVER_URL, {
  transports: ['websocket'], // Forces WebSocket for fast React Native connection
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});