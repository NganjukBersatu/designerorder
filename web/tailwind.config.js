/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        cream: {
          DEFAULT: '#F7F5F0', // ← penting! biar bg-cream juga jalan
          50:  '#FDFCFA',
          100: '#F9F7F2',
          200: '#F7F5F0',
          300: '#EFECE5',
        },

        brand: {
          50:  '#E8F3F1',
          100: '#D0E7E3',
          200: '#A8D1CB',
          300: '#6FB3AA',
          400: '#3D8F86',
          500: '#2C7A74',
          600: '#246560',
          700: '#1C504C',
          800: '#163F3C',
          900: '#12332F',
          950: '#0C2422',
        },

        sidebar: {
          DEFAULT: '#152826',
          50:  '#1A322F',
          100: '#1E3A37',
          200: '#23423E',
          800: '#0F1F1D',
          900: '#0A1615',
        },

        gold: {
          100: '#F8EED9',
          200: '#F0DCB3',
          400: '#D9A448',
          500: '#C98A3B',
          600: '#A76F2C',
        },

        ok: {
          50:  '#EAF6EF',
          100: '#D4EDDC',
          400: '#4CAF7A',
          500: '#3F7D5C',
          600: '#2F6047',
        },
        warn: {
          50:  '#FBF6E9',
          100: '#F7EFD2',
          400: '#E0B93A',
          500: '#C9A227',
          600: '#A9860F',
        },
        progress: {
          50:  '#E8F4F2',
          100: '#D1E9E5',
          400: '#4BA89C',
          500: '#2C7A74',
          600: '#246560',
        },
        danger: {
          100: '#F5DFDA',
          500: '#B44B3D',
          600: '#943A2F',
        },

        ink: {
          950: '#0F1A18',
          900: '#1A2B28',
          800: '#243835',
          700: '#2F4642',
          600: '#3D5A55',
          500: '#56706B',
          400: '#7A908B',
          300: '#A0B3AE',
          200: '#C5D2CE',
          100: '#E2EAE7',
          50:  '#F1F5F3',
        },
      },

      boxShadow: {
        card: '0 1px 2px rgba(26, 43, 40, 0.04), 0 1px 3px rgba(26, 43, 40, 0.06)',
        'card-hover': '0 4px 12px rgba(26, 43, 40, 0.08), 0 2px 4px rgba(26, 43, 40, 0.04)',
        'soft-lg': '0 8px 24px rgba(26, 43, 40, 0.07)',
        sidebar: '4px 0 24px rgba(0, 0, 0, 0.12)',
        'brand-glow': '0 8px 32px rgba(44, 122, 116, 0.25)',
      },

      borderRadius: {
        card: '12px',
        'card-lg': '16px',
        '2.5xl': '1.25rem',
      },

      backgroundImage: {
        'cream-gradient': 'linear-gradient(180deg, #FDFCFA 0%, #F7F5F0 100%)',
        'brand-gradient': 'linear-gradient(135deg, #2C7A74 0%, #1C504C 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #1A322F 0%, #0F1F1D 100%)',
      },

      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}