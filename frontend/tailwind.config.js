/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg0: 'rgb(var(--bg0) / <alpha-value>)',
        bg1: 'rgb(var(--bg1) / <alpha-value>)',
        bg2: 'rgb(var(--bg2) / <alpha-value>)',
        bg3: 'rgb(var(--bg3) / <alpha-value>)',
        tx1: 'rgb(var(--tx1) / <alpha-value>)',
        tx2: 'rgb(var(--tx2) / <alpha-value>)',
        tx3: 'rgb(var(--tx3) / <alpha-value>)',
        bdr: 'rgb(var(--bdr) / <alpha-value>)',
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
