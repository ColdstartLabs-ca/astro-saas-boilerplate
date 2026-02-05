/// <reference types="astro/client" />

/* eslint-disable @typescript-eslint/naming-convention */
 

interface ImportMetaEnv {
  // Client environment variables (PUBLIC_* prefix)
  readonly PUBLIC_APP_NAME: string;
  readonly PUBLIC_ENV: string;
  readonly PUBLIC_BASE_URL: string;
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_GOOGLE_CLIENT_ID: string;
  readonly PUBLIC_FACEBOOK_CLIENT_ID: string;
  readonly PUBLIC_AZURE_CLIENT_ID: string;
  readonly PUBLIC_BASELIME_KEY: string;
  readonly PUBLIC_AMPLITUDE_API_KEY: string;
  readonly PUBLIC_GA_MEASUREMENT_ID: string;
  readonly PUBLIC_AHREFS_ANALYTICS_KEY: string;
  readonly PUBLIC_ENABLE_GOOGLE_OAUTH: string;
  readonly PUBLIC_ENABLE_AZURE_OAUTH: string;
  readonly PUBLIC_ADMIN_EMAIL: string;
  readonly PUBLIC_SUPPORT_EMAIL: string;
  readonly PUBLIC_LEGAL_EMAIL: string;
  readonly PUBLIC_PRIVACY_EMAIL: string;
  readonly PUBLIC_SALES_EMAIL: string;
  readonly PUBLIC_TWITTER_HANDLE: string;
  readonly PUBLIC_APP_SLUG: string;
  readonly PUBLIC_DOWNLOAD_PREFIX: string;
  readonly PUBLIC_BATCH_FOLDER_NAME: string;
  readonly PUBLIC_CACHE_USER_KEY_PREFIX: string;
  readonly PUBLIC_WEB_SERVICE_NAME: string;
  readonly PUBLIC_CRON_SERVICE_NAME: string;
  readonly PUBLIC_GITHUB_USER: string;
  readonly PUBLIC_GITHUB_REPO: string;
  readonly PUBLIC_LAST_UPDATED_DATE: string;
  readonly PUBLIC_PRIMARY_DOMAIN: string;
  readonly PUBLIC_APP_DOMAIN: string;
  readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  readonly PUBLIC_STRIPE_PRICE_CREDITS_SMALL: string;
  readonly PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM: string;
  readonly PUBLIC_STRIPE_PRICE_CREDITS_LARGE: string;

  // Server environment variables (no prefix)
  readonly ENV?: 'development' | 'production' | 'test';
  readonly APP_NAME?: string;
  readonly NODE_ENV?: string;
  readonly PLAYWRIGHT_TEST?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly STRIPE_SECRET_KEY?: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;
  readonly STRIPE_STARTER_MONTHLYLY_PRICE_ID?: string;
  readonly STRIPE_HOBBY_MONTHLYLY_PRICE_ID?: string;
  readonly STRIPE_PRO_MONTHLYLY_PRICE_ID?: string;
  readonly STRIPE_BUSINESS_MONTHLYLY_PRICE_ID?: string;
  readonly BASELIME_API_KEY?: string;
  readonly AMPLITUDE_API_KEY?: string;
  readonly ALLOWED_ORIGIN?: string;
  readonly CF_PAGES_URL?: string;
  readonly CLOUDFLARE_API_TOKEN?: string;
  readonly CLOUDFLARE_ACCOUNT_ID?: string;
  readonly CLOUDFLARE_ZONE_ID?: string;
  readonly DOMAIN_NAME?: string;
  readonly WORKER_NAME?: string;
  readonly CRON_SECRET?: string;
  readonly TEST_AUTH_TOKEN?: string;
  readonly BREVO_API_KEY?: string;
  readonly RESEND_API_KEY?: string;
  readonly EMAIL_FROM_ADDRESS?: string;
  readonly SUPPORT_EMAIL?: string;
  readonly BASE_URL?: string;
  readonly ALLOW_TRANSACTIONAL_EMAILS_IN_DEV?: string;
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENROUTER_VL_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
