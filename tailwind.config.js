/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                radar: {
                    bg: '#0a0518',
                    dark: '#120826',
                    panel: '#1a0c35',
                    accent: '#a855f7',
                    glow: '#a855f733',
                    green: '#4ade80',
                    ring: '#2d1b4d',
                    text: '#f3f4f6',
                    muted: '#94a3b8',
                    danger: '#ef4444',
                    warning: '#f59e0b',
                    purple: '#c084fc',
                    online: '#4ade80',
                },
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'radar-sweep': 'radarSweep 3s linear infinite',
                'radar-pulse': 'radarPulse 2s ease-out infinite',
                'dot-appear': 'dotAppear 0.5s ease-out forwards',
                'glow-pulse': 'glowPulse 2s ease-in-out infinite',
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
            },
            keyframes: {
                radarSweep: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                radarPulse: {
                    '0%': { transform: 'scale(0.3)', opacity: '0.8' },
                    '100%': { transform: 'scale(1)', opacity: '0' },
                },
                dotAppear: {
                    '0%': { transform: 'scale(0)', opacity: '0' },
                    '50%': { transform: 'scale(1.3)', opacity: '1' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                glowPulse: {
                    '0%, 100%': { boxShadow: '0 0 5px #00e5ff, 0 0 10px #00e5ff33' },
                    '50%': { boxShadow: '0 0 15px #00e5ff, 0 0 30px #00e5ff55' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
