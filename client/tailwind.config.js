const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  safelist: [
    // Status chip colors
    'bg-green-100', 'text-green-800', 'dark:bg-green-900', 'dark:text-green-200',
    'bg-red-100', 'text-red-700', 'text-red-800', 'dark:bg-red-900', 'dark:text-red-200', 'dark:text-red-300',
    'bg-blue-100', 'text-blue-800', 'dark:bg-blue-900', 'dark:text-blue-200',
    'bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-200',
  ],
  theme: {
    fontSize: {
      ...defaultTheme.fontSize,
      xs: ['0.9375rem', { lineHeight: '1.45rem' }],
      sm: ['1rem', { lineHeight: '1.6rem' }],
    },
    extend: {},
  },
  plugins: [],
}
