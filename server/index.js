import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initDB, db } from './db.js';
import { setupSocket } from './socket.js';
import { apiRoutes } from './routes.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true, // Compatibility with older Socket.IO clients
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json());

// Init database
initDB();

// API routes
app.use('/api', apiRoutes);

// Socket.io
setupSocket(io);

// Cleanup: delete messages older than 24 hours every 10 minutes
setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    db.prepare('DELETE FROM messages WHERE created_at < ?').run(cutoff);
    // Delete inactive users (24 hours)
    db.prepare('DELETE FROM users WHERE last_seen < ?').run(cutoff);
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 GeoRadar server running on port ${PORT}`);
});
