/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Terminal Minimal Theme
        dark: {
          bg: '#0A0A0A',        // Fondo principal
          card: '#111111',      // Tarjetas
          border: '#1F1F1F',    // Bordes
          hover: '#1A1A1A',     // Hover
        },
        terminal: {
          green: '#10B981',     // Accent principal
          blue: '#3B82F6',      // Links, acciones
          purple: '#8B5CF6',    // Admin badge
          amber: '#F59E0B',     // Warnings
          red: '#EF4444',       // Errors, danger
          cyan: '#06B6D4',      // Info
          gray: '#6B7280',      // Text secundario
          muted: '#4B5563',     // Text muted
        },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10B981',       // Terminal green
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'none': '0',
      },
    },
  },
  plugins: [],
}
