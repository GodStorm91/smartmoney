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
        sans: ['Noto Sans JP', 'Outfit', 'sans-serif'],
        numbers: ['DM Mono', 'monospace'],
        mono: ['DM Mono', 'monospace'],
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
        /* Gray scale: warm neutrals as default; themed variants override via CSS vars */
        gray: {
          50:  'hsl(var(--gray-50,  40 30% 98%) / <alpha-value>)',
          100: 'hsl(var(--gray-100, 38 24% 95%) / <alpha-value>)',
          200: 'hsl(var(--gray-200, 35 18% 89%) / <alpha-value>)',
          300: 'hsl(var(--gray-300, 33 13% 79%) / <alpha-value>)',
          400: 'hsl(var(--gray-400, 30 10% 64%) / <alpha-value>)',
          500: 'hsl(var(--gray-500, 28  9% 50%) / <alpha-value>)',
          600: 'hsl(var(--gray-600, 27 11% 38%) / <alpha-value>)',
          700: 'hsl(var(--gray-700, 26 14% 28%) / <alpha-value>)',
          800: 'hsl(var(--gray-800, 25 17% 18%) / <alpha-value>)',
          900: 'hsl(var(--gray-900, 24 20% 11%) / <alpha-value>)',
          950: 'hsl(var(--gray-900, 24 23%  7%) / <alpha-value>)',
        },
        /* Semantic colors: pastel tones, fully tokenized */
        income: {
          50:  'hsl(var(--income-50)  / <alpha-value>)',
          100: 'hsl(var(--income-100) / <alpha-value>)',
          300: 'hsl(var(--income-300) / <alpha-value>)',
          600: 'hsl(var(--income-600) / <alpha-value>)',
          900: 'hsl(var(--income-900) / <alpha-value>)',
        },
        expense: {
          50:  'hsl(var(--expense-50)  / <alpha-value>)',
          100: 'hsl(var(--expense-100) / <alpha-value>)',
          300: 'hsl(var(--expense-300) / <alpha-value>)',
          600: 'hsl(var(--expense-600) / <alpha-value>)',
          900: 'hsl(var(--expense-900) / <alpha-value>)',
        },
        net: {
          50:  'hsl(var(--net-50)  / <alpha-value>)',
          100: 'hsl(var(--net-100) / <alpha-value>)',
          300: 'hsl(var(--net-300) / <alpha-value>)',
          600: 'hsl(var(--net-600) / <alpha-value>)',
          900: 'hsl(var(--net-900) / <alpha-value>)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out both',
        'fade-in-down': 'fadeInDown 0.15s ease-out both',
        'toast-in': 'toastIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-out': 'toastOut 0.2s cubic-bezier(0.4, 0, 1, 1) both',
        'modal-in': 'modalIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-down': 'slideDown 0.2s cubic-bezier(0.22, 1, 0.36, 1) both',
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
