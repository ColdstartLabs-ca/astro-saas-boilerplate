/* eslint-disable import/no-default-export */
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './client/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './server/**/*.{js,ts,jsx,tsx}',
    './shared/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '475px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['DM Sans', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // Green brand colors (from UI_TEMPLATE)
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Updated dark theme colors
        main: 'rgb(var(--color-bg-base) / <alpha-value>)',
        surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
        'surface-light': 'rgb(var(--color-bg-surface-light) / <alpha-value>)',
        elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)',

        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          hover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          light: 'rgb(var(--color-accent-light) / <alpha-value>)',
        },

        // Secondary = slate-400 (body text). Green brand accent lives in `brand-600`.
        secondary: {
          DEFAULT: 'rgb(var(--color-text-secondary) / <alpha-value>)',
        },

        // NEW: Tertiary for gradients
        tertiary: 'rgb(var(--color-tertiary) / <alpha-value>)',

        indigo: {
          500: 'rgb(var(--color-accent) / <alpha-value>)',
        },
        // Legacy support
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
        },
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        // Muted = slate-500 (dimmer text, placeholders)
        muted: {
          DEFAULT: 'rgb(var(--color-text-muted) / <alpha-value>)',
          foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
        },
        // Text color aliases (produces text-text-primary, etc. for legacy usage)
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        // Keep existing semantic colors
        border: 'rgb(var(--color-border))',
        error: 'rgb(var(--color-error))',
        success: 'rgb(var(--color-success))',
        warning: 'rgb(var(--color-warning))',
        background: 'rgb(var(--color-background))',
        card: 'rgb(var(--color-card))',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-green-light': '0 0 20px rgba(74, 222, 128, 0.3)',
        'glow-green-mixed': '0 0 30px rgba(34, 197, 94, 0.2), 0 0 30px rgba(74, 222, 128, 0.2)',
        'card-hover': '0 20px 40px rgba(0, 0, 0, 0.2), 0 0 40px rgba(34, 197, 94, 0.1)',
        // UI_TEMPLATE shadow for active nav items (brand-900/20)
        'brand-900': '0 10px 15px -3px rgba(20, 83, 45, 0.2), 0 4px 6px -2px rgba(20, 83, 45, 0.2)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(34, 197, 94, 0.5)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        // From UI_TEMPLATE
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        scan: {
          '0%': { top: '-10%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '110%', opacity: '0' },
        },
        typing: {
          '0%': { width: '0' },
          '50%': { width: '100%' },
          '100%': { width: '100%' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        fadeIn: 'fadeIn 0.3s ease-out',
        slideInRight: 'slideInRight 0.3s ease-out',
        progress: 'progress 2s ease-in-out infinite',
        // From UI_TEMPLATE
        blob: 'blob 7s infinite',
        scroll: 'scroll 25s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        scan: 'scan 4s linear infinite',
        typing: 'typing 3s steps(40, end) infinite alternate',
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'rgb(var(--color-text-secondary))',
            '--tw-prose-headings': 'rgb(var(--color-text-primary))',
            '--tw-prose-lead': 'rgb(var(--color-text-secondary))',
            '--tw-prose-links': 'rgb(var(--color-accent))',
            '--tw-prose-bold': 'rgb(var(--color-text-primary))',
            '--tw-prose-counters': 'rgb(var(--color-text-muted))',
            '--tw-prose-bullets': 'rgb(var(--color-text-muted))',
            '--tw-prose-hr': 'rgba(255, 255, 255, 0.1)',
            '--tw-prose-quotes': 'rgb(var(--color-text-primary))',
            '--tw-prose-quote-borders': 'rgb(var(--color-accent))',
            '--tw-prose-captions': 'rgb(var(--color-text-muted))',
            '--tw-prose-code': 'rgb(var(--color-accent))',
            '--tw-prose-pre-code': 'rgb(var(--color-text-secondary))',
            '--tw-prose-pre-bg': 'rgb(var(--color-bg-surface-light))',
            '--tw-prose-th-borders': 'rgba(255, 255, 255, 0.1)',
            '--tw-prose-td-borders': 'rgba(255, 255, 255, 0.1)',
            // Invert colors (used by prose-invert)
            '--tw-prose-invert-body': 'rgb(var(--color-text-secondary))',
            '--tw-prose-invert-headings': 'rgb(var(--color-text-primary))',
            '--tw-prose-invert-lead': 'rgb(var(--color-text-secondary))',
            '--tw-prose-invert-links': 'rgb(var(--color-accent))',
            '--tw-prose-invert-bold': 'rgb(var(--color-text-primary))',
            '--tw-prose-invert-counters': 'rgb(var(--color-text-muted))',
            '--tw-prose-invert-bullets': 'rgb(var(--color-text-muted))',
            '--tw-prose-invert-hr': 'rgba(255, 255, 255, 0.1)',
            '--tw-prose-invert-quotes': 'rgb(var(--color-text-primary))',
            '--tw-prose-invert-quote-borders': 'rgb(var(--color-accent))',
            '--tw-prose-invert-captions': 'rgb(var(--color-text-muted))',
            '--tw-prose-invert-code': 'rgb(var(--color-accent))',
            '--tw-prose-invert-pre-code': 'rgb(var(--color-text-secondary))',
            '--tw-prose-invert-pre-bg': 'rgb(var(--color-bg-surface-light))',
            '--tw-prose-invert-th-borders': 'rgba(255, 255, 255, 0.1)',
            '--tw-prose-invert-td-borders': 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
  },
  plugins: [typography],
};
