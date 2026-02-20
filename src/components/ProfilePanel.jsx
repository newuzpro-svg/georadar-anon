import { useState } from 'react';
import { generateAvatar, genderLabels } from '../utils/avatars.js';

export default function ProfilePanel({ user, onUpdate, onClose }) {
    const [nickname, setNickname] = useState(user.nickname);
    const [gender, setGender] = useState(user.gender || 'not_selected');
    const [theme, setTheme] = useState(user.theme || 'violet');
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        if (!nickname.trim()) return;
        setSaving(true);
        onUpdate({ nickname: nickname.trim(), gender, theme });
        setTimeout(() => {
            setSaving(false);
        }, 500);
    };

    return (
        <div className="absolute inset-0 z-40 flex flex-col glass-strong animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-radar-ring/50 shrink-0">
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg bg-radar-dark text-radar-muted hover:text-radar-accent border border-radar-ring flex items-center justify-center transition-all"
                >
                    ←
                </button>
                <h2 className="text-sm font-semibold text-radar-text font-mono tracking-wider">ПРОФИЛЬ</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <img
                            src={user.photoUrl || generateAvatar(user.id, 96)}
                            alt={user.nickname}
                            className="w-24 h-24 rounded-full border-3 border-radar-accent shadow-[0_0_20px_rgba(var(--radar-accent-rgb),0.2)]"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-radar-green border-3 border-radar-panel flex items-center justify-center">
                            <span className="text-xs">✓</span>
                        </div>
                    </div>
                </div>

                {/* Nickname */}
                <div className="mb-6">
                    <label className="text-[10px] text-radar-muted font-mono uppercase tracking-[0.2em] mb-3 block">
                        НИКНЕЙМ
                    </label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        maxLength={20}
                        className="w-full bg-radar-dark/50 border border-radar-ring rounded-xl px-4 py-3 text-sm text-radar-text focus:border-radar-accent/50 focus:bg-radar-dark transition-all"
                        placeholder="Введите ник"
                    />
                </div>

                {/* Theme Selection */}
                <div className="mb-6">
                    <label className="text-[10px] text-radar-muted font-mono uppercase tracking-[0.2em] mb-3 block">
                        ТЕМА ОФОРМЛЕНИЯ
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setTheme('violet')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${theme === 'violet'
                                ? 'bg-indigo-900/30 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                : 'bg-radar-dark/50 border-radar-ring text-radar-muted hover:border-radar-accent/30'
                                }`}
                        >
                            <div className="w-4 h-4 rounded-full bg-purple-600" />
                            Violet
                        </button>
                        <button
                            onClick={() => setTheme('emerald')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${theme === 'emerald'
                                ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : 'bg-radar-dark/50 border-radar-ring text-radar-muted hover:border-radar-accent/30'
                                }`}
                        >
                            <div className="w-4 h-4 rounded-full bg-emerald-600" />
                            Emerald
                        </button>
                    </div>
                </div>

                {/* Gender */}
                <div className="mb-8">
                    <label className="text-[10px] text-radar-muted font-mono uppercase tracking-[0.2em] mb-3 block">
                        ПОЛ
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(genderLabels).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setGender(key)}
                                className={`px-2 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${gender === key
                                    ? 'bg-radar-accent/20 border-radar-accent text-radar-accent shadow-[0_0_10px_rgba(var(--radar-accent-rgb),0.1)]'
                                    : 'bg-radar-dark/50 border-radar-ring text-radar-muted hover:border-radar-accent/20'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save button */}
                <button
                    onClick={handleSave}
                    disabled={saving || !nickname.trim()}
                    className="w-full btn-glow py-4 rounded-xl bg-gradient-to-r from-radar-accent to-radar-panel text-radar-bg font-bold text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mb-8"
                >
                    {saving ? '✓ СОХРАНЕНО' : 'СОХРАНИТЬ ИЗМЕНЕНИЯ'}
                </button>

                {/* Info */}
                <div className="mt-8 space-y-3">
                    <div className="glass rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-radar-accent mb-2">🔒 Анонимность</h3>
                        <p className="text-xs text-radar-muted leading-relaxed">
                            Ваш профиль полностью анонимный. Нет email, нет телефона, нет регистрации.
                            При очистке cookies создаётся новый профиль.
                        </p>
                    </div>

                    <div className="glass rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-radar-warning mb-2">⚡ Время жизни</h3>
                        <p className="text-xs text-radar-muted leading-relaxed">
                            Профиль удаляется автоматически через 24 часа неактивности.
                            Сообщения хранятся не более 24 часов.
                        </p>
                    </div>

                    <div className="glass rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-radar-purple mb-2">👻 Режим невидимки</h3>
                        <p className="text-xs text-radar-muted leading-relaxed">
                            Включите режим невидимки в шапке, чтобы другие пользователи вас не видели на радаре.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
