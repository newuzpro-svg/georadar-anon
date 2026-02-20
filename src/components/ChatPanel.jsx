import { useState, useEffect, useRef, useCallback } from 'react';
import { generateAvatar, genderLabels } from '../utils/avatars.js';

export default function ChatPanel({ user, targetUser, socket, onClose, showToast }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Load message history
    useEffect(() => {
        if (!socket || !targetUser) return;

        socket.emit('getMessages', { otherUserId: targetUser.id });

        const historyTimeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        const handleHistory = (data) => {
            if (data.otherUserId === targetUser.id) {
                setMessages(data.messages);
                setLoading(false);
                clearTimeout(historyTimeout);
            }
        };

        const handleNewMessage = (msg) => {
            if (
                (msg.senderId === targetUser.id && msg.receiverId === user.id) ||
                (msg.senderId === user.id && msg.receiverId === targetUser.id)
            ) {
                setMessages((prev) => {
                    // Prevent duplicates
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }
        };

        socket.on('messageHistory', handleHistory);
        socket.on('newMessage', handleNewMessage);

        return () => {
            socket.off('messageHistory', handleHistory);
            socket.off('newMessage', handleNewMessage);
            clearTimeout(historyTimeout);
        };
    }, [socket, targetUser, user.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Send message
    const sendMessage = useCallback(() => {
        if (!input.trim() || !socket) return;

        socket.emit('sendMessage', {
            receiverId: targetUser.id,
            message: input.trim(),
        });

        setInput('');
        inputRef.current?.focus();
    }, [input, socket, targetUser.id]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Block user
    const handleBlock = () => {
        if (socket) {
            socket.emit('blockUser', { blockedId: targetUser.id });
            showToast('Пользователь заблокирован', 'info');
            onClose();
        }
    };

    // Report user
    const handleReport = () => {
        if (socket) {
            socket.emit('reportUser', { reportedId: targetUser.id, reason: 'user_report' });
            showToast('Жалоба отправлена', 'success');
        }
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col glass-strong animate-slide-up h-[100dvh] w-full bg-radar-bg">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-radar-ring/50 shrink-0">
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg bg-radar-dark text-radar-muted hover:text-radar-accent border border-radar-ring flex items-center justify-center transition-all"
                >
                    ←
                </button>

                <button
                    onClick={() => setShowUserInfo(!showUserInfo)}
                    className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
                >
                    <div className="relative">
                        <img
                            src={targetUser.photo_url || generateAvatar(targetUser.id, 40)}
                            alt={targetUser.nickname}
                            className="w-10 h-10 rounded-full border-2 border-radar-green/50"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-radar-green border-2 border-radar-panel" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold text-radar-text">{targetUser.nickname}</div>
                        <div className="text-[10px] text-radar-accent font-mono">{targetUser.distance}м от вас</div>
                    </div>
                </button>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleReport}
                        className="w-8 h-8 rounded-lg bg-radar-dark text-radar-muted hover:text-radar-warning border border-radar-ring flex items-center justify-center transition-all text-sm"
                        title="Пожаловаться"
                    >
                        ⚠️
                    </button>
                    <button
                        onClick={handleBlock}
                        className="w-8 h-8 rounded-lg bg-radar-dark text-radar-muted hover:text-radar-danger border border-radar-ring flex items-center justify-center transition-all text-sm"
                        title="Заблокировать"
                    >
                        🚫
                    </button>
                </div>
            </div>

            {/* User info dropdown */}
            {showUserInfo && (
                <div className="px-4 py-3 border-b border-radar-ring/30 bg-radar-dark/50 animate-slide-up">
                    <div className="flex items-center gap-4 text-xs text-radar-muted">
                        <span>{genderLabels[targetUser.gender] || genderLabels.not_selected}</span>
                        <span>•</span>
                        <span className="text-radar-green font-mono">● Online</span>
                        <span>•</span>
                        <span className="font-mono">{targetUser.distance}м</span>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-radar-muted text-sm font-mono animate-pulse">
                            Загрузка сообщений...
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <span className="text-4xl">💬</span>
                        <p className="text-radar-muted text-sm text-center">
                            Начните диалог с <span className="text-radar-accent">{targetUser.nickname}</span>
                        </p>
                        <p className="text-radar-muted/50 text-xs text-center">
                            Сообщения удаляются через 24 часа
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.senderId === user.id;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] px-3 py-2 rounded-2xl ${isMine ? 'msg-sent rounded-br-md' : 'msg-received rounded-bl-md'
                                        }`}
                                >
                                    <p className="text-sm text-radar-text break-words">{msg.message}</p>
                                    <p
                                        className={`text-[10px] mt-1 ${isMine ? 'text-radar-accent/50 text-right' : 'text-radar-muted/50'
                                            }`}
                                    >
                                        {formatTime(msg.createdAt)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-radar-ring/50 shrink-0">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Сообщение..."
                        rows={1}
                        maxLength={500}
                        className="flex-1 bg-radar-dark border border-radar-ring rounded-xl px-4 py-2.5 text-sm text-radar-text placeholder-radar-muted/50 resize-none focus:border-radar-accent/50 transition-colors"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="w-10 h-10 rounded-xl bg-gradient-to-r from-radar-accent to-cyan-500 text-radar-bg flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shrink-0"
                    >
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="currentColor" />
                        </svg>
                    </button>
                </div>
                <div className="text-[10px] text-radar-muted/40 mt-1 px-1 font-mono">
                    {input.length}/500 • Enter для отправки
                </div>
            </div>
        </div>
    );
}
