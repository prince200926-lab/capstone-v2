/** @type {import('tailwindcss').Config} */
export default {
  // Scan all JSX files in the src directory for Tailwind class usage
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Custom color tokens for the school admin dashboard
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [],
};
