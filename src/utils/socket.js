import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
    if (!socket) {
        // Determine the server URL:
        // 1. Check if environment variable is set (Vite uses VITE_ prefix)
        // 2. Fallback to current origin (works during local dev with proxy)
        const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;

        console.log(`🔌 Connecting to socket server at: ${serverUrl}`);

        socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });

        socket.on('connect', () => {
            console.log('🔌 Connected to server');
        });

        socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
        });

        socket.on('connect_error', (err) => {
            console.log('🔌 Connection error:', err.message);
        });
    }
    return socket;
}
