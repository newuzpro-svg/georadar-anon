import { useState, useEffect } from 'react';

export default function AdminPanel({ socket, onClose }) {
    const [pin, setPin] = useState('');
    const [isAuth, setIsAuth] = useState(false);
    const [users, setUsers] = useState([]);
    const [broadcastMsg, setBroadcastMsg] = useState('');

    useEffect(() => {
        if (!socket) return;

        socket.on('adminAuthSuccess', () => setIsAuth(true));
        socket.on('adminUserList', (list) => setUsers(list));

        return () => {
            socket.off('adminAuthSuccess');
            socket.off('adminUserList');
        };
    }, [socket]);

    useEffect(() => {
        if (isAuth) {
            socket.emit('adminGetUsers');
        }
    }, [isAuth, socket]);

    const handleLogin = (e) => {
        e.preventDefault();
        socket.emit('adminAuth', { pin });
    };

    const handleBan = (userId) => {
        const mins = prompt('Necha daqiqaga ban (masalan: 60)?', '60');
        if (mins) {
            socket.emit('adminBanUser', { userId, minutes: parseInt(mins) });
        }
    };

    const handleBroadcast = () => {
        if (broadcastMsg.trim()) {
            socket.emit('adminBroadcast', { message: broadcastMsg });
            setBroadcastMsg('');
            alert('Xabar yuborildi!');
        }
    };

    if (!isAuth) {
        return (
            <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-6">
                <div className="w-full max-w-xs space-y-6 text-center">
                    <div className="text-4xl">🔐</div>
                    <h2 className="text-xl font-bold font-mono tracking-widest text-radar-accent">ADMIN ACCESS</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="SECRET CODE"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] focus:border-radar-accent outline-none"
                            autoFocus
                        />
                        <button className="w-full py-4 rounded-xl bg-radar-accent text-radar-bg font-bold tracking-widest hover:scale-105 transition-all">
                            UNLOCK
                        </button>
                    </form>
                    <button onClick={onClose} className="text-white/30 text-xs font-mono">CANCEL</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] bg-radar-bg flex flex-col font-mono">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/40">
                <h2 className="text-radar-accent font-bold">ADMIN PANEL</h2>
                <button onClick={onClose} className="px-3 py-1 bg-white/10 rounded text-xs">EXIT</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Broadcast */}
                <section className="space-y-4">
                    <h3 className="text-[10px] text-white/40 tracking-[0.3em] uppercase">Global Broadcast</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Xabar matni..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm"
                        />
                        <button onClick={handleBroadcast} className="px-6 py-3 bg-radar-accent text-radar-bg font-bold text-xs rounded-lg">
                            SEND
                        </button>
                    </div>
                </section>

                {/* Users List */}
                <section className="space-y-4">
                    <h3 className="text-[10px] text-white/40 tracking-[0.3em] uppercase">Active Users ({users.length})</h3>
                    <div className="space-y-2">
                        {users.map((u) => (
                            <div key={u.id} className="bg-white/5 border border-white/5 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-bold flex items-center gap-2">
                                        {u.nickname}
                                        {u.is_invisible === 1 && <span className="text-[8px] bg-red-500/20 text-red-400 px-1 rounded">HIDDEN</span>}
                                    </div>
                                    <div className="text-[9px] text-white/30 truncate max-w-[150px]">{u.id}</div>
                                </div>
                                <button
                                    onClick={() => handleBan(u.id)}
                                    className="px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/20 rounded text-[10px] hover:bg-red-500 hover:text-white"
                                >
                                    BAN
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
