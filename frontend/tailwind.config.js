/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Brand primary — cyan (#00f0ff)
        primary: {
          50: '#e0feff',
          100: '#b3fdff',
          200: '#80fcff',
          300: '#4dfbff',
          400: '#1afaff',
          500: '#00f0ff',
          600: '#00c0cc',
          700: '#009099',
          800: '#006066',
          900: '#003033',
        },
        // Dark sidebar surface
        surface: {
          700: '#1a1a1a',
          800: '#0a0a0a',
          900: '#050505',
          950: '#000000',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
        message: '0 1px 3px 0 rgba(0,0,0,0.06)',
      },
      keyframes: {
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
        fadeSlideUp: 'fadeSlideUp 0.25s ease-out forwards',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
};
// force reload
