import { useRef, useEffect, useState, useCallback } from 'react';
import { generateAvatar } from '../utils/avatars.js';

export default function RadarView({ coords, nearbyUsers, radius, onSelectUser, unreadMessages }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const sweepAngleRef = useRef(0);
    const animFrameRef = useRef(null);
    const [hoveredUser, setHoveredUser] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Resize observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    // Convert user geo coords to canvas position
    const userToCanvasPos = useCallback(
        (user, cx, cy, radarRadius) => {
            if (!coords) return null;

            const dx = user.longitude - coords.lng;
            const dy = user.latitude - coords.lat;

            // Convert degree difference to meters (approximate)
            const mPerDegLat = 111320;
            const mPerDegLon = mPerDegLat * Math.cos((coords.lat * Math.PI) / 180);

            const distX = dx * mPerDegLon;
            const distY = dy * mPerDegLat;

            // Scale to radar radius
            const scale = radarRadius / radius;
            const px = cx + distX * scale;
            const py = cy - distY * scale; // invert Y

            return { x: px, y: py };
        },
        [coords, radius]
    );

    // Main radar drawing loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || dimensions.width === 0) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        ctx.scale(dpr, dpr);

        const cx = dimensions.width / 2;
        const cy = dimensions.height / 2;
        const maxRadius = Math.min(cx, cy) - 30;

        function draw() {
            ctx.clearRect(0, 0, dimensions.width, dimensions.height);

            // Background glow
            const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 1.2);
            bgGrad.addColorStop(0, 'rgba(0, 229, 255, 0.03)');
            bgGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.01)');
            bgGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);

            // Range rings
            const rings = 4;
            for (let i = 1; i <= rings; i++) {
                const r = (maxRadius / rings) * i;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle =
                    i === rings
                        ? 'rgba(0, 229, 255, 0.25)'
                        : 'rgba(0, 229, 255, 0.08)';
                ctx.lineWidth = i === rings ? 1.5 : 0.5;
                ctx.stroke();
            }

            // Crosshairs
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx - maxRadius, cy);
            ctx.lineTo(cx + maxRadius, cy);
            ctx.moveTo(cx, cy - maxRadius);
            ctx.lineTo(cx, cy + maxRadius);
            ctx.stroke();

            // Diagonal crosshairs
            const d = maxRadius * 0.707;
            ctx.beginPath();
            ctx.moveTo(cx - d, cy - d);
            ctx.lineTo(cx + d, cy + d);
            ctx.moveTo(cx + d, cy - d);
            ctx.lineTo(cx - d, cy + d);
            ctx.stroke();

            // Sweep line
            sweepAngleRef.current = (sweepAngleRef.current + 0.015) % (Math.PI * 2);
            const sweepAngle = sweepAngleRef.current;

            // Sweep gradient (cone)
            const sweepGrad = ctx.createConicGradient(sweepAngle - 0.5, cx, cy);
            sweepGrad.addColorStop(0, 'transparent');
            sweepGrad.addColorStop(0.12, 'rgba(0, 229, 255, 0.12)');
            sweepGrad.addColorStop(0.15, 'rgba(0, 229, 255, 0.04)');
            sweepGrad.addColorStop(0.2, 'transparent');
            sweepGrad.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(cx, cy, maxRadius, 0, Math.PI * 2);
            ctx.fillStyle = sweepGrad;
            ctx.fill();

            // Sweep line itself
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(
                cx + Math.cos(sweepAngle) * maxRadius,
                cy + Math.sin(sweepAngle) * maxRadius
            );
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Draw user dots
            nearbyUsers.forEach((user) => {
                const pos = userToCanvasPos(user, cx, cy, maxRadius);
                if (!pos) return;

                // Clamp within radar circle
                const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2);
                if (dist > maxRadius - 10) {
                    const angle = Math.atan2(pos.y - cy, pos.x - cx);
                    pos.x = cx + Math.cos(angle) * (maxRadius - 10);
                    pos.y = cy + Math.sin(angle) * (maxRadius - 10);
                }

                // Glow
                const glowGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 18);
                glowGrad.addColorStop(0, 'rgba(57, 255, 20, 0.3)');
                glowGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGrad;
                ctx.fillRect(pos.x - 18, pos.y - 18, 36, 36);

                // Dot
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
                ctx.fillStyle = unreadMessages[user.id]
                    ? '#ffa502'
                    : '#39ff14';
                ctx.fill();

                // Border
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Unread badge
                if (unreadMessages[user.id]) {
                    ctx.beginPath();
                    ctx.arc(pos.x + 8, pos.y - 8, 6, 0, Math.PI * 2);
                    ctx.fillStyle = '#ff4757';
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 8px Inter';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        unreadMessages[user.id] > 9 ? '9+' : String(unreadMessages[user.id]),
                        pos.x + 8,
                        pos.y - 8
                    );
                }

                // Label
                ctx.fillStyle = 'rgba(224, 232, 240, 0.8)';
                ctx.font = '11px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(user.nickname, pos.x, pos.y + 20);

                // Distance
                ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
                ctx.font = '9px JetBrains Mono';
                ctx.fillText(`${user.distance}м`, pos.x, pos.y + 32);
            });

            // Center dot (current user)
            const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 25);
            centerGlow.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
            centerGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = centerGlow;
            ctx.fillRect(cx - 25, cy - 25, 50, 50);

            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#00e5ff';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy, 7, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Distance labels on rings
            ctx.fillStyle = 'rgba(122, 139, 160, 0.5)';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'left';
            for (let i = 1; i <= rings; i++) {
                const r = (maxRadius / rings) * i;
                const label = Math.round((radius / rings) * i) + 'м';
                ctx.fillText(label, cx + 4, cy - r + 12);
            }

            animFrameRef.current = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [dimensions, nearbyUsers, coords, radius, userToCanvasPos, unreadMessages]);

    // Handle canvas click
    const handleClick = useCallback(
        (e) => {
            const canvas = canvasRef.current;
            if (!canvas || !coords) return;

            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            const cx = dimensions.width / 2;
            const cy = dimensions.height / 2;
            const maxRadius = Math.min(cx, cy) - 30;

            for (const user of nearbyUsers) {
                const pos = userToCanvasPos(user, cx, cy, maxRadius);
                if (!pos) continue;

                const dist = Math.sqrt((pos.x - clickX) ** 2 + (pos.y - clickY) ** 2);
                if (dist < 20) {
                    onSelectUser(user);
                    return;
                }
            }
        },
        [nearbyUsers, coords, dimensions, userToCanvasPos, onSelectUser]
    );

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center p-4">
            {/* The Radar Circle Container */}
            <div
                ref={containerRef}
                className="w-full max-w-[360px] aspect-square rounded-full relative overflow-hidden border border-radar-accent/30 shadow-[0_0_30px_rgba(0,229,255,0.15)] bg-gradient-to-b from-radar-dark/80 to-radar-bg/90 backdrop-blur-md"
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-pointer absolute inset-0"
                    onClick={handleClick}
                    style={{ width: dimensions.width, height: dimensions.height }}
                />
            </div>

            {/* Nearby users list (bottom) */}
            {nearbyUsers.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 z-30">
                    <div className="glass mx-3 mb-3 rounded-xl p-3 animate-slide-up">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-radar-muted font-mono uppercase tracking-wider">
                                Рядом ({nearbyUsers.length})
                            </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                            {nearbyUsers.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => onSelectUser(u)}
                                    className="shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-radar-accent/10 transition-all group relative"
                                >
                                    <div className="relative">
                                        <img
                                            src={u.photo_url || generateAvatar(u.id, 40)}
                                            alt={u.nickname}
                                            className="w-10 h-10 rounded-full border-2 border-radar-green/50 group-hover:border-radar-accent transition-colors"
                                        />
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-radar-green border-2 border-radar-bg" />
                                        {unreadMessages[u.id] && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-radar-danger text-[8px] font-bold flex items-center justify-center text-white">
                                                {unreadMessages[u.id] > 9 ? '9+' : unreadMessages[u.id]}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-radar-muted group-hover:text-radar-text transition-colors max-w-[60px] truncate">
                                        {u.nickname}
                                    </span>
                                    <span className="text-[9px] text-radar-accent/60 font-mono">
                                        {u.distance}м
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* No users message */}
            {nearbyUsers.length === 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                    <div className="glass rounded-xl px-4 py-2 text-xs text-radar-muted font-mono animate-fade-in">
                        Сканирование... Пользователей рядом не найдено
                    </div>
                </div>
            )}
        </div>
    );
}
