import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './i18n/config.ts';

// i18n locale configuration (synced with i18n/config.ts)
const isPlaywrightTest = process.env.PLAYWRIGHT_TEST === '1' || process.env.ENV === 'test';
const baseOptimizeDeps = [
  '@stripe/react-stripe-js',
  '@stripe/stripe-js',
  'react-hook-form',
  'framer-motion',
  'dayjs',
  'dayjs/plugin/relativeTime',
];
const playwrightOptimizeDeps = [
  'lucide-react',
  'country-flag-icons/react/3x2',
  'zustand',
  'zustand/react/shallow',
  'zod',
  '@baselime/react-rum',
  '@supabase/ssr',
  '@supabase/supabase-js',
  '@tanstack/react-query',
  'react-icons/fa',
  '@amplitude/analytics-browser',
  'dayjs/plugin/utc',
];
const runtimeOptimizeDeps = [
  ...playwrightOptimizeDeps,
];

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Cloudflare Pages configuration
    imageService: 'passthrough',
  }),
  integrations: [
    react({
      // Enable React for client-side islands
      experimentalReactChildren: true,
    }),
    tailwind({
      // Apply Tailwind CSS to all files
      applyBaseStyles: false,
    }),
    mdx({
      // MDX configuration for blog posts
      optimize: true,
    }),
  ],
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: SUPPORTED_LOCALES,
    routing: {
      // Don't prefix default locale (en) in URLs
      prefixDefaultLocale: false,
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        ...baseOptimizeDeps,
        ...runtimeOptimizeDeps,
      ],
      exclude: ['@hookform/resolvers/zod'],
    },
    ssr: {
      optimizeDeps: {
        include: ['picomatch', ...runtimeOptimizeDeps],
        exclude: ['@hookform/resolvers/zod'],
      },
    },
    // Preserve existing path aliases
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@/*': './*',
        '@src/*': './src/*',
        '@i18n/*': './i18n/*',
        '@shared/*': './shared/*',
        '@server/*': './server/*',
        '@client/*': './client/*',
        '@lib/*': './lib/*',
        '@locales/*': './locales/*',
        '@app/*': './app/*',
        // React 18 does not export server.edge; Cloudflare workerd uses the browser renderer.
        'react-dom/server.edge': 'react-dom/server.browser',
      },
    },
  },
  // Ensure trailing slashes are handled correctly
  trailingSlash: 'ignore',
  // Build configuration
  build: {
    // Inline stylesheets under a threshold
    inlineStylesheets: 'auto',
  },
  // Security headers are applied in middleware
  // Disable Astro dev toolbar during Playwright runs to avoid test DOM pollution.
  devToolbar: {
    enabled: !isPlaywrightTest,
  },
  // Image optimization (uses sharp in Cloudflare Workers)
  image: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
});
