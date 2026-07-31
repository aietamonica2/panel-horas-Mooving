/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mooving: {
          DEFAULT: '#1a5f7a',
          dark: '#134c61',
          light: '#2a7a99',
          accent: '#f97316',
          accentDark: '#c2570c',
          50: '#f0f7fa',
          100: '#d9ebf1',
          200: '#b3d7e3',
          300: '#80bcd0',
          400: '#4d9db5',
          500: '#2a7a99',
          600: '#1f6b88',
          700: '#1a5f7a',
          800: '#134c61',
          900: '#0e3b4c',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn .2s ease-out',
        'fade-in-up': 'fadeInUp .25s ease-out',
        'fade-in-down': 'fadeInDown .25s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
