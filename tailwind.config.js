/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilita tema oscuro
  theme: {
    extend: {
      colors: {
        // Colores para tema oscuro
        dark: {
          bg: '#0f172a',        // Fondo principal
          card: '#1e293b',      // Tarjetas
          border: '#334155',    // Bordes
          hover: '#475569',     // Hover
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        success: '#10b981',   // Verde
        danger: '#ef4444',    // Rojo
        warning: '#f59e0b',   // Amarillo
      },
    },
  },
  plugins: [],
}
