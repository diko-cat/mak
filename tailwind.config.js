/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#162a26',
        forest: '#174b40',
        mint: '#dcece5',
        paper: '#f6f8f7',
        coral: '#e9866c',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        soft: '0 24px 70px rgba(20, 47, 40, 0.10)',
      },
    },
  },
  plugins: [],
};
