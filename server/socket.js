import { db, findNearbyUsers, checkSpeed } from './db.js';

// Rate limiting map: userId -> { lastMessage: timestamp, warnings: number }
const rateLimits = new Map();
// Banned users with expiry
const bannedUsers = new Map();

// Simple profanity filter (expandable)
const badWords = ['блять', 'сука', 'пиздец', 'хуй', 'ебать', 'fuck', 'shit', 'bitch', 'ass'];
function filterMessage(text) {
    let filtered = text;
    for (const word of badWords) {
        const regex = new RegExp(word, 'gi');
        filtered = filtered.replace(regex, '***');
    }
    return filtered;
}

export function setupSocket(io) {
    io.on('connection', (socket) => {
        let currentUserId = null;

        // Register / reconnect user
        socket.on('register', (data) => {
            const { userId, nickname, gender, photoUrl } = data;
            currentUserId = userId;

            // Check if banned
            const ban = bannedUsers.get(userId);
            if (ban && ban > Date.now()) {
                socket.emit('banned', { until: ban });
                return;
            }

            // Upsert user
            const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
            if (existing) {
                db.prepare(
                    'UPDATE users SET nickname = ?, gender = ?, photo_url = ?, last_seen = ? WHERE id = ?'
                ).run(nickname, gender || 'not_selected', photoUrl || '', Date.now(), userId);
            } else {
                db.prepare(
                    'INSERT INTO users (id, nickname, gender, photo_url, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(userId, nickname, gender || 'not_selected', photoUrl || '', Date.now(), Date.now());
            }

            socket.join(`user:${userId}`);
            socket.emit('registered', { success: true });
        });

        // Location update
        socket.on('location', (data) => {
            if (!currentUserId) return;

            const { latitude, longitude, radius } = data;

            // Speed check
            const speedResult = checkSpeed(currentUserId, latitude, longitude);
            if (speedResult.suspicious) {
                // Ban for 5 minutes
                bannedUsers.set(currentUserId, Date.now() + 5 * 60 * 1000);
                socket.emit('banned', {
                    reason: 'Подозрительная скорость перемещения',
                    speedKmh: speedResult.speedKmh,
                    until: Date.now() + 5 * 60 * 1000,
                });
                return;
            }

            // Update location
            db.prepare(
                'UPDATE users SET latitude = ?, longitude = ?, last_seen = ? WHERE id = ?'
            ).run(latitude, longitude, Date.now(), currentUserId);

            // Find nearby users
            const nearbyUsers = findNearbyUsers(
                currentUserId,
                latitude,
                longitude,
                radius || 100
            );

            socket.emit('nearby', nearbyUsers);
        });

        // Send message
        socket.on('sendMessage', (data) => {
            if (!currentUserId) return;

            const { receiverId, message } = data;
            if (!receiverId || !message || message.trim().length === 0) return;
            if (message.length > 500) {
                socket.emit('error', { message: 'Сообщение слишком длинное (макс. 500 символов)' });
                return;
            }

            // Rate limit: 1 message per 3 seconds
            const now = Date.now();
            const limit = rateLimits.get(currentUserId);
            if (limit && now - limit.lastMessage < 3000) {
                socket.emit('error', { message: 'Подождите 3 секунды между сообщениями' });
                return;
            }
            rateLimits.set(currentUserId, { lastMessage: now });

            // Check if receiver has blocked sender
            const receiver = db.prepare('SELECT blocked_users FROM users WHERE id = ?').get(receiverId);
            if (receiver) {
                const blocked = JSON.parse(receiver.blocked_users || '[]');
                if (blocked.includes(currentUserId)) {
                    socket.emit('error', { message: 'Невозможно отправить сообщение' });
                    return;
                }
            }

            // Check proximity
            const sender = db.prepare('SELECT latitude, longitude FROM users WHERE id = ?').get(currentUserId);
            const recv = db.prepare('SELECT latitude, longitude, last_seen FROM users WHERE id = ?').get(receiverId);
            if (!sender || !recv) return;

            // Filter message
            const filteredMsg = filterMessage(message.trim());

            // Save message
            const result = db.prepare(
                'INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES (?, ?, ?, ?)'
            ).run(currentUserId, receiverId, filteredMsg, now);

            const msgData = {
                id: result.lastInsertRowid,
                senderId: currentUserId,
                receiverId,
                message: filteredMsg,
                createdAt: now,
            };

            // Send to sender
            socket.emit('newMessage', msgData);
            // Send to receiver
            io.to(`user:${receiverId}`).emit('newMessage', msgData);
        });

        // Get chat history
        socket.on('getMessages', (data) => {
            if (!currentUserId) return;
            const { otherUserId } = data;
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;

            const messages = db.prepare(
                `SELECT id, sender_id as senderId, receiver_id as receiverId, message, created_at as createdAt
         FROM messages
         WHERE created_at > ?
           AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         ORDER BY created_at ASC
         LIMIT 200`
            ).all(cutoff, currentUserId, otherUserId, otherUserId, currentUserId);

            socket.emit('messageHistory', { otherUserId, messages });
        });

        // Block user
        socket.on('blockUser', (data) => {
            if (!currentUserId) return;
            const { blockedId } = data;

            const user = db.prepare('SELECT blocked_users FROM users WHERE id = ?').get(currentUserId);
            if (user) {
                const blocked = JSON.parse(user.blocked_users || '[]');
                if (!blocked.includes(blockedId)) {
                    blocked.push(blockedId);
                    db.prepare('UPDATE users SET blocked_users = ? WHERE id = ?').run(
                        JSON.stringify(blocked),
                        currentUserId
                    );
                }
            }
            socket.emit('userBlocked', { blockedId });
        });

        // Update profile
        socket.on('updateProfile', (data) => {
            if (!currentUserId) return;
            const { nickname, gender, photoUrl } = data;

            if (nickname && nickname.length > 20) {
                socket.emit('error', { message: 'Никнейм слишком длинный' });
                return;
            }

            const updates = [];
            const values = [];
            if (nickname) { updates.push('nickname = ?'); values.push(nickname); }
            if (gender) { updates.push('gender = ?'); values.push(gender); }
            if (photoUrl !== undefined) { updates.push('photo_url = ?'); values.push(photoUrl); }

            if (updates.length > 0) {
                values.push(currentUserId);
                db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            }

            socket.emit('profileUpdated', { success: true });
        });

        // Toggle invisible mode
        socket.on('toggleInvisible', (data) => {
            if (!currentUserId) return;
            const { invisible } = data;
            db.prepare('UPDATE users SET is_invisible = ? WHERE id = ?').run(invisible ? 1 : 0, currentUserId);
            socket.emit('invisibleToggled', { invisible });
        });

        // Report user
        socket.on('reportUser', (data) => {
            if (!currentUserId) return;
            const { reportedId, reason } = data;
            console.log(`⚠️ REPORT: User ${currentUserId} reported ${reportedId}. Reason: ${reason}`);
            socket.emit('reportSent', { success: true });
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (currentUserId) {
                db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), currentUserId);
            }
        });
    });
}
