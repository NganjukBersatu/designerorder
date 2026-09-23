/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Background utama (putih / cream soft, bukan pink)
        cream: {
          DEFAULT: '#F8F7F4',
          50: '#FDFCFA',
          100: '#F8F7F4',
          200: '#F3F1EC',
        },

        // Brand / Primary (teal gelap dari screenshot)
        brand: {
          50:  '#E8F2F1',
          100: '#D1E5E3',
          200: '#A3CBC6',
          300: '#6FA9A2',
          400: '#3D8A82',
          500: '#2C7A74',   // utama
          600: '#246560',
          700: '#1C504C',
          800: '#163F3C',
          900: '#12332F',
        },

        // Sidebar (sangat gelap seperti di screenshot)
        sidebar: {
          DEFAULT: '#0F1C1A',
          50:  '#162825',
          100: '#1A302C',
          800: '#0C1715',
          900: '#0A1211',
        },

        // Gold (untuk aksen logo / highlight)
        gold: {
          100: '#F6E9D2',
          400: '#D9A448',
          500: '#C98A3B',
          600: '#A76F2C',
        },

        // Status
        ok: {
          100: '#DEEEE2',
          500: '#3F7D5C',
          600: '#2F6047',
        },
        warn: {
          100: '#F7EFD2',
          500: '#C9A227',
          600: '#A9860F',
          700: '#7A620A',
        },
        danger: {
          100: '#F5DFDA',
          500: '#B44B3D',
          600: '#943A2F',
        },

        // Teks (punya kamu, tidak diubah)
        ink: {
          900: '#20302D',
          800: '#2D3D3A',
          700: '#3B4B47',
          600: '#4F6360',
          500: '#647A75',
          400: '#869A95',
          300: '#A9BAB5',
          200: '#C6D1CD',
          100: '#E4E9E6',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(32, 48, 45, 0.05), 0 1px 3px rgba(32, 48, 45, 0.06)',
        'card-hover': '0 4px 12px rgba(32, 48, 45, 0.08)',
        sidebar: '4px 0 24px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        card: '12px',
        'card-lg': '16px',
      },
    },
  },
  plugins: [],
}