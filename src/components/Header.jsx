export default function Header({
    user,
    connected,
    invisible,
    onToggleInvisible,
    onOpenProfile,
    radius,
    onRadiusChange,
    nearbyCount,
}) {
    return (
        <header className="glass-strong relative z-40 px-4 py-3 flex items-center justify-between shrink-0">
            {/* Left: Logo & status */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-radar-accent to-purple-800 flex items-center justify-center">
                        <span className="text-sm font-bold text-radar-bg">📡</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-glow font-mono tracking-wider text-radar-accent">
                            GeoRadar
                        </h1>
                        <div className="flex items-center gap-1.5">
                            <div
                                className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-radar-green pulse-green' : 'bg-radar-danger'
                                    }`}
                            />
                            <span className="text-[10px] text-radar-muted font-mono">
                                {connected ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Center: Stats */}
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <div className="text-lg font-bold text-radar-accent font-mono">{nearbyCount}</div>
                    <div className="text-[9px] text-radar-muted uppercase tracking-wider">Рядом</div>
                </div>
                <div className="w-px h-8 bg-radar-ring" />
                <div className="text-center">
                    <select
                        value={radius}
                        onChange={(e) => onRadiusChange(Number(e.target.value))}
                        className="bg-transparent text-lg font-bold text-radar-accent font-mono appearance-none cursor-pointer text-center"
                    >
                        <option value={100} className="bg-radar-dark">100м</option>
                        <option value={500} className="bg-radar-dark">500м</option>
                        <option value={1000} className="bg-radar-dark">1км</option>
                        <option value={2000} className="bg-radar-dark">2км</option>
                        <option value={5000} className="bg-radar-dark">5км</option>
                        <option value={10000} className="bg-radar-dark">10км</option>
                    </select>
                    <div className="text-[9px] text-radar-muted uppercase tracking-wider">Радиус</div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleInvisible}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${invisible
                        ? 'bg-radar-purple/20 text-radar-purple border border-radar-purple/30'
                        : 'bg-radar-dark text-radar-muted hover:text-radar-text border border-radar-ring'
                        }`}
                    title={invisible ? 'Режим невидимки ВКЛ' : 'Режим невидимки'}
                >
                    <span className="text-sm">{invisible ? '👻' : '👁'}</span>
                </button>

                <button
                    onClick={onOpenProfile}
                    className="w-8 h-8 rounded-lg bg-radar-dark text-radar-muted hover:text-radar-accent border border-radar-ring flex items-center justify-center transition-all hover:border-radar-accent/30"
                    title="Профиль"
                >
                    <span className="text-sm">👤</span>
                </button>
            </div>
        </header>
    );
}
