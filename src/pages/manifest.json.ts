/**
 * Web App Manifest
 * PWA manifest for installable app support
 */

import type { APIRoute } from 'astro';
import { clientEnv } from '@shared/config/env';

const APP_NAME = clientEnv.APP_NAME;

export const GET: APIRoute = () => {
  const manifest = {
    name: `${APP_NAME} - SaaS Content on Autopilot`,
    short_name: APP_NAME,
    description:
      'Scale your organic traffic on autopilot. Multi-model AI content that ranks and reads human.',
    start_url: '/',
    display: 'standalone' as const,
    background_color: '#0d1117',
    theme_color: '#16a34a',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    },
  });
};
