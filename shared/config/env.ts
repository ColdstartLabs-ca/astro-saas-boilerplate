import { z } from 'zod';

/**
 * Centralized environment variable configuration.
 *
 * All environment variables should be accessed through this module.
 * Direct usage of import.meta.env is prohibited by ESLint rules.
 *
 * Usage:
 * - Client-side: import { clientEnv } from '@shared/config/env'
 * - Server-side: import { serverEnv } from '@shared/config/env'
 */

// =============================================================================
// Client-side environment variables (PUBLIC_*)
// These are safe to expose to the browser
// =============================================================================

const clientEnvSchema = z.object({
  APP_NAME: z.string().default('AutopilotRank'),
  ENV: z.string().default('development'),
  BASE_URL: z.string().url().default('http://localhost:4321'),
  SUPABASE_URL: z.string().url().default('https://example.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default(''),
  GOOGLE_CLIENT_ID: z.string().default(''),
  FACEBOOK_CLIENT_ID: z.string().default(''),
  AZURE_CLIENT_ID: z.string().default(''),
  BASELIME_KEY: z.string().default(''),
  // Analytics
  AMPLITUDE_API_KEY: z.string().default(''),
  GA_MEASUREMENT_ID: z.string().default(''),
  AHREFS_ANALYTICS_KEY: z.string().default(''),
  // OAuth Provider Toggles
  ENABLE_GOOGLE_OAUTH: z.string().default('true'),
  ENABLE_AZURE_OAUTH: z.string().default('false'),
  // Contact
  ADMIN_EMAIL: z.string().email().default('admin@autopilotrank.com'),
  SUPPORT_EMAIL: z.string().email().default('support@autopilotrank.com'),
  LEGAL_EMAIL: z.string().email().default('legal@autopilotrank.com'),
  PRIVACY_EMAIL: z.string().email().default('privacy@autopilotrank.com'),
  SALES_EMAIL: z.string().email().default('sales@autopilotrank.com'),
  TWITTER_HANDLE: z.string().default('autopilotrank'),
  // App Configuration
  APP_SLUG: z.string().default('autopilotrank'),
  DOWNLOAD_PREFIX: z.string().default('autopilotrank'),
  BATCH_FOLDER_NAME: z.string().default('autopilotrank_batch'),
  CACHE_USER_KEY_PREFIX: z.string().default('autopilotrank'),
  WEB_SERVICE_NAME: z.string().default('autopilotrank-web'),
  CRON_SERVICE_NAME: z.string().default('autopilotrank-cron'),
  // GitHub
  GITHUB_USER: z.string().default('your-github-user'),
  GITHUB_REPO: z.string().default('autopilotrank'),
  // Legal
  LAST_UPDATED_DATE: z.string().default('February 4, 2026'),
  // Domains and URLs
  PRIMARY_DOMAIN: z.string().default('autopilotrank.com'),
  APP_DOMAIN: z.string().default('autopilotrank.com'),
  // Stripe
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),
  // Stripe Credit Pack Price IDs (renamed from NEXT_PUBLIC_* to STRIPE_*)
  STRIPE_PRICE_CREDITS_SMALL: z.string().default('price_credits_small'),
  STRIPE_PRICE_CREDITS_MEDIUM: z.string().default('price_credits_medium'),
  STRIPE_PRICE_CREDITS_LARGE: z.string().default('price_credits_large'),
});

export type IClientEnv = z.infer<typeof clientEnvSchema>;

