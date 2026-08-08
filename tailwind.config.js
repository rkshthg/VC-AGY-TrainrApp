/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        deepGreen: {
          DEFAULT: '#0A1913',
          dark: '#06100C',
          surface: '#122920',
          elevated: '#18362B',
          inset: '#08140F',
          border: '#1E4237',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E5C158',
          bright: '#F5D77F',
          dark: '#9E8331',
          muted: '#2B2516',
          border: '#D4AF3740',
        },
        sage: {
          DEFAULT: '#8AA69B',
          light: '#A2BDB2',
          dark: '#4F685D',
        },
      },
    },
  },
  plugins: [],
}

