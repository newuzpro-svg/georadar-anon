import { useState, useEffect } from 'react';

export default function AdminPanel({ socket, onClose }) {
    const [pin, setPin] = useState('');
    const [isAuth, setIsAuth] = useState(false);
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [broadcastMsg, setBroadcastMsg] = useState('');

    useEffect(() => {
        if (!socket) return;

        socket.on('adminAuthSuccess', () => setIsAuth(true));
        socket.on('adminUserList', (list) => setUsers(list));
        socket.on('adminReportList', (list) => setReports(list));
        socket.on('adminNewReport', (report) => {
            setReports(prev => [report, ...prev]);
        });

        return () => {
            socket.off('adminAuthSuccess');
            socket.off('adminUserList');
            socket.off('adminReportList');
            socket.off('adminNewReport');
        };
    }, [socket]);

    useEffect(() => {
        if (isAuth && socket) {
            socket.emit('adminGetUsers');
            socket.emit('adminGetReports');
        }
    }, [isAuth, socket]);

    const handleLogin = (e) => {
        e.preventDefault();
        socket.emit('adminAuth', { pin });
    };

    const handleBan = (userId, reportId = null) => {
        const mins = prompt('Necha daqiqaga ban (masalan: 60)?', '60');
        if (mins) {
            socket.emit('adminBanUser', { userId, minutes: parseInt(mins) });
            if (reportId) {
                socket.emit('adminDismissReport', { reportId });
            }
        }
    };

    const handleDismissReport = (reportId) => {
        socket.emit('adminDismissReport', { reportId });
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
        <div className="fixed inset-0 z-[200] bg-radar-bg flex flex-col font-mono text-radar-text">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-3">
                    <span className="text-radar-accent">💎</span>
                    <h2 className="font-bold tracking-tighter">CONTROL CENTER</h2>
                </div>
                <button onClick={onClose} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs transition-colors border border-white/5">EXIT</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-thin">
                {/* Broadcast */}
                <section>
                    <h3 className="text-[10px] text-radar-accent font-bold tracking-[0.3em] uppercase mb-4">📢 Global Multi-Cast</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="Tizim xabari yozing..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-radar-accent outline-none transition-colors"
                        />
                        <button onClick={handleBroadcast} className="px-6 py-3 bg-radar-accent text-radar-bg font-bold text-xs rounded-xl hover:scale-105 transition-transform active:scale-95">
                            SEND
                        </button>
                    </div>
                </section>

                {/* Reports List */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] text-radar-danger font-bold tracking-[0.3em] uppercase">⚠️ Pending Reports ({reports.length})</h3>
                        {reports.length > 0 && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    </div>

                    <div className="space-y-3">
                        {reports.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl text-white/20 text-xs italic">
                                Hozircha jalobalar yo'q
                            </div>
                        ) : (
                            reports.map((r) => (
                                <div key={r.id} className="bg-red-500/5 border border-red-500/20 p-4 rounded-2xl space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-[10px] text-white/40 mb-1">SHIKOYATCHI: {r.senderName}</div>
                                            <div className="text-sm font-bold text-radar-danger underline decoration-red-500/30">
                                                AYBDOR: {r.reportedName}
                                            </div>
                                        </div>
                                        <div className="text-[9px] text-white/20">{new Date(r.timestamp).toLocaleTimeString()}</div>
                                    </div>

                                    <div className="bg-black/20 p-3 rounded-lg text-xs text-white/70 italic border border-white/5">
                                        "{r.reason}"
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => handleBan(r.reportedId, r.id)}
                                            className="flex-1 py-2.5 bg-red-500 text-white font-bold text-[10px] rounded-lg hover:bg-red-600 transition-colors uppercase tracking-widest"
                                        >
                                            Ban qilish
                                        </button>
                                        <button
                                            onClick={() => handleDismissReport(r.id)}
                                            className="px-4 py-2.5 bg-white/5 text-white/40 font-bold text-[10px] rounded-lg hover:bg-white/10 transition-colors uppercase tracking-widest"
                                        >
                                            Rad etish
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Users List */}
                <section>
                    <h3 className="text-[10px] text-radar-accent font-bold tracking-[0.3em] uppercase mb-4">👥 Registry: Active Users ({users.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {users.map((u) => (
                            <div key={u.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:border-radar-accent/30 transition-colors">
                                <div className="min-w-0">
                                    <div className="text-sm font-bold flex items-center gap-2 truncate">
                                        {u.nickname}
                                        {u.is_invisible === 1 && <span className="text-[8px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded uppercase">Invis</span>}
                                    </div>
                                    <div className="text-[9px] text-white/20 truncate font-mono mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{u.id}</div>
                                </div>
                                <button
                                    onClick={() => handleBan(u.id)}
                                    className="px-4 py-2 bg-white/5 text-red-500/60 border border-white/5 rounded-xl text-[9px] font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-tighter"
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