function loadClientEnv(): IClientEnv {
  // Guard against import.meta.env being undefined (e.g., in Playwright tests)
  // In ESM, import.meta always exists, but import.meta.env may not
  const metaEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env
      : ({} as Record<string, string | undefined>);

  const env = {
    APP_NAME: metaEnv.PUBLIC_APP_NAME || 'AutopilotRank',
    ENV: metaEnv.PUBLIC_ENV || 'development',
    BASE_URL: metaEnv.PUBLIC_BASE_URL || 'http://localhost:4321',
    PUBLIC_BASE_URL: metaEnv.PUBLIC_BASE_URL || 'https://autopilotrank.com',
    SUPABASE_URL: metaEnv.PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
    SUPABASE_ANON_KEY: metaEnv.PUBLIC_SUPABASE_ANON_KEY || '',
    GOOGLE_CLIENT_ID: metaEnv.PUBLIC_GOOGLE_CLIENT_ID || '',
    FACEBOOK_CLIENT_ID: metaEnv.PUBLIC_FACEBOOK_CLIENT_ID || '',
    AZURE_CLIENT_ID: metaEnv.PUBLIC_AZURE_CLIENT_ID || '',
    BASELIME_KEY: metaEnv.PUBLIC_BASELIME_KEY || '',
    // Analytics
    AMPLITUDE_API_KEY: metaEnv.PUBLIC_AMPLITUDE_API_KEY || '',
    GA_MEASUREMENT_ID: metaEnv.PUBLIC_GA_MEASUREMENT_ID || '',
    AHREFS_ANALYTICS_KEY: metaEnv.PUBLIC_AHREFS_ANALYTICS_KEY || '',
    // OAuth Provider Toggles
    ENABLE_GOOGLE_OAUTH: metaEnv.PUBLIC_ENABLE_GOOGLE_OAUTH || 'true',
    ENABLE_AZURE_OAUTH: metaEnv.PUBLIC_ENABLE_AZURE_OAUTH || 'false',
    // Contact
    ADMIN_EMAIL: metaEnv.PUBLIC_ADMIN_EMAIL || 'admin@autopilotrank.com',
    SUPPORT_EMAIL: metaEnv.PUBLIC_SUPPORT_EMAIL || 'support@autopilotrank.com',
    LEGAL_EMAIL: metaEnv.PUBLIC_LEGAL_EMAIL || 'legal@autopilotrank.com',
    PRIVACY_EMAIL: metaEnv.PUBLIC_PRIVACY_EMAIL || 'privacy@autopilotrank.com',
    SALES_EMAIL: metaEnv.PUBLIC_SALES_EMAIL || 'sales@autopilotrank.com',
    TWITTER_HANDLE: metaEnv.PUBLIC_TWITTER_HANDLE || 'autopilotrank',
    // App Configuration
    APP_SLUG: metaEnv.PUBLIC_APP_SLUG || 'autopilotrank',
    DOWNLOAD_PREFIX: metaEnv.PUBLIC_DOWNLOAD_PREFIX || 'autopilotrank',
    BATCH_FOLDER_NAME: metaEnv.PUBLIC_BATCH_FOLDER_NAME || 'autopilotrank_batch',
    CACHE_USER_KEY_PREFIX: metaEnv.PUBLIC_CACHE_USER_KEY_PREFIX || 'autopilotrank',
    WEB_SERVICE_NAME: metaEnv.PUBLIC_WEB_SERVICE_NAME || 'autopilotrank-web',
    CRON_SERVICE_NAME: metaEnv.PUBLIC_CRON_SERVICE_NAME || 'autopilotrank-cron',
    // GitHub
    GITHUB_USER: metaEnv.PUBLIC_GITHUB_USER || 'your-github-user',
    GITHUB_REPO: metaEnv.PUBLIC_GITHUB_REPO || 'autopilotrank',
    // Legal
    LAST_UPDATED_DATE: metaEnv.PUBLIC_LAST_UPDATED_DATE || 'February 4, 2026',
    // Domains and URLs
    PRIMARY_DOMAIN: metaEnv.PUBLIC_PRIMARY_DOMAIN || 'autopilotrank.com',
    APP_DOMAIN: metaEnv.PUBLIC_APP_DOMAIN || 'autopilotrank.com',
    // Stripe
    STRIPE_PUBLISHABLE_KEY: metaEnv.PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    // Stripe Credit Pack Price IDs
    STRIPE_PRICE_CREDITS_SMALL: metaEnv.PUBLIC_STRIPE_PRICE_CREDITS_SMALL || 'price_credits_small',
    STRIPE_PRICE_CREDITS_MEDIUM:
      metaEnv.PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM || 'price_credits_medium',
    STRIPE_PRICE_CREDITS_LARGE: metaEnv.PUBLIC_STRIPE_PRICE_CREDITS_LARGE || 'price_credits_large',
  };

  return clientEnvSchema.parse(env);
}

