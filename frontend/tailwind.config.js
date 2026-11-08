/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple-inspired restrained palette
        canvas: '#F5F5F7',
        surface: '#FFFFFF',
        'surface-subtle': '#F8F9FA',
        content: {
          primary: '#1D1D1F',
          secondary: '#515154',
          tertiary: '#86868B',
        },
        accent: {
          DEFAULT: '#0071E3',
          hover: '#0077ED',
          subtle: '#E8F2FD',
        },
        risk: {
          low: '#007A3D',
          'low-bg': '#EAF7EE',
          moderate: '#B25000',
          'moderate-bg': '#FFF3E8',
          high: '#D70015',
          'high-bg': '#FDF2F2',
        },
        separator: {
          DEFAULT: '#D2D2D7',
          light: '#E5E5EA',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        pill: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.05)',
        card: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        modal: '0 12px 32px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
}
