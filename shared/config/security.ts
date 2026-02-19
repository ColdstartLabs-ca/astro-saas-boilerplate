/**
 * Security configuration for the application
 * Contains CSP policies and other security-related settings
 */

import { isDevelopment } from './env';

/**
 * Content Security Policy configuration
 * This policy defines what resources the application can load
 */
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // Required: Astro 5 injects inline hydration scripts for island components.
    // Removing this requires per-request nonce generation (significant refactor).
    "'unsafe-inline'",
    // Required: Astro/Vite injects eval-based code in dev. Also used by some
    // third-party SDKs (Stripe, Google Identity Services) at runtime.
    // TODO: Test removing this in production — our codebase has no direct eval usage.
    //       wasm-unsafe-eval below covers our WASM needs (background removal).
    "'unsafe-eval'",
    // Required: @imgly/background-removal uses WebAssembly.compile()
    "'wasm-unsafe-eval'",
    'blob:',
    'https://*.googletagmanager.com',
    'https://js.stripe.com',
    'https://accounts.google.com',
    'https://static.cloudflareinsights.com',
  ],
  'style-src': [
    "'self'",
    // Required: React inline styles, Astro CSS injection, and third-party widgets
    // (Google Identity Services, Stripe) inject inline styles at runtime.
    "'unsafe-inline'",
    'https://accounts.google.com',
    'https://fonts.googleapis.com',
  ],
  'img-src': ["'self'", 'blob:', 'data:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': [
    "'self'",
    'blob:',
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://*.amplitude.com',
    'https://*.google-analytics.com',
    'https://*.googletagmanager.com',
    'https://rum.baselime.io',
    'https://api.stripe.com',
    'https://accounts.google.com',
    'https://staticimgly.com', // @imgly/background-removal WASM model
  ],
  'frame-src': ["'self'", 'https://js.stripe.com', 'https://accounts.google.com'],
  'worker-src': ["'self'", 'blob:'], // Web Workers for @imgly/background-removal
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': [],
} as const;

/**
 * Build CSP header string from policy object
 * Note: upgrade-insecure-requests is skipped in development to allow HTTP localhost
 */
export function buildCspHeader(): string {
  return Object.entries(CSP_POLICY)
    .filter(([directive]) => {
      // Skip upgrade-insecure-requests in development (breaks HTTP localhost)
      if (isDevelopment() && directive === 'upgrade-insecure-requests') {
        return false;
      }
      return true;
    })
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive;
      }
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Standard security headers for all responses
 * Note: Referrer-Policy differs by environment for Google Identity Services compatibility
 * - Development (HTTP localhost): 'no-referrer-when-downgrade' required for GIS
 * - Production (HTTPS): 'strict-origin-when-cross-origin' for security
 */
export const getSecurityHeaders = (): Record<string, string> => ({
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': isDevelopment()
    ? 'no-referrer-when-downgrade'
    : 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});

/**
 * @deprecated Use getSecurityHeaders() instead for environment-aware headers
 */
export const SECURITY_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

/**
 * Public API routes that don't require authentication
 * Supports wildcard patterns with * suffix
 */
export const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/models', // Available AI models and image presets (public, read-only)
  '/api/webhooks/*', // All webhook routes are public (they use their own auth mechanisms)
  '/api/analytics/*', // Analytics events support both anonymous and authenticated tracking
  '/api/cron/*', // Cron routes use x-cron-secret header auth, not JWT
  '/api/proxy-image', // Download proxy for CORS bypass (validates allowed domains internally)
  '/api/support/*', // Support contact form (public, uses validation and rate limiting)
  '/api/gsc/callback', // Google OAuth callback (uses state param + project lookup for auth)
  '/api/feeds/*', // RSS feeds (public, uses feed token auth)
] as const;
