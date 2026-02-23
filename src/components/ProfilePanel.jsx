import { useState, useRef } from 'react';
import { generateAvatar, genderLabels } from '../utils/avatars.js';

function resizeImage(file, maxSize = 300) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > h) { h = maxSize * h / w; w = maxSize; }
                else { w = maxSize * w / h; h = maxSize; }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

export default function ProfilePanel({ user, onUpdate, onClose }) {
    const [nickname, setNickname] = useState(user.nickname);
    const [gender, setGender] = useState(user.gender || 'not_selected');
    const [theme, setTheme] = useState(user.theme || 'violet');
    const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');
    const [photos, setPhotos] = useState(user.photos || []);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef(null);
    const galleryRef = useRef(null);

    const handleProfilePhoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const dataUrl = await resizeImage(file, 200);
        setPhotoUrl(dataUrl);
    };

    const handleGalleryPhoto = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const remaining = 2 - photos.length;
        const toProcess = files.slice(0, remaining);
        const results = await Promise.all(toProcess.map(f => resizeImage(f, 400)));
        setPhotos(prev => [...prev, ...results].slice(0, 2));
    };

    const removeGalleryPhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (!nickname.trim()) return;
        setSaving(true);
        onUpdate({ nickname: nickname.trim(), gender, theme, photoUrl, photos });
        setTimeout(() => setSaving(false), 500);
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

            {/* Content — max-w for PC screens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
                <div className="max-w-sm mx-auto">
                    {/* Avatar + Gallery row: compact layout */}
                    <div className="flex items-start gap-4 mb-6">
                        {/* Profile Photo */}
                        <div className="shrink-0 cursor-pointer group" onClick={() => fileRef.current?.click()}>
                            <div className="relative">
                                <img
                                    src={photoUrl || generateAvatar(user.id, 72)}
                                    alt={user.nickname}
                                    className="w-[72px] h-[72px] rounded-2xl border-2 border-radar-accent/40 shadow-[0_0_15px_rgba(var(--radar-accent-rgb),0.15)] object-cover"
                                />
                                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-lg">📷</span>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-radar-accent border-2 border-radar-panel flex items-center justify-center">
                                    <span className="text-[8px]">✏️</span>
                                </div>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
                        </div>

                        {/* Gallery Photos - inline */}
                        <div className="flex-1">
                            <div className="text-[9px] text-radar-muted font-mono uppercase tracking-wider mb-1.5">📸 Galereya ({photos.length}/2)</div>
                            <div className="flex gap-2">
                                {photos.map((p, i) => (
                                    <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-radar-ring group shrink-0">
                                        <img src={p} alt={`photo-${i}`} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeGalleryPhoto(i)}
                                            className="absolute top-0 right-0 w-4 h-4 rounded-bl-md bg-red-500/90 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                {photos.length < 2 && (
                                    <button
                                        onClick={() => galleryRef.current?.click()}
                                        className="w-14 h-14 rounded-xl border border-dashed border-radar-ring hover:border-radar-accent/50 flex flex-col items-center justify-center text-radar-muted hover:text-radar-accent transition-all shrink-0"
                                    >
                                        <span className="text-lg leading-none">+</span>
                                    </button>
                                )}
                            </div>
                            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryPhoto} />
                        </div>
                    </div>

                    {/* Nickname */}
                    <div className="mb-4">
                        <label className="text-[10px] text-radar-muted font-mono uppercase tracking-[0.2em] mb-2 block">НИКНЕЙМ</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            maxLength={20}
                            className="w-full bg-radar-dark/50 border border-radar-ring rounded-xl px-4 py-2.5 text-sm text-radar-text focus:border-radar-accent/50 focus:bg-radar-dark transition-all"
                            placeholder="Ismingizni kiriting"
                        />
                    </div>

                    {/* Theme */}
                    <div className="mb-4">
                        <label className="text-[10px] text-radar-muted font-mono uppercase tracking-[0.2em] mb-2 block">ТЕМА</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setTheme('violet')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border ${theme === 'violet'
                                    ? 'bg-indigo-900/30 border-purple-500 text-purple-400'
                                    : 'bg-radar-dark/50 border-radar-ring text-radar-muted hover:border-radar-accent/30'
                                    }`}
                            >
                                <div className="w-3 h-3 rounded-full bg-purple-600" /> Violet
                            </button>
                            <button
                                onClick={() => setTheme('emerald')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border ${theme === 'emerald'
                                    ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400'
                                    : 'bg-radar-dark/50 border-radar-ring text-radar-muted hover:border-radar-accent/30'
                                    }`}
                            >
                                <div className="w-3 h-3 rounded-full bg-emerald-600" /> Emerald
                            </button>
                        </div>
                    </div>

                    {/* Gender */}
                    <div className="mb-5">
                        <label className="text-[10px] text-radar-muted font-mono uppercase tracking-[0.2em] mb-2 block">ПОЛ</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {Object.entries(genderLabels).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setGender(key)}
                                    className={`px-1.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${gender === key
                                        ? key === 'female'
                                            ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                                            : 'bg-radar-accent/20 border-radar-accent text-radar-accent'
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
                        className="w-full btn-glow py-3 rounded-xl bg-gradient-to-r from-radar-accent to-radar-panel text-radar-bg font-bold text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mb-4"
                    >
                        {saving ? '✓ СОХРАНЕНО' : 'СОХРАНИТЬ'}
                    </button>

                    {/* Info */}
                    <div className="glass rounded-xl p-3 text-xs text-radar-muted leading-relaxed">
                        🔒 Профиль анонимный. Удаляется через 24ч неактивности.
                    </div>
                </div>
            </div>
        </div>
    );
}
