import { Router } from 'express';
import { db, users } from './db.js';

export const apiRoutes = Router();

// Get user profile
apiRoutes.get('/user/:id', (req, res) => {
    const user = db.prepare(
        'SELECT id, nickname, gender, photo_url, last_seen, created_at FROM users WHERE id = ?'
    ).get(req.params.id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
});

// Health check
apiRoutes.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Debug: show all users in memory
apiRoutes.get('/debug/users', (req, res) => {
    const now = Date.now();
    const allUsers = Array.from(users.values()).map(u => ({
        id: u.id?.substring(0, 8) + '...',
        nickname: u.nickname,
        lat: u.latitude,
        lon: u.longitude,
        invisible: u.is_invisible,
        lastSeen: u.last_seen ? Math.round((now - u.last_seen) / 1000) + 's ago' : 'never',
        hasCoords: u.latitude !== null && u.latitude !== undefined
    }));
    res.json({ count: allUsers.length, users: allUsers });
});
