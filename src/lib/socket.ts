// Socket.io client singleton for server-side use (API routes can emit events)
import { io as socketioClient, Socket } from 'socket.io-client';

let _io: Socket | null = null;

function getSocket(): Socket {
  if (!_io || !_io.connected) {
    _io = socketioClient('/', {
      transports: ['websocket'],
      auth: { userId: 'server-api', userRole: 'server', userName: 'API Server' },
      query: { XTransformPort: '3003' },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    _io.on('connect', () => {
      console.log('[SOCKET-CLIENT] Connected to chat service');
    });

    _io.on('disconnect', () => {
      console.log('[SOCKET-CLIENT] Disconnected from chat service');
    });

    _io.on('connect_error', (err) => {
      console.error('[SOCKET-CLIENT] Connection error:', err.message);
    });
  }
  return _io;
}

// Export a proxy that auto-connects
export const io = new Proxy({} as Socket, {
  get(_target, prop) {
    const socket = getSocket();
    const value = (socket as any)[prop];
    if (typeof value === 'function') {
      return value.bind(socket);
    }
    return value;
  },
});
