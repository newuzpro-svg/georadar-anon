import { db, findNearbyUsers, checkSpeed } from './db.js';

// Rate limiting map: userId -> { lastMessage: timestamp, warnings: number }
const rateLimits = new Map();
// Banned users with expiry
const bannedUsers = new Map();
// Global reports queue
const reports = [];

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
        console.log(`🔌 NEW CONNECTION: ${socket.id} (transport: ${socket.conn.transport.name})`);

        // Register / reconnect user
        socket.on('register', (data) => {
            const { userId, nickname, gender, photoUrl, latitude, longitude, photos } = data;
            currentUserId = userId;

            console.log(`👤 REGISTER: ${nickname} (${userId})`);

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

                if (latitude && longitude) {
                    db.prepare('UPDATE users SET latitude = ?, longitude = ?, last_seen = ? WHERE id = ?')
                        .run(latitude, longitude, Date.now(), userId);
                }
            } else {
                db.prepare(
                    'INSERT INTO users (id, nickname, gender, photo_url, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(userId, nickname, gender || 'not_selected', photoUrl || '', Date.now(), Date.now());

                if (latitude && longitude) {
                    db.prepare('UPDATE users SET latitude = ?, longitude = ?, last_seen = ? WHERE id = ?')
                        .run(latitude, longitude, Date.now(), userId);
                }
            }

            // Store photos directly on user object (in-memory)
            const userObj = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
            if (userObj && photos) {
                userObj.photos = photos;
            }

            socket.join(`user:${userId}`);
            socket.emit('registered', { success: true });
        });

        // Location update
        socket.on('location', (data) => {
            if (!currentUserId && data.userId) {
                // Recover session if possible
                const { userId, nickname, gender, photoUrl } = data;
                currentUserId = userId;

                const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
                if (existing) {
                    db.prepare(
                        'UPDATE users SET last_seen = ? WHERE id = ?'
                    ).run(Date.now(), userId);
                } else {
                    // Critical fallback if user records are lost or this is a first-time location-first hit
                    db.prepare(
                        'INSERT INTO users (id, nickname, gender, photo_url, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?)'
                    ).run(userId, nickname || 'RadarExplorer', gender || 'not_selected', photoUrl || '', Date.now(), Date.now());
                }
                socket.join(`user:${userId}`);
            }
            if (!currentUserId) return;

            const { latitude, longitude, radius } = data;

            // Speed check temporarily disabled to prevent false positive bans
            /*const speedResult = checkSpeed(currentUserId, latitude, longitude);
            if (speedResult.suspicious) {
                // Ban for 5 minutes
                bannedUsers.set(currentUserId, Date.now() + 5 * 60 * 1000);
                socket.emit('banned', {
                    reason: 'Подозрительная скорость перемещения',
                    speedKmh: speedResult.speedKmh,
                    until: Date.now() + 5 * 60 * 1000,
                });
                return;
            }*/

            // Update location
            db.prepare(
                'UPDATE users SET latitude = ?, longitude = ?, last_seen = ? WHERE id = ?'
            ).run(latitude, longitude, Date.now(), currentUserId);

            // Store radius for server-side broadcast
            const uObj = db.prepare('SELECT id FROM users WHERE id = ?').get(currentUserId);
            if (uObj) uObj._lastRadius = radius || 100;

            // Find nearby users
            const nearbyUsers = findNearbyUsers(
                currentUserId,
                latitude,
                longitude,
                radius || 100
            );

            // Debug logging (enabled temporarily for diagnosis)
            console.log(`📍 LOCATION: [${currentUserId?.substring(0, 8)}] at ${latitude?.toFixed(4)},${longitude?.toFixed(4)} (r:${radius}m found:${nearbyUsers.length})`);


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
            const { nickname, gender, photoUrl, photos } = data;

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

            // Store photos directly on user object
            const userObj = db.prepare('SELECT id FROM users WHERE id = ?').get(currentUserId);
            if (userObj && photos !== undefined) {
                userObj.photos = photos;
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

            const sender = db.prepare('SELECT nickname FROM users WHERE id = ?').get(currentUserId);
            const target = db.prepare('SELECT nickname FROM users WHERE id = ?').get(reportedId);

            const report = {
                id: Date.now(),
                senderId: currentUserId,
                senderName: sender?.nickname || 'Anon',
                reportedId,
                reportedName: target?.nickname || 'Anon',
                reason,
                timestamp: Date.now()
            };

            reports.push(report);
            console.log(`⚠️ REPORT: ${report.senderName} -> ${report.reportedName}. Reason: ${reason}`);

            // Notify all admins currently online
            io.sockets.sockets.forEach(s => {
                if (s.isAdmin) s.emit('adminNewReport', report);
            });

            socket.emit('reportSent', { success: true });
        });

        // Admin login
        socket.on('adminAuth', (data) => {
            if (data.pin === '2061') {
                socket.isAdmin = true;
                socket.emit('adminAuthSuccess');
                console.log('💎 ADMIN LOGGED IN');
            } else {
                socket.emit('error', { message: 'Xato kod!' });
            }
        });

        socket.on('adminGetUsers', () => {
            if (!socket.isAdmin) return;
            const users = db.prepare('SELECT id, nickname, gender, last_seen, is_invisible FROM users ORDER BY last_seen DESC LIMIT 100').all();
            socket.emit('adminUserList', users);
        });

        socket.on('adminBanUser', (data) => {
            if (!socket.isAdmin) return;
            const { userId, minutes } = data;
            const expiry = Date.now() + minutes * 60 * 1000;
            bannedUsers.set(userId, expiry);
            io.to(`user:${userId}`).emit('banned', { until: expiry, reason: 'Admin tomonidan cheklandi' });
            console.log(`🚫 BANNED: ${userId} for ${minutes} min`);
        });

        socket.on('adminBroadcast', (data) => {
            if (!socket.isAdmin) return;
            io.emit('newMessage', {
                id: Date.now(),
                senderId: 'SYSTEM',
                nickname: 'ADMIN 📢',
                message: data.message,
                createdAt: Date.now(),
                isBroadcast: true
            });
        });

        socket.on('adminGetReports', () => {
            if (!socket.isAdmin) return;
            socket.emit('adminReportList', reports);
        });

        socket.on('adminDismissReport', (data) => {
            if (!socket.isAdmin) return;
            const index = reports.findIndex(r => r.id === data.reportId);
            if (index !== -1) reports.splice(index, 1);
            socket.emit('adminReportList', reports);
        });

        // Disconnect
        socket.on('disconnect', () => {
            if (currentUserId) {
                db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), currentUserId);
                connectedSockets.delete(socket.id);
            }
        });

        // Track this socket for server-side push
        if (!socket._tracked) {
            socket._tracked = true;
            socket._getUserId = () => currentUserId;
        }
    });

    // --- SERVER-SIDE PUSH: broadcast nearby users to ALL connected sockets every 5s ---
    const connectedSockets = io.sockets;
    setInterval(() => {
        const sockets = connectedSockets.sockets;
        if (!sockets || sockets.size === 0) return;

        for (const [socketId, sock] of sockets) {
            const userId = sock._getUserId?.();
            if (!userId) continue;

            const userObj = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
            if (!userObj || !userObj.latitude || !userObj.longitude) continue;

            const nearby = findNearbyUsers(
                userId,
                userObj.latitude,
                userObj.longitude,
                userObj._lastRadius || 100
            );

            sock.emit('nearby', nearby);
        }
    }, 5000);
}
