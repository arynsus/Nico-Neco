import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7d5d51', dim: '#705146' },
        'primary-container': '#fcd1c2',
        'on-primary': '#ffffff',
        'on-primary-container': '#63463b',
        secondary: { DEFAULT: '#6f634b', dim: '#635740' },
        'secondary-container': '#f2e0c3',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#5c503a',
        tertiary: { DEFAULT: '#5d6947', dim: '#515c3c' },
        'tertiary-container': '#f1ffd4',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#576342',
        error: { DEFAULT: '#c0262d', dim: '#9f0519' },
        'error-container': '#fb5151',
        'on-error': '#ffffff',
        surface: {
          DEFAULT: '#fffbff',
          dim: '#e6e2d6',
          bright: '#fffbff',
        },
        'surface-container': {
          lowest: '#ffffff',
          low: '#fdf9ef',
          DEFAULT: '#f7f3e9',
          high: '#f1eee3',
          highest: '#ece8dd',
        },
        'on-surface': '#393832',
        'on-surface-variant': '#66645e',
        outline: { DEFAULT: '#838079', variant: '#bcb9b1' },
        'inverse-surface': '#0f0e0a',
        'inverse-on-surface': '#9f9d95',
        'inverse-primary': '#fcd1c2',
        'surface-tint': '#7d5d51',
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        headline: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        ambient: '0 20px 40px rgba(57, 56, 50, 0.06)',
        'ambient-lg': '0 32px 64px rgba(57, 56, 50, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
