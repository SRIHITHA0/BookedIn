/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        obsidian: '#EFF4FF',
        crimson: {
          DEFAULT: '#2243B6',
          hover:   '#1A35A0',
          light:   '#2D52C8',
        },
        surface: {
          100: '#FFFFFF',
          200: '#F0F5FF',
          300: '#E2EAFF',
          400: '#C7D7F8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        crimson: '0 4px 32px rgba(34, 67, 182, 0.18)',
        'crimson-lg': '0 8px 48px rgba(34, 67, 182, 0.28)',
      },
    },
  },
  plugins: [],
};
