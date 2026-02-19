import { useState } from 'react';
import { generateAvatar, genderLabels } from '../utils/avatars.js';

export default function ProfilePanel({ user, onUpdate, onClose }) {
    const [nickname, setNickname] = useState(user.nickname);
    const [gender, setGender] = useState(user.gender || 'not_selected');
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        if (!nickname.trim()) return;
        setSaving(true);
        onUpdate({ nickname: nickname.trim(), gender });
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
                <h2 className="text-sm font-semibold text-radar-text">Анонимный профиль</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Avatar */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative">
                        <img
                            src={user.photoUrl || generateAvatar(user.id, 96)}
                            alt={user.nickname}
                            className="w-24 h-24 rounded-full border-3 border-radar-accent/30"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-radar-green border-3 border-radar-panel flex items-center justify-center">
                            <span className="text-xs">✓</span>
                        </div>
                    </div>
                    <div className="mt-3 text-xs text-radar-muted font-mono">ID: {user.id.substring(0, 12)}...</div>
                </div>

                {/* Nickname */}
                <div className="mb-5">
                    <label className="text-xs text-radar-muted font-mono uppercase tracking-wider mb-2 block">
                        Никнейм
                    </label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        maxLength={20}
                        className="w-full bg-radar-dark border border-radar-ring rounded-xl px-4 py-3 text-sm text-radar-text focus:border-radar-accent/50 transition-colors"
                        placeholder="Введите никнейм"
                    />
                    <div className="text-[10px] text-radar-muted/50 mt-1 px-1 font-mono">
                        {nickname.length}/20
                    </div>
                </div>

                {/* Gender */}
                <div className="mb-6">
                    <label className="text-xs text-radar-muted font-mono uppercase tracking-wider mb-2 block">
                        Пол (необязательно)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(genderLabels).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => setGender(key)}
                                className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${gender === key
                                        ? 'bg-radar-accent/20 text-radar-accent border border-radar-accent/40'
                                        : 'bg-radar-dark text-radar-muted border border-radar-ring hover:border-radar-accent/20'
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
                    className="w-full btn-glow py-3 rounded-xl bg-gradient-to-r from-radar-accent to-cyan-500 text-radar-bg font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                    {saving ? '✓ Сохранено' : 'Сохранить'}
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
