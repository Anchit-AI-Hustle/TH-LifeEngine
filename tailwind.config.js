/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // app/responsive.css owns .container (fluid padding per breakpoint).
  corePlugins: {
    container: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
