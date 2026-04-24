/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        discord: '#5865F2',
        ink: {
          950: '#050505',
          900: '#0a0a0a',
          800: '#111111',
          700: '#1a1a1a',
          600: '#242424',
        },
      },
      animation: {
        'fade-up': 'fadeUp 500ms cubic-bezier(0.4, 0, 0.2, 1) both',
        'pulse-ring': 'pulseRing 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'slow-spin': 'spin 14s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.95)', opacity: '0.6' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { transform: 'scale(1.25)', opacity: '0' },
        },
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