/**
 * Generate logo abbreviation from app name.
 * Takes the first letter of each word, up to 2 characters.
 */
export function getAppLogoAbbr(appName?: string): string {
  const name = appName || clientEnv.APP_NAME;
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '';
  if (words.length === 1) {
    // For single word, take first 2 letters
    return words[0].substring(0, 2).toUpperCase();
  }
  // For multiple words, take first letter of each word, up to 2 letters
  return words
    .slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Client-side environment variables.
 * Safe to use in both client and server components.
 */
export const clientEnv = loadClientEnv();

// =============================================================================
// Server-side environment variables (secrets)
// These are NEVER exposed to the browser
// =============================================================================

const serverEnvSchema = z.object({
  ENV: z.enum(['development', 'production', 'test']).default('development'),
  // App Name
  APP_NAME: z.string().default('AutopilotRank'),
  // Node environment
  NODE_ENV: z.string().optional(),
  // Test flags - Playwright sets this to "1" as a string, which Vite may coerce to number
  PLAYWRIGHT_TEST: z.union([z.string(), z.number()]).optional(),
  // Path to mock database file for Playwright tests
  PLAYWRIGHT_MOCK_DB_PATH: z.string().optional(),
  // Public URLs (for server-side use)
  PUBLIC_BASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  BASE_URL: z.string().url().optional(),
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  // Stripe
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  // Stripe Price IDs (legacy env vars — actual source of truth is subscription.config.ts)
  STRIPE_STARTER_MONTHLY_PRICE_ID: z.string().default(''),
  STRIPE_GROWTH_MONTHLY_PRICE_ID: z.string().default(''),
  STRIPE_AGENCY_MONTHLY_PRICE_ID: z.string().default(''),
  // Baselime monitoring (server-side)
  BASELIME_API_KEY: z.string().default(''),
  // Analytics (server-side HTTP API)
  AMPLITUDE_API_KEY: z.string().default(''),
  // CORS
  ALLOWED_ORIGIN: z.string().default('*'),
  // Cloudflare
  CF_PAGES_URL: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().default(''),
  CLOUDFLARE_ACCOUNT_ID: z.string().default(''),
  CLOUDFLARE_ZONE_ID: z.string().default(''),
  DOMAIN_NAME: z.string().default('autopilotrank.com'),
  WORKER_NAME: z.string().default('autopilotrank'),
  // Cron Job Authentication
  CRON_SECRET: z.string().default(''),
  // Test Authentication
  TEST_AUTH_TOKEN: z.string().optional(),

  // ==========================================
  // EMAIL PROVIDERS
  // ==========================================
  // Brevo (Primary) - 9,000 free emails/month
  BREVO_API_KEY: z.string().default(''),
  // Resend (Fallback) - 3,000 free emails/month
  RESEND_API_KEY: z.string().default(''),
  // Common email settings
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@autopilotrank.com'),
  SUPPORT_EMAIL: z.string().email().default('support@autopilotrank.com'),
  // Allow sending transactional emails in development (for testing)
  ALLOW_TRANSACTIONAL_EMAILS_IN_DEV: z.coerce.boolean().default(false),

  // ==========================================
  // AI PROVIDERS
  // ==========================================
  // OpenRouter for Vision-Language model analysis
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_VL_MODEL: z.string().default('google/gemini-2.0-flash-exp:free'),
  // OpenRouter for text generation (article content)
  OPENROUTER_TEXT_MODEL: z.string().default('openai/gpt-4o'),
  // OpenRouter default model (used by onboarding keyword suggestions)
  OPENROUTER_DEFAULT_MODEL: z.string().default(''),
  // Replicate for image generation
  REPLICATE_API_KEY: z.string().default(''),
  // Available writer presets — format: "key(model-id),key2" (empty = all with defaults)
  AVAILABLE_WRITER_PRESETS: z.string().default(''),
  // Available image presets — format: "key(model-id),key2" (empty = all with defaults)
  AVAILABLE_IMAGE_PRESETS: z.string().default(''),
  // OpenAI for semantic similarity and embeddings
  OPENAI_API_KEY: z.string().default(''),

  // ==========================================
  // AI DETECTION PROVIDERS
  // ==========================================
  // Originality.ai for AI content detection
  ORIGINALITY_AI_API_KEY: z.string().default(''),

  // ==========================================
  // CMS INTEGRATIONS
  // ==========================================
  // CMS encryption key for encrypting WordPress/webhook credentials
  // Generate with: openssl rand -base64 32 (minimum 32 characters recommended)
  CMS_ENCRYPTION_KEY: z.string().default(''),

  // ==========================================
  // GOOGLE OAUTH (GSC + future Google APIs)
  // ==========================================
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().default(''),
  // GSC OAuth state signing secret - used to HMAC-sign the state param in the
  // Google Search Console OAuth flow (CSRF protection). Falls back to CRON_SECRET.
  // Generate with: openssl rand -hex 32
  GSC_STATE_SECRET: z.string().default(''),

  // ==========================================
  // SEO
  // ==========================================
  // IndexNow key for instant URL submission to search engines
  // Generate with: tsx scripts/create-indexnow-keyfile.ts --generate
  INDEXNOW_KEY: z.string().default(''),

  // ==========================================
  // INBOUND WEBHOOKS
  // ==========================================
  // Shared secret for verifying inbound webhook signatures (X-Signature-256 header).
  // Must match the secret configured in the sending AutopilotRank integration.
  // Generate with: openssl rand -hex 32
  INBOUND_WEBHOOK_SECRET: z.string().default(''),
});

export type IServerEnv = z.infer<typeof serverEnvSchema>;

function loadServerEnv(): IServerEnv {
  // Guard against import.meta.env being undefined (e.g., in Playwright tests)
  // In ESM, import.meta always exists, but import.meta.env may not
  const metaEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env
      : ({} as Record<string, string | number | boolean | undefined>);

  // IMPORTANT: Use process.env for non-prefixed environment variables
  // Vite only exposes variables with VITE_* or PUBLIC_* prefixes to import.meta.env
  // For server-side vars like ENV, we need to check process.env directly
  const processEnv = process.env as Record<string, string | number | boolean | undefined>;

  const env = {
    ENV: metaEnv.ENV || processEnv.ENV || processEnv.NODE_ENV || 'development',
    // App Name
    APP_NAME: metaEnv.APP_NAME || metaEnv.PUBLIC_APP_NAME || 'AutopilotRank',
    // Node environment
    NODE_ENV: metaEnv.NODE_ENV,
    // Test flags - Playwright sets this to "1", accept string or number
    PLAYWRIGHT_TEST: metaEnv.PLAYWRIGHT_TEST ?? undefined,
    // Path to mock database for Playwright tests
    PLAYWRIGHT_MOCK_DB_PATH:
      metaEnv.PLAYWRIGHT_MOCK_DB_PATH || processEnv.PLAYWRIGHT_MOCK_DB_PATH || undefined,
    // Public URLs
    SUPABASE_URL: metaEnv.PUBLIC_SUPABASE_URL,
    BASE_URL: metaEnv.PUBLIC_BASE_URL,
    // Supabase
    // NOTE: Secrets fall back to processEnv because in CF Workers, runtime secrets are injected
    // into process.env by middleware (from context.locals.runtime.env). import.meta.env only
    // contains build-time PUBLIC_* vars.
    SUPABASE_SERVICE_ROLE_KEY:
      metaEnv.SUPABASE_SERVICE_ROLE_KEY || processEnv.SUPABASE_SERVICE_ROLE_KEY || '',
    // Stripe
    STRIPE_SECRET_KEY: metaEnv.STRIPE_SECRET_KEY || processEnv.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: metaEnv.STRIPE_WEBHOOK_SECRET || processEnv.STRIPE_WEBHOOK_SECRET || '',
    // Stripe Price IDs (legacy env vars — actual source of truth is subscription.config.ts)
    STRIPE_STARTER_MONTHLY_PRICE_ID:
      metaEnv.STRIPE_STARTER_MONTHLY_PRICE_ID || processEnv.STRIPE_STARTER_MONTHLY_PRICE_ID || '',
    STRIPE_GROWTH_MONTHLY_PRICE_ID:
      metaEnv.STRIPE_GROWTH_MONTHLY_PRICE_ID || processEnv.STRIPE_GROWTH_MONTHLY_PRICE_ID || '',
    STRIPE_AGENCY_MONTHLY_PRICE_ID:
      metaEnv.STRIPE_AGENCY_MONTHLY_PRICE_ID || processEnv.STRIPE_AGENCY_MONTHLY_PRICE_ID || '',
    // Baselime monitoring
    BASELIME_API_KEY: metaEnv.BASELIME_API_KEY || processEnv.BASELIME_API_KEY || '',
    // Analytics (server-side HTTP API)
    AMPLITUDE_API_KEY: metaEnv.AMPLITUDE_API_KEY || processEnv.AMPLITUDE_API_KEY || '',
    // CORS
    ALLOWED_ORIGIN: metaEnv.ALLOWED_ORIGIN || processEnv.ALLOWED_ORIGIN || '*',
    // Cloudflare
    CF_PAGES_URL: metaEnv.CF_PAGES_URL,
    CLOUDFLARE_API_TOKEN: metaEnv.CLOUDFLARE_API_TOKEN || processEnv.CLOUDFLARE_API_TOKEN || '',
    CLOUDFLARE_ACCOUNT_ID: metaEnv.CLOUDFLARE_ACCOUNT_ID || processEnv.CLOUDFLARE_ACCOUNT_ID || '',
    CLOUDFLARE_ZONE_ID: metaEnv.CLOUDFLARE_ZONE_ID || processEnv.CLOUDFLARE_ZONE_ID || '',
    DOMAIN_NAME: metaEnv.DOMAIN_NAME || processEnv.DOMAIN_NAME || 'autopilotrank.com',
    WORKER_NAME: metaEnv.WORKER_NAME || processEnv.WORKER_NAME || 'autopilotrank',
    // Cron Job Authentication
    CRON_SECRET: metaEnv.CRON_SECRET || processEnv.CRON_SECRET || '',
    // Test Authentication
    TEST_AUTH_TOKEN: metaEnv.TEST_AUTH_TOKEN,

    // Email Providers
    BREVO_API_KEY: metaEnv.BREVO_API_KEY || processEnv.BREVO_API_KEY || '',
    RESEND_API_KEY: metaEnv.RESEND_API_KEY || processEnv.RESEND_API_KEY || '',
    EMAIL_FROM_ADDRESS:
      metaEnv.EMAIL_FROM_ADDRESS || processEnv.EMAIL_FROM_ADDRESS || 'noreply@autopilotrank.com',
    SUPPORT_EMAIL:
      metaEnv.SUPPORT_EMAIL ||
      metaEnv.PUBLIC_SUPPORT_EMAIL ||
      processEnv.SUPPORT_EMAIL ||
      'support@autopilotrank.com',
    ALLOW_TRANSACTIONAL_EMAILS_IN_DEV:
      metaEnv.ALLOW_TRANSACTIONAL_EMAILS_IN_DEV ??
      processEnv.ALLOW_TRANSACTIONAL_EMAILS_IN_DEV ??
      'false',

    // AI Providers
    OPENROUTER_API_KEY: metaEnv.OPENROUTER_API_KEY || processEnv.OPENROUTER_API_KEY || '',
    OPENROUTER_VL_MODEL:
      metaEnv.OPENROUTER_VL_MODEL ||
      processEnv.OPENROUTER_VL_MODEL ||
      'google/gemini-2.0-flash-exp:free',
    OPENROUTER_TEXT_MODEL:
      metaEnv.OPENROUTER_TEXT_MODEL || processEnv.OPENROUTER_TEXT_MODEL || 'openai/gpt-4o',
    OPENROUTER_DEFAULT_MODEL:
      metaEnv.OPENROUTER_DEFAULT_MODEL || processEnv.OPENROUTER_DEFAULT_MODEL || '',
    // Replicate for image generation
    REPLICATE_API_KEY: metaEnv.REPLICATE_API_KEY || processEnv.REPLICATE_API_KEY || '',
    // Available writer presets (key(model) format, empty = all)
    AVAILABLE_WRITER_PRESETS:
      metaEnv.AVAILABLE_WRITER_PRESETS || processEnv.AVAILABLE_WRITER_PRESETS || '',
    // Available image presets (key(model) format, empty = all)
    AVAILABLE_IMAGE_PRESETS:
      metaEnv.AVAILABLE_IMAGE_PRESETS || processEnv.AVAILABLE_IMAGE_PRESETS || '',
    // OpenAI for semantic similarity and embeddings
    OPENAI_API_KEY: metaEnv.OPENAI_API_KEY || processEnv.OPENAI_API_KEY || '',
    // AI Detection Providers
    ORIGINALITY_AI_API_KEY:
      metaEnv.ORIGINALITY_AI_API_KEY || processEnv.ORIGINALITY_AI_API_KEY || '',
    // CMS encryption key
    CMS_ENCRYPTION_KEY: metaEnv.CMS_ENCRYPTION_KEY || processEnv.CMS_ENCRYPTION_KEY || '',
    // Google OAuth
    GOOGLE_OAUTH_CLIENT_SECRET:
      metaEnv.GOOGLE_OAUTH_CLIENT_SECRET || processEnv.GOOGLE_OAUTH_CLIENT_SECRET || '',
    // GSC OAuth state signing (separate from CRON_SECRET for security)
    GSC_STATE_SECRET: metaEnv.GSC_STATE_SECRET || processEnv.GSC_STATE_SECRET || '',
    // IndexNow
    INDEXNOW_KEY: metaEnv.INDEXNOW_KEY || processEnv.INDEXNOW_KEY || '',
    // Inbound Webhooks
    INBOUND_WEBHOOK_SECRET:
      metaEnv.INBOUND_WEBHOOK_SECRET || processEnv.INBOUND_WEBHOOK_SECRET || '',
  };

  return serverEnvSchema.parse(env);
}

/**
 * Server-side environment variables.
 * Only use in server components, API routes, and middleware.
 * These values are NEVER sent to the client.
 *
 * Lazy-loaded to prevent `process is not defined` errors when
 * client code imports `clientEnv` from this same module.
 */
let _serverEnv: IServerEnv | null = null;

export const serverEnv: IServerEnv = new Proxy({} as IServerEnv, {
  get(_target, prop: string) {
    if (!_serverEnv) {
      _serverEnv = loadServerEnv();
    }
    return _serverEnv[prop as keyof IServerEnv];
  },
});

/**
 * Reset the serverEnv cache so it re-reads from process.env on next access.
 * Called from middleware after injecting CF runtime secrets into process.env,
 * ensuring secrets are available before any serverEnv property is read.
 */
export function resetServerEnv(): void {
  _serverEnv = null;
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return serverEnv.ENV === 'production';
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return serverEnv.ENV === 'development';
}

/**
 * Check if running in test environment
 * NOTE: Checks import.meta.env directly to handle dynamic environment changes during tests
 */
export function isTest(): boolean {
  // Check both the cached serverEnv and the raw import.meta.env for dynamic test detection
  // Handle string, boolean, and numeric values (Playwright sets PLAYWRIGHT_TEST="1")
  const playwrightTestValue = import.meta.env.PLAYWRIGHT_TEST as
    | string
    | boolean
    | number
    | undefined;
  return (
    serverEnv.ENV === 'test' ||
    import.meta.env.ENV === 'test' ||
    playwrightTestValue === 'true' ||
    playwrightTestValue === true ||
    playwrightTestValue === 1 ||
    playwrightTestValue === '1'
  );
}

// =============================================================================
// Legacy support - deprecated, use clientEnv instead
// =============================================================================

/** @deprecated Use clientEnv instead */
export type Env = IClientEnv;

/** @deprecated Use clientEnv instead */
export function loadEnv(): IClientEnv {
  return clientEnv;
}
