import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
    if (!socket) {
        // Determine the server URL:
        // Use the Render backend directly so no Netlify env vars are needed
        const serverUrl = 'https://georadar-anon.onrender.com';

        console.log(`🔌 Connecting to socket server at: ${serverUrl}`);

        socket = io(serverUrl, {
            transports: ['polling', 'websocket'], // Try polling first for faster initial handshake in some mobile browsers
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 20,
            rememberUpgrade: true,
            timeout: 20000,
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
