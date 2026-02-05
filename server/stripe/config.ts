import Stripe from 'stripe';
import { serverEnv, isProduction } from '@shared/config/env';

if (!serverEnv.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set. Stripe operations will fail.');
}

// Initialize Stripe client with fetch-based HTTP client for Cloudflare Workers compatibility
// This avoids the Node.js HTTP/TLS stack which isn't available in Workers
// See: https://github.com/stripe/stripe-node#usage-with-cloudflare-workers
export const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build', {
  apiVersion: '2026-01-28.clover',
  typescript: true,
  httpClient: Stripe.createFetchHttpClient(),
  telemetry: false, // Disable telemetry for edge environments
});

// Stripe webhook secret for signature verification
export const STRIPE_WEBHOOK_SECRET = serverEnv.STRIPE_WEBHOOK_SECRET;

// Validate webhook secret in production
if (isProduction() && !STRIPE_WEBHOOK_SECRET) {
  console.warn(
    'Warning: STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification will fail.'
  );
}
