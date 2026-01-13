import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-nunito)', 'sans-serif'],
      },
      colors: {
        brand: {
          green: '#10B981',
          dark: '#059669',
          blue: '#0EA5E9',
          purple: '#8B5CF6',
          orange: '#F59E0B',
        },
        ui: {
          dark: '#131313',
          panel: '#1E1E1E',
          border: '#2A2A2A',
          hover: '#2D2D2D',
        },
      },
      animation: {
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
