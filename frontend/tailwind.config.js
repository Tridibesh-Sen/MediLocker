/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#0b3254',
          deep: '#061c30',
          saffron: '#ff9933',
          green: '#138808',
          ash: '#4b5563',
        },
        health: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Manrope"', '"DM Sans"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(11, 50, 84, 0.08), 0 2px 6px -1px rgba(11, 50, 84, 0.04)',
        'card-hover': '0 12px 28px -4px rgba(11, 50, 84, 0.12), 0 4px 10px -2px rgba(11, 50, 84, 0.06)',
      }
    },
  },
  plugins: [],
}
