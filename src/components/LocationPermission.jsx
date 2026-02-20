export default function LocationPermission({ onAllow }) {
    return (
        <div className="h-full w-full flex items-center justify-center bg-radar-bg relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0">
                {/* Animated rings */}
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-radar-accent/10"
                        style={{
                            width: `${i * 200}px`,
                            height: `${i * 200}px`,
                            animation: `radarPulse ${2 + i * 0.5}s ease-out infinite`,
                            animationDelay: `${i * 0.4}s`,
                        }}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-6 max-w-md animate-fade-in">
                <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-radar-accent/20 to-radar-panel border-2 border-radar-accent/30 flex items-center justify-center animate-glow-pulse">
                    <span className="text-5xl">📍</span>
                </div>

                <h1 className="text-3xl font-bold mb-3 text-glow text-radar-accent font-mono uppercase tracking-widest">
                    GeoRadar
                </h1>
                <p className="text-lg text-radar-text mb-2 font-light">
                    Анонимный чат с людьми рядом
                </p>
                <p className="text-sm text-radar-muted mb-8 leading-relaxed">
                    Для работы приложения нужен доступ к геолокации.
                    <br />
                    <span className="text-radar-accent/70 font-mono text-[10px] uppercase tracking-tighter">Без регистрации • Без email • Без номера</span>
                </p>

                <div className="flex flex-col gap-3 items-center">
                    <button
                        id="allow-location-btn"
                        onClick={() => onAllow()}
                        className="btn-glow w-full max-w-[280px] px-8 py-3.5 rounded-xl bg-gradient-to-r from-radar-accent to-purple-600 text-radar-bg font-bold text-base transition-all hover:scale-105 active:scale-95 shadow-lg shadow-radar-accent/25 uppercase tracking-wider font-mono"
                    >
                        📡 Разрешить доступ
                    </button>
                </div>

                <div className="mt-8 flex items-center justify-center gap-6 text-xs text-radar-muted">
                    <div className="flex items-center gap-1.5">
                        <span className="text-radar-green">🔒</span> Анонимно
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-radar-accent">⚡</span> Мгновенно
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-radar-purple">👻</span> Приватно
                    </div>
                </div>
            </div>
        </div>
    );
}
