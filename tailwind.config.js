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
        // RDR2 Frontier Journal Palette (Full Consistent Wild West Theme)
        rdr: {
          main: '#211A15',
          leather: '#30241B',
          'leather-dark': '#1C1510',
          'leather-border': '#3D2D21',
          brown: '#493522',
          'brown-light': '#5A422B',
          parchment: '#D9C39B',
          'parchment-dark': '#CBB184',
          paper: '#F0E4C9',
          'paper-light': '#F7EFE1',
          gold: '#B18A4C',
          'gold-bright': '#C69B56',
          'gold-dim': '#8F6E3B',
          ink: '#30251B',
          'ink-dark': '#201811',
          'warm-white': '#F5EBD8',
          muted: '#8B7861',
          'border-dark': '#3D2D21',
          'border-gold': '#B18A4C'
        },
        brand: {
          50: '#F5EBD8',
          100: '#F0E4C9',
          200: '#D9C39B',
          300: '#CBB184',
          400: '#B18A4C',
          500: '#8F6E3B',
          600: '#493522',
          700: '#3D2D21',
          800: '#30241B',
          900: '#211A15',
          950: '#1C1510'
        },
        accent: {
          50: '#FBF7F0',
          100: '#F5EBD8',
          200: '#EBD7B2',
          300: '#D9C39B',
          400: '#C69B56',
          500: '#B18A4C',
          600: '#8F6E3B',
          700: '#6B522B',
          800: '#493522',
          900: '#30241B'
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
          '"Playfair Display"',
          'Cinzel',
          'Georgia',
          'Cambria',
          'serif'
        ],
        journal: [
          '"Playfair Display"',
          'Georgia',
          'serif'
        ],
        frontier: [
          'Cinzel',
          '"Playfair Display"',
          'serif'
        ]
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        'card': '0 2px 6px 0 rgba(0, 0, 0, 0.35), 0 1px 3px -1px rgba(0, 0, 0, 0.2)',
        'elevation': '0 4px 12px -1px rgba(0, 0, 0, 0.45), 0 2px 6px -2px rgba(0, 0, 0, 0.35)',
        'floating': '0 10px 25px -3px rgba(0, 0, 0, 0.55), 0 4px 10px -4px rgba(0, 0, 0, 0.4)',
        'gold-glow': '0 0 18px rgba(177, 138, 76, 0.35)',
        'gold-border': '0 0 0 1px rgba(177, 138, 76, 0.4), 0 2px 8px rgba(0, 0, 0, 0.4)',
        'leather': '0 4px 20px -2px rgba(28, 21, 16, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'journal-card': '0 8px 30px -4px rgba(28, 21, 16, 0.5), 0 2px 8px -2px rgba(0, 0, 0, 0.3)',
        'parchment-sheet': '0 6px 24px -2px rgba(33, 26, 21, 0.35), inset 0 0 40px rgba(177, 138, 76, 0.08)'
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '14px',
        '2xl': '18px'
      }
    },
  },
  plugins: [],
}
