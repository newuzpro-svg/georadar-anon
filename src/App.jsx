import { useState, useEffect, useCallback, useRef } from 'react';
import { getOrCreateUser, updateUser } from './utils/identity.js';
import { getSocket } from './utils/socket.js';
import LocationPermission from './components/LocationPermission.jsx';
import RadarView from './components/RadarView.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import ProfilePanel from './components/ProfilePanel.jsx';
import Header from './components/Header.jsx';
import BannedScreen from './components/BannedScreen.jsx';
import Toast from './components/Toast.jsx';
import { playNotificationSound } from './utils/sound.js';

export default function App() {
    const [user, setUser] = useState(null);
    const [locationGranted, setLocationGranted] = useState(false);
    const [coords, setCoords] = useState(null);
    const [nearbyUsers, setNearbyUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [connected, setConnected] = useState(false);
    const [banned, setBanned] = useState(null);
    const [toast, setToast] = useState(null);
    const [radius, setRadius] = useState(100);
    const [invisible, setInvisible] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState({});

    const socketRef = useRef(null);
    const watchIdRef = useRef(null);
    const locationIntervalRef = useRef(null);

    // Show toast helper
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Initialize user on mount
    useEffect(() => {
        const u = getOrCreateUser();
        setUser(u);
    }, []);

    // Setup socket connection after user is set
    useEffect(() => {
        if (!user) return;

        const socket = getSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('register', {
                userId: user.id,
                nickname: user.nickname,
                gender: user.gender,
                photoUrl: user.photoUrl,
            });
        });
        socket.on('disconnect', () => setConnected(false));

        socket.on('registered', () => {
            console.log('✅ Registered');
        });

        socket.on('nearby', (users) => {
            setNearbyUsers(users);
        });

        socket.on('newMessage', (msg) => {
            // Play sound if another user sent it
            if (user && msg.senderId !== user.id) {
                playNotificationSound();
            }

            // If chat is not open with this sender, mark as unread
            setUnreadMessages((prev) => {
                const senderId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
                return { ...prev, [senderId]: (prev[senderId] || 0) + 1 };
            });
        });

        socket.on('banned', (data) => {
            setBanned(data);
        });

        socket.on('error', (data) => {
            showToast(data.message, 'error');
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('registered');
            socket.off('nearby');
            socket.off('newMessage');
            socket.off('banned');
            socket.off('error');
        };
    }, [user, showToast]);

    // Request geolocation
    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            showToast('Геолокация не поддерживается вашим браузером', 'error');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(newCoords);
                setLocationGranted(true);
                showToast('Местоположение определено', 'success');

                if (socketRef.current) {
                    socketRef.current.emit('location', {
                        latitude: newCoords.lat,
                        longitude: newCoords.lng,
                        radius,
                    });
                }
            },
            (err) => {
                console.error('Geolocation error:', err);
                let msg = 'Не удалось получить геолокацию';
                if (err.code === 1) msg = 'Доступ запрещен. Пожалуйста, разрешите GPS в настройках.';
                if (err.code === 2) msg = 'GPS сигнал недоступен';
                if (err.code === 3) msg = 'Тайм-аут: не удалось найти GPS';
                showToast(msg, 'error');
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
    }, [showToast, radius]);

    // Heartbeat: keeps user "online" on server without draining battery
    // It sends the LAST KNOWN coordinates every 10 seconds (network only, no GPS hardware usage)
    useEffect(() => {
        if (!locationGranted || !socketRef.current || !coords) return;

        // Send immediately on change (initial or radius change)
        socketRef.current.emit('location', {
            latitude: coords.lat,
            longitude: coords.lng,
            radius,
        });

        // Setup interval for heartbeat (keeping online status)
        const interval = setInterval(() => {
            if (socketRef.current && coords) {
                socketRef.current.emit('location', {
                    latitude: coords.lat,
                    longitude: coords.lng,
                    radius,
                });
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [locationGranted, radius, coords]);

    // Handle profile update
    const handleProfileUpdate = useCallback((updates) => {
        const updated = updateUser(updates);
        setUser(updated);
        if (socketRef.current) {
            socketRef.current.emit('updateProfile', updates);
        }
        showToast('Профиль обновлён', 'success');
    }, [showToast]);

    // Handle chat open
    const handleOpenChat = useCallback((targetUser) => {
        setSelectedUser(targetUser);
        setShowChat(true);
        setShowProfile(false);
        // Clear unread for this user
        setUnreadMessages((prev) => {
            const next = { ...prev };
            delete next[targetUser.id];
            return next;
        });
    }, []);

    // Toggle invisible mode
    const handleToggleInvisible = useCallback(() => {
        const newVal = !invisible;
        setInvisible(newVal);
        if (socketRef.current) {
            socketRef.current.emit('toggleInvisible', { invisible: newVal });
        }
        showToast(newVal ? '👻 Режим невидимки включён' : '👁 Вы снова видимы', 'info');
    }, [invisible, showToast]);

    // Banned screen
    if (banned) {
        return <BannedScreen data={banned} onExpired={() => setBanned(null)} />;
    }

    // Location permission screen
    if (!locationGranted) {
        return <LocationPermission onAllow={requestLocation} />;
    }

    return (
        <div className="h-full w-full flex flex-col bg-radar-bg overflow-hidden relative">
            {/* Scan line effect */}
            <div className="scan-line pointer-events-none z-50 opacity-30" />

            <Header
                user={user}
                connected={connected}
                invisible={invisible}
                onToggleInvisible={handleToggleInvisible}
                onOpenProfile={() => { setShowProfile(true); setShowChat(false); }}
                radius={radius}
                onRadiusChange={setRadius}
                nearbyCount={nearbyUsers.length}
            />

            <main className="flex-1 relative overflow-hidden">
                <RadarView
                    coords={coords}
                    nearbyUsers={nearbyUsers}
                    radius={radius}
                    onSelectUser={handleOpenChat}
                    unreadMessages={unreadMessages}
                    onRefreshLocation={() => requestLocation(false)}
                />

                {/* Chat Panel */}
                {showChat && selectedUser && (
                    <ChatPanel
                        user={user}
                        targetUser={selectedUser}
                        socket={socketRef.current}
                        onClose={() => { setShowChat(false); setSelectedUser(null); }}
                        showToast={showToast}
                    />
                )}

                {/* Profile Panel */}
                {showProfile && (
                    <ProfilePanel
                        user={user}
                        onUpdate={handleProfileUpdate}
                        onClose={() => setShowProfile(false)}
                    />
                )}
            </main>

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} key={toast.id} />}
        </div>
    );
}
