/**
 * Web App Manifest
 * PWA manifest for installable app support
 */

import type { APIRoute } from 'astro';
import { clientEnv } from '@shared/config/env';

const APP_NAME = clientEnv.APP_NAME;

export const GET: APIRoute = () => {
  const manifest = {
    name: `${APP_NAME} - Image Upscaling & Enhancement`,
    short_name: APP_NAME,
    description:
      'Transform your images with cutting-edge AI. Upscale, enhance, and restore details with professional quality.',
    start_url: '/',
    display: 'standalone' as const,
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
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
