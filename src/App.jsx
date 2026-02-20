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
    const [isDemoMode, setIsDemoMode] = useState(false);
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

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        socket.emit('register', {
            userId: user.id,
            nickname: user.nickname,
            gender: user.gender,
            photoUrl: user.photoUrl,
        });

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
    const requestLocation = useCallback((forceMock = false) => {
        if (forceMock) {
            // Default to a demo location (e.g. center of Tashkent/Moscow/etc)
            setCoords({ lat: 41.311081, lng: 69.240562 });
            setLocationGranted(true);
            setIsDemoMode(true);
            showToast('Используется тестовая локация', 'info');
            return;
        }

        if (!navigator.geolocation) {
            if (window.isSecureContext === false) {
                showToast('Внимание: Ваш браузер (Chrome) требует HTTPS для геолокации. Нажмите Demo', 'error');
            } else {
                showToast('Геолокация не поддерживается вашим браузером', 'error');
            }
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationGranted(true);
                setIsDemoMode(false);
                showToast('Геолокация подключена', 'success');
            },
            (err) => {
                console.error('Geolocation error:', err);
                let msg = 'Не удалось получить геолокацию. Включен Demo-режим.';
                if (err.code === 1) msg = 'Доступ к локации запрещен. Включен Demo-режим.';
                if (err.code === 2) msg = 'GPS недоступен. Включен Demo-режим.';
                if (err.code === 3) msg = 'Тайм-аут получения локации. Включен Demo-режим.';
                showToast(msg, 'error');

                // Auto fallback to demo mode so the app doesn't hang!
                setCoords({ lat: 41.311081, lng: 69.240562 });
                setLocationGranted(true);
                setIsDemoMode(true);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    }, [showToast]);

    // Continuous location updates after permission granted
    useEffect(() => {
        if (!locationGranted || !socketRef.current) return;

        // Watch position
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(newCoords);
            },
            (err) => console.error('Watch error:', err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        // Send location to server every 5 seconds
        locationIntervalRef.current = setInterval(() => {
            if (socketRef.current && coords) {
                socketRef.current.emit('location', {
                    latitude: coords.lat,
                    longitude: coords.lng,
                    radius,
                });
            }
        }, 5000);

        // Initial send
        if (coords) {
            socketRef.current.emit('location', {
                latitude: coords.lat,
                longitude: coords.lng,
                radius,
            });
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
            }
        };
    }, [locationGranted, coords, radius]);

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
                isDemoMode={isDemoMode}
                onRequestRealLocation={() => requestLocation(false)}
            />

            <main className="flex-1 relative overflow-hidden">
                <RadarView
                    coords={coords}
                    nearbyUsers={nearbyUsers}
                    radius={radius}
                    onSelectUser={handleOpenChat}
                    unreadMessages={unreadMessages}
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
