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

import AdminPanel from './components/AdminPanel.jsx';

export default function App() {
    const [user, setUser] = useState(null);
    const [locationGranted, setLocationGranted] = useState(false);
    const [coords, setCoords] = useState(null);
    const [nearbyUsers, setNearbyUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showChat, setShowChat] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [connected, setConnected] = useState(false);
    const [banned, setBanned] = useState(null);
    const [toast, setToast] = useState(null);
    const [radius, setRadius] = useState(100);
    const [invisible, setInvisible] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState({});

    const socketRef = useRef(null);
    const coordsRef = useRef(null);
    const radiusRef = useRef(100);

    // Sync refs for use in socket handlers without re-subscribing
    useEffect(() => { coordsRef.current = coords; }, [coords]);
    useEffect(() => { radiusRef.current = radius; }, [radius]);

    // Show toast helper
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Initialize user on mount
    useEffect(() => {
        const u = getOrCreateUser();
        setUser(u);

        // Secret Admin Access via URL param: ?adm=1
        if (window.location.search.includes('adm=1')) {
            setShowAdmin(true);
        }
    }, []);

    // Apply theme to document
    useEffect(() => {
        if (user?.theme) {
            document.documentElement.setAttribute('data-theme', user.theme);
        }
    }, [user?.theme]);

    // Setup socket connection
    useEffect(() => {
        if (!user) return;

        const socket = getSocket();
        socketRef.current = socket;

        const onConnect = () => {
            setConnected(true);
            socket.emit('register', {
                userId: user.id,
                nickname: user.nickname,
                gender: user.gender,
                photoUrl: user.photoUrl,
                latitude: coordsRef.current?.lat,
                longitude: coordsRef.current?.lng,
            });
        };

        const onDisconnect = () => setConnected(false);

        const onRegistered = () => {
            console.log('✅ Registered');
            // Send location immediately upon registration if we have it
            if (coordsRef.current) {
                socket.emit('location', {
                    userId: user.id,
                    latitude: coordsRef.current.lat,
                    longitude: coordsRef.current.lng,
                    radius: radiusRef.current,
                });
            }
        };

        const onNearby = (users) => setNearbyUsers(users);

        const onNewMessage = (msg) => {
            if (user && msg.senderId !== user.id) {
                playNotificationSound();
            }
            setUnreadMessages((prev) => {
                const senderId = msg.senderId === user.id ? msg.receiverId : msg.senderId;
                return { ...prev, [senderId]: (prev[senderId] || 0) + 1 };
            });
        };

        const onBanned = (data) => setBanned(data);
        const onError = (data) => showToast(data.message, 'error');

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('registered', onRegistered);
        socket.on('nearby', onNearby);
        socket.on('newMessage', onNewMessage);
        socket.on('banned', onBanned);
        socket.on('error', onError);

        // If already connected, trigger registration manually
        if (socket.connected) onConnect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('registered', onRegistered);
            socket.off('nearby', onNearby);
            socket.off('newMessage', onNewMessage);
            socket.off('banned', onBanned);
            socket.off('error', onError);
        };
    }, [user, showToast]);

    // Heartbeat: keeps user "online"
    useEffect(() => {
        if (!locationGranted || !connected || !socketRef.current || !coords) return;

        const sendLocation = () => {
            if (socketRef.current && socketRef.current.connected && coords) {
                socketRef.current.emit('location', {
                    userId: user.id,
                    latitude: coords.lat,
                    longitude: coords.lng,
                    radius: radius,
                });
            }
        };

        sendLocation(); // Immediate
        const interval = setInterval(sendLocation, 10000);
        return () => clearInterval(interval);
    }, [locationGranted, connected, radius, coords, user?.id]);

    // Request geolocation
    const requestLocation = useCallback((isInitial = true) => {
        // Fallback default coordinates
        const defaultCoords = { lat: 41.311081, lng: 69.240562 };

        if (isInitial) {
            setCoords(defaultCoords);
            setLocationGranted(true);
        }

        if (!navigator.geolocation) {
            if (isInitial) showToast('GPS qo‘llab-quvvatlanmaydi, standart lokatsiya o‘rnatildi', 'warning');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(newCoords);
                if (!isInitial) showToast('Lokatsiya yangilandi', 'success');

                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('location', {
                        userId: user.id,
                        latitude: newCoords.lat,
                        longitude: newCoords.lng,
                        radius,
                    });
                }
            },
            (err) => {
                console.error('GPS error:', err);
                if (!isInitial) showToast('GPS xatoligi: ' + err.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [showToast, radius, user?.id]);

    // Handle profile update
    const handleProfileUpdate = useCallback((updates) => {
        const updated = updateUser(updates);
        setUser(updated);
        if (socketRef.current) {
            socketRef.current.emit('updateProfile', updates);
        }
        showToast('Profil saqlandi', 'success');
    }, [showToast]);

    // Toggle invisible mode
    const handleToggleInvisible = useCallback(() => {
        const newVal = !invisible;
        setInvisible(newVal);
        if (socketRef.current) {
            socketRef.current.emit('toggleInvisible', { invisible: newVal });
        }
        showToast(newVal ? '👻 Ko\'rinmas rejim yoqildi' : '👁 Siz ko\'rinasiz', 'info');
    }, [invisible, showToast]);

    // Banned screen
    if (banned) {
        return <BannedScreen data={banned} onExpired={() => setBanned(null)} />;
    }

    // Location permission screen
    if (!locationGranted) {
        return <LocationPermission onAllow={() => requestLocation(true)} />;
    }

    return (
        <div className="h-full w-full flex flex-col bg-radar-bg overflow-hidden relative">
            {showAdmin && (
                <AdminPanel
                    socket={socketRef.current}
                    onClose={() => setShowAdmin(false)}
                />
            )}
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
                    onSelectUser={(u) => { setSelectedUser(u); setShowChat(true); setShowProfile(false); }}
                    unreadMessages={unreadMessages}
                    onRefreshLocation={() => requestLocation(false)}
                />

                {showChat && selectedUser && (
                    <ChatPanel
                        user={user}
                        targetUser={selectedUser}
                        socket={socketRef.current}
                        onClose={() => { setShowChat(false); setSelectedUser(null); }}
                        showToast={showToast}
                    />
                )}

                {showProfile && (
                    <ProfilePanel
                        user={user}
                        onUpdate={handleProfileUpdate}
                        onClose={() => setShowProfile(false)}
                    />
                )}
            </main>

            {toast && <Toast message={toast.message} type={toast.type} key={toast.id} />}
        </div>
    );
}
