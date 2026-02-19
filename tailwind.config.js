/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                radar: {
                    bg: '#0a0e1a',
                    dark: '#0d1321',
                    panel: '#131a2e',
                    accent: '#00e5ff',
                    glow: '#00e5ff33',
                    green: '#39ff14',
                    ring: '#1a3a4a',
                    text: '#e0e8f0',
                    muted: '#7a8ba0',
                    danger: '#ff4757',
                    warning: '#ffa502',
                    purple: '#a855f7',
                    online: '#39ff14',
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
