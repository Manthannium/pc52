import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// export const socket = io(SERVER_URL, {
//   autoConnect: true,
//   transports: ['websocket', 'polling'],
// });

export const socket = io(
    SERVER_URL,
    {
        autoConnect: true,
        reconnection: true,
        timeout: 10000,
    }
);

// Works with server handlers that acknowledge through Socket.IO's callback.
export function emitWithAck(eventName, payload = {}) {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ success: false, error: 'Not connected to the server. Check that it is running.' });
      return;
    }

    socket.timeout(8000).emit(eventName, payload, (timeoutError, response) => {
      if (timeoutError) {
        resolve({ success: false, error: 'The server did not respond. Please try again.' });
      } else {
        resolve(response ?? { success: true });
      }
    });
  });
}

socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection failed:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});
