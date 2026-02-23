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

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
                {/* Avatar with upload */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative cursor-pointer group" onClick={() => fileRef.current?.click()}>
                        <img
                            src={photoUrl || generateAvatar(user.id, 96)}
                            alt={user.nickname}
                            className="w-24 h-24 rounded-full border-3 border-radar-accent shadow-[0_0_20px_rgba(var(--radar-accent-rgb),0.2)] object-cover"
                        />
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xl">📷</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-radar-accent border-3 border-radar-panel flex items-center justify-center shadow-lg">
                            <span className="text-[10px]">✏️</span>
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePhoto} />
                    <p className="text-[10px] text-radar-muted mt-2">Bosing va rasm tanlang</p>
                </div>

                {/* Gallery Photos */}
                <div className="mb-6">
                    <label className="text-[10px] text-radar-muted font-mono uppercase tracking-[0.2em] mb-3 block">
                        📸 Galereya ({photos.length}/2)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {photos.map((p, i) => (
                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-radar-ring group">
                                <img src={p} alt={`photo-${i}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeGalleryPhoto(i)}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/90 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        {photos.length < 2 && (
                            <button
                                onClick={() => galleryRef.current?.click()}
                                className="aspect-square rounded-xl border-2 border-dashed border-radar-ring hover:border-radar-accent/50 flex flex-col items-center justify-center gap-1 text-radar-muted hover:text-radar-accent transition-all"
                            >
                                <span className="text-2xl">+</span>
                                <span className="text-[9px] font-mono">Rasm qo'shish</span>
                            </button>
                        )}
                    </div>
                    <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryPhoto} />
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
                                    ? key === 'female'
                                        ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                                        : 'bg-radar-accent/20 border-radar-accent text-radar-accent shadow-[0_0_10px_rgba(var(--radar-accent-rgb),0.1)]'
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
                <div className="mt-4 space-y-3">
                    <div className="glass rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-radar-accent mb-2">🔒 Анонимность</h3>
                        <p className="text-xs text-radar-muted leading-relaxed">
                            Ваш профиль полностью анонимный. Нет email, нет телефона, нет регистрации.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
