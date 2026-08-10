/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./features/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        deepGreen: {
          DEFAULT: '#071610',
          dark: '#03110B',
          surface: '#14231C',
          elevated: '#1E2D26',
          bright: '#2D3C35',
          inset: '#08140F',
          border: '#1E4237',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F2CA50',
          bright: '#FFE088',
          dark: '#554300',
          muted: '#241A00',
          border: '#D4AF3740',
        },
        sage: {
          DEFAULT: '#8AA69B',
          light: '#B0CDC1',
          dark: '#324C43',
          muted: '#1B352D',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


