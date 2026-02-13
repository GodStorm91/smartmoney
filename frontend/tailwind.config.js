/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
        numbers: ['Inter', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        primary: {
          50: 'hsl(var(--primary-50) / <alpha-value>)',
          100: 'hsl(var(--primary-100) / <alpha-value>)',
          200: 'hsl(var(--primary-200) / <alpha-value>)',
          300: 'hsl(var(--primary-300) / <alpha-value>)',
          400: 'hsl(var(--primary-400) / <alpha-value>)',
          500: 'hsl(var(--primary-500) / <alpha-value>)',
          600: 'hsl(var(--primary-600) / <alpha-value>)',
          700: 'hsl(var(--primary-700) / <alpha-value>)',
          800: 'hsl(var(--primary-800) / <alpha-value>)',
          900: 'hsl(var(--primary-900) / <alpha-value>)',
        },
        /* Gray scale: uses CSS vars when a data-theme is active, falls back to Tailwind defaults */
        gray: {
          50:  'hsl(var(--gray-50,  210 40% 98%) / <alpha-value>)',
          100: 'hsl(var(--gray-100, 210 40% 96%) / <alpha-value>)',
          200: 'hsl(var(--gray-200, 214 32% 91%) / <alpha-value>)',
          300: 'hsl(var(--gray-300, 213 27% 84%) / <alpha-value>)',
          400: 'hsl(var(--gray-400, 215 20% 65%) / <alpha-value>)',
          500: 'hsl(var(--gray-500, 215 16% 47%) / <alpha-value>)',
          600: 'hsl(var(--gray-600, 215 19% 35%) / <alpha-value>)',
          700: 'hsl(var(--gray-700, 215 25% 27%) / <alpha-value>)',
          800: 'hsl(var(--gray-800, 217 33% 17%) / <alpha-value>)',
          900: 'hsl(var(--gray-900, 222 47% 11%) / <alpha-value>)',
          950: 'hsl(var(--gray-900, 222 47% 11%) / <alpha-value>)',
        },
        income: '#4CAF50',
        expense: '#F44336',
        net: '#2196F3',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out both',
        'fade-in-down': 'fadeInDown 0.15s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
