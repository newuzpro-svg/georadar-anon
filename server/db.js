// In-memory storage for MVP to avoid native compilation issues with SQLite
export const users = new Map();
export const messages = [];

export function initDB() {
    console.log('📦 In-memory storage initialized');
}

export const db = {
    prepare: (query) => {
        // Very basic mock for the queries used in socket.js
        if (query.includes('DELETE FROM messages')) {
            return {
                run: (cutoff) => {
                    const initialLen = messages.length;
                    for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].created_at < cutoff) messages.splice(i, 1);
                    }
                }
            };
        }
        if (query.includes('DELETE FROM users')) {
            return {
                run: (cutoff) => {
                    for (const [id, user] of users.entries()) {
                        if (user.last_seen < cutoff) users.delete(id);
                    }
                }
            };
        }
        if (query.includes('SELECT id FROM users WHERE id = ?')) {
            return { get: (id) => users.get(id) };
        }
        if (query.includes('INSERT INTO users')) {
            return {
                run: (id, nickname, gender, photo_url, last_seen, created_at) => {
                    users.set(id, { id, nickname, gender, photo_url, last_seen, created_at, blocked_users: '[]', is_invisible: 0 });
                }
            };
        }
        if (query.includes('UPDATE users SET nickname = ?, gender = ?, photo_url = ?, last_seen = ? WHERE id = ?')) {
            return {
                run: (nickname, gender, photo_url, last_seen, id) => {
                    const user = users.get(id);
                    if (user) {
                        user.nickname = nickname;
                        user.gender = gender;
                        user.photo_url = photo_url;
                        user.last_seen = last_seen;
                    }
                }
            };
        }
        if (query.includes('UPDATE users SET latitude = ?, longitude = ?, last_seen = ? WHERE id = ?')) {
            return {
                run: (lat, lon, last_seen, id) => {
                    const user = users.get(id);
                    if (user) {
                        user.latitude = lat;
                        user.longitude = lon;
                        user.last_seen = last_seen;
                    }
                }
            };
        }
        if (query.includes('SELECT id, nickname, gender, photo_url, latitude, longitude, last_seen, is_invisible FROM users')) {
            return {
                all: (id, cutoff, latMin, latMax, lonMin, lonMax) => {
                    return Array.from(users.values()).filter(u =>
                        u.id !== id &&
                        u.last_seen > cutoff &&
                        u.is_invisible === 0 &&
                        u.latitude >= latMin && u.latitude <= latMax &&
                        u.longitude >= lonMin && u.longitude <= lonMax
                    );
                }
            };
        }
        if (query.includes('INSERT INTO messages')) {
            return {
                run: (sender_id, receiver_id, message, created_at) => {
                    const id = messages.length + 1;
                    messages.push({ id, sender_id, receiver_id, message, created_at });
                    return { lastInsertRowid: id };
                }
            };
        }
        if (query.includes('SELECT blocked_users FROM users WHERE id = ?')) {
            return { get: (id) => users.get(id) };
        }
        if (query.includes('SELECT id, sender_id as senderId, receiver_id as receiverId, message, created_at as createdAt FROM messages')) {
            return {
                all: (cutoff, uid1, uid2, uid2_alt, uid1_alt) => {
                    return messages
                        .filter(m => m.created_at > cutoff &&
                            ((m.sender_id === uid1 && m.receiver_id === uid2) || (m.sender_id === uid2 && m.receiver_id === uid1)))
                        .map(m => ({ id: m.id, senderId: m.sender_id, receiverId: m.receiver_id, message: m.message, createdAt: m.created_at }));
                }
            };
        }
        if (query.includes('UPDATE users SET blocked_users = ? WHERE id = ?')) {
            return {
                run: (blocked, id) => {
                    const user = users.get(id);
                    if (user) user.blocked_users = blocked;
                }
            };
        }
        if (query.includes('UPDATE users SET is_invisible = ? WHERE id = ?')) {
            return {
                run: (invisible, id) => {
                    const user = users.get(id);
                    if (user) user.is_invisible = invisible;
                }
            };
        }
        if (query.includes('SELECT id, nickname, gender, photo_url, last_seen, created_at FROM users WHERE id = ?')) {
            return { get: (id) => users.get(id) };
        }

        // Generic handlers for dynamic updates in socket.js
        if (query.startsWith('UPDATE users SET')) {
            return {
                run: (...args) => {
                    const id = args[args.length - 1];
                    const user = users.get(id);
                    if (user) {
                        // This is a bit hacky but works for the updateProfile logic
                        if (query.includes('nickname = ?')) user.nickname = args[0];
                        if (query.includes('gender = ?')) user.gender = args[query.includes('nickname') ? 1 : 0];
                    }
                }
            };
        }

        return { run: () => { }, get: () => { }, all: () => [] };
    }
};

export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function findNearbyUsers(userId, lat, lon, radiusMeters = 100) {
    const now = Date.now();
    const cutoff = now - 30000;
    const delta = 0.002;

    const nearby = Array.from(users.values()).filter(u =>
        u.id !== userId &&
        u.last_seen > cutoff &&
        u.is_invisible === 0 &&
        u.latitude >= lat - delta && u.latitude <= lat + delta &&
        u.longitude >= lon - delta && u.longitude <= lon + delta
    );

    return nearby
        .map((u) => ({
            ...u,
            distance: Math.round(haversineDistance(lat, lon, u.latitude, u.longitude)),
        }))
        .filter((u) => u.distance <= radiusMeters)
        .sort((a, b) => a.distance - b.distance);
}

const lastPositions = new Map();
export function checkSpeed(userId, lat, lon) {
    const now = Date.now();
    const last = lastPositions.get(userId);
    if (last) {
        const dist = haversineDistance(last.lat, last.lon, lat, lon);
        const timeDiff = (now - last.time) / 1000;
        if (timeDiff > 0) {
            const speedKmh = (dist / timeDiff) * 3.6;
            if (speedKmh > 200) return { suspicious: true, speedKmh: Math.round(speedKmh) };
        }
    }
    lastPositions.set(userId, { lat, lon, time: now });
    return { suspicious: false, speedKmh: 0 };
}
