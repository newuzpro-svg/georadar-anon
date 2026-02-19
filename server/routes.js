import { Router } from 'express';
import { db } from './db.js';

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
