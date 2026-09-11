/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0fbfa',
          100: '#d9f5f2',
          200: '#b6ebe4',
          300: '#86dbd0',
          400: '#4fc2b4',
          500: '#2ea89a',
          600: '#22877d',
          700: '#206c66',
          800: '#1f5753',
          900: '#1c4946',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd4',
          200: '#ffd8a8',
          300: '#ffbb70',
          400: '#ff9538',
          500: '#fd7712',
          600: '#ee5c08',
          700: '#c54509',
          800: '#9c380f',
          900: '#7e3010',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px 0 rgb(20 90 85 / 0.08)',
        'card-hover': '0 8px 24px 0 rgb(20 90 85 / 0.14)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
