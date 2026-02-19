import { useState, useEffect } from 'react';

export default function BannedScreen({ data, onExpired }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = data.until - Date.now();
            if (remaining <= 0) {
                clearInterval(interval);
                onExpired();
                return;
            }
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [data.until, onExpired]);

    return (
        <div className="h-full w-full flex items-center justify-center bg-radar-bg">
            <div className="text-center px-6 max-w-md animate-fade-in">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-radar-danger/20 border-2 border-radar-danger/40 flex items-center justify-center">
                    <span className="text-4xl">🚫</span>
                </div>

                <h2 className="text-2xl font-bold text-radar-danger mb-3">
                    Временная блокировка
                </h2>

                <p className="text-sm text-radar-muted mb-4">
                    {data.reason || 'Обнаружена подозрительная активность'}
                </p>

                {data.speedKmh && (
                    <div className="glass rounded-xl p-3 mb-4 inline-block">
                        <span className="text-xs text-radar-muted">Скорость: </span>
                        <span className="text-sm text-radar-danger font-mono font-bold">
                            {data.speedKmh} км/ч
                        </span>
                    </div>
                )}

                <div className="text-3xl font-mono font-bold text-radar-accent text-glow mb-2">
                    {timeLeft}
                </div>
                <p className="text-xs text-radar-muted">Осталось до разблокировки</p>
            </div>
        </div>
    );
}
