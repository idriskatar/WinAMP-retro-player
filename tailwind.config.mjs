/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wa: {
          chassis: '#27272b',
          chassisLight: '#6b6d75',
          chassisDark: '#0d0e10',
          lcdGreen: '#00FF00',
          lcdDim: '#002800',
        }
      }
    },
  },
  plugins: [],
}
