export default function Toast({ message, type }) {
    const colors = {
        info: 'border-radar-accent bg-radar-accent/10 text-radar-accent',
        success: 'border-radar-green bg-radar-green/10 text-radar-green',
        error: 'border-radar-danger bg-radar-danger/10 text-radar-danger',
    };

    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
            <div
                className={`glass rounded-xl px-4 py-2.5 border ${colors[type] || colors.info
                    } flex items-center gap-2 shadow-lg`}
            >
                <span className="text-sm">{icons[type] || icons.info}</span>
                <span className="text-xs font-medium">{message}</span>
            </div>
        </div>
    );
}
