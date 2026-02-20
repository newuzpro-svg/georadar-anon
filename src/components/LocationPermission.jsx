export default function LocationPermission({ onAllow }) {
    return (
        <div className="h-full w-full flex items-center justify-center bg-radar-bg relative overflow-hidden">
            {/* Cinematic Background Scan */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-radar-accent/10 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-radar-accent/20 rounded-full animate-ping" style={{ animationDuration: '6s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                    <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0%,rgba(var(--radar-accent-rgb),0.1)_15%,transparent_30%)] animate-[spin_8s_linear_infinite]" />
                </div>
            </div>

            {/* Content Card */}
            <div className="relative z-10 text-center px-8 flex flex-col items-center animate-fade-in">
                {/* Logo / Icon Area */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-radar-accent/20 blur-3xl rounded-full scale-150 group-hover:scale-200 transition-transform duration-1000" />
                    <div className="relative w-28 h-28 rounded-3xl bg-radar-dark border border-radar-accent/40 flex items-center justify-center rotate-45 group-hover:rotate-[225deg] transition-transform duration-[2s]">
                        <div className="-rotate-45 group-hover:rotate-[-225deg] transition-transform duration-[2s]">
                            <span className="text-4xl">🛰️</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mb-10">
                    <h1 className="text-4xl font-black text-glow text-radar-accent font-mono tracking-[0.3em] uppercase">
                        GeoRadar
                    </h1>
                    <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-radar-accent to-transparent" />
                    <p className="text-sm text-radar-muted font-mono uppercase tracking-[0.2em]">
                        Anonymous Proximity Network
                    </p>
                </div>

                <div className="max-w-xs space-y-6 mb-12">
                    <p className="text-sm text-radar-text leading-relaxed font-light">
                        Узнайте, кто находится рядом с вами прямо сейчас. Общайтесь анонимно без границ.
                    </p>

                    <div className="flex flex-wrap justify-center gap-2">
                        {['Без регистрации', 'Без SMS', '100% Анонимно'].map((tag) => (
                            <span key={tag} className="text-[9px] px-2 py-1 rounded bg-radar-accent/5 border border-radar-accent/10 text-radar-accent/70 font-mono uppercase">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-[300px] flex flex-col gap-4">
                    <button
                        id="allow-location-btn"
                        onClick={() => onAllow()}
                        className="btn-glow w-full px-8 py-4 rounded-2xl bg-gradient-to-r from-radar-accent to-radar-panel text-radar-bg font-black text-xs transition-all hover:scale-[1.03] active:scale-95 shadow-xl shadow-radar-accent/20 uppercase tracking-[0.2em] font-mono"
                    >
                        📡 Войти в радар
                    </button>

                    <p className="text-[10px] text-radar-muted/40 font-mono">
                        Нажимая, вы разрешаете доступ к локации
                    </p>
                </div>

                {/* Bottom Trust Indicators */}
                <div className="mt-16 flex items-center gap-8 justify-center opacity-40 grayscale group-hover:grayscale-0 transition-all">
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xl">🛡️</span>
                        <span className="text-[8px] font-mono font-bold tracking-tighter">SECURE</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xl">⚡</span>
                        <span className="text-[8px] font-mono font-bold tracking-tighter">FAST</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xl">👻</span>
                        <span className="text-[8px] font-mono font-bold tracking-tighter">PRIVATE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
