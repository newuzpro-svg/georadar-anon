// Anonymous identity management — no registration needed

const STORAGE_KEY = 'georadar_user';

const prefixes = [
    'Ghost', 'Radar', 'Shadow', 'Cyber', 'Neon', 'Phantom', 'Stealth',
    'Drift', 'Echo', 'Pulse', 'Vortex', 'Spark', 'Glitch', 'Nova',
    'Zen', 'Storm', 'Frost', 'Blaze', 'Wolf', 'Fox', 'Hawk', 'Lynx',
    'Cobra', 'Raven', 'Onyx', 'Volt', 'Flux', 'Nexus', 'Apex', 'Byte'
];

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function generateNickname() {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    return `${prefix}${number}`;
}

export function getOrCreateUser() {
    // Try localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const user = JSON.parse(stored);
            if (user.id && user.nickname) {
                // Also set cookie
                setCookie(user);
                return user;
            }
        } catch (e) {
            // corrupted, create new
        }
    }

    // Try cookie
    const cookieUser = getCookie();
    if (cookieUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cookieUser));
        return cookieUser;
    }

    // Create new anonymous user
    const newUser = {
        id: generateId(),
        nickname: generateNickname(),
        gender: 'not_selected',
        photoUrl: '',
        theme: 'violet',
        createdAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setCookie(newUser);
    return newUser;
}

export function updateUser(updates) {
    const user = getOrCreateUser();
    const updated = { ...user, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCookie(updated);
    return updated;
}

function setCookie(user) {
    const data = encodeURIComponent(JSON.stringify(user));
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${STORAGE_KEY}=${data}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie() {
    const match = document.cookie.match(new RegExp(`${STORAGE_KEY}=([^;]+)`));
    if (match) {
        try {
            return JSON.parse(decodeURIComponent(match[1]));
        } catch (e) {
            return null;
        }
    }
    return null;
}
