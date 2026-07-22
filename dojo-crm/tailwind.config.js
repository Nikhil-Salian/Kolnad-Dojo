/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14110F',
        surface: '#1E1A16',
        surface2: '#26201A',
        paper: '#EDE6D6',
        seal: '#C6362A',
        gold: '#D4A843',
        moss: '#4C7A5E',
        muted: '#948B7E',
        hairline: '#3A322A',
      },
      fontFamily: {
        display: ['var(--font-mincho)', 'serif'],
        body: ['var(--font-kaku)', 'sans-serif'],
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        stamp: {
          '0%': { transform: 'scale(2.2) rotate(-8deg)', opacity: '0' },
          '60%': { transform: 'scale(0.95) rotate(-8deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-8deg)', opacity: '1' },
        },
        rise: {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        stamp: 'stamp 0.6s cubic-bezier(.2,.8,.2,1) both',
        rise: 'rise 0.5s ease both',
      },
    },
  },
  plugins: [],
};
