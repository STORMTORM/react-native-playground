/**** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1E1E1E',
        secondary: '#121212',
        accent: '#61DAFB',
        text: '#E0E0E0',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
}
