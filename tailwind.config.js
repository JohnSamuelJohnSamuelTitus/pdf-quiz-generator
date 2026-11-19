/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // High-contrast clean dark UI theme
        dark: {
          bg: '#09090b',
          card: '#18181b',
          surface: '#121215',
          border: '#27272a',
          muted: '#a1a1aa',
          text: '#f4f4f5'
        },
        // Fallback mapping for previous theme classes to keep full visual consistency
        rdr: {
          main: '#09090b',
          leather: '#18181b',
          'leather-dark': '#121215',
          'leather-border': '#27272a',
          brown: '#27272a',
          'brown-light': '#3f3f46',
          parchment: '#18181b',
          'parchment-dark': '#121215',
          paper: '#18181b',
          'paper-light': '#27272a',
          gold: '#6366f1',
          'gold-bright': '#818cf8',
          'gold-dim': '#4f46e5',
          ink: '#f4f4f5',
          'ink-dark': '#ffffff',
          'warm-white': '#ffffff',
          muted: '#a1a1aa',
          'border-dark': '#27272a',
          'border-gold': '#6366f1'
        },
        brand: {
          50: '#f4f4f5',
          100: '#e4e4e7',
          200: '#d4d4d8',
          300: '#a1a1aa',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#3730a3',
          800: '#18181b',
          900: '#121215',
          950: '#09090b'
        },
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        serif: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ],
        journal: [
          'Inter',
          'sans-serif'
        ],
        frontier: [
          'Inter',
          'sans-serif'
        ]
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
        'elevation': '0 4px 16px -1px rgba(0, 0, 0, 0.6)',
        'floating': '0 10px 30px -3px rgba(0, 0, 0, 0.7)',
        'gold-glow': '0 0 20px rgba(99, 102, 241, 0.25)',
        'gold-border': '0 0 0 1px rgba(99, 102, 241, 0.4)',
        'leather': '0 4px 20px -2px rgba(0, 0, 0, 0.7)',
        'journal-card': '0 8px 30px -4px rgba(0, 0, 0, 0.7)',
        'parchment-sheet': '0 6px 24px -2px rgba(0, 0, 0, 0.7)'
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px'
      }
    }
  },
  plugins: []
};
