/**
 * Setup Script for Stripe Credit Pack Products and Prices
 *
 * This script creates the necessary products and one-time prices in Stripe
 * for the credit pack feature.
 *
 * Usage:
 *   npx tsx scripts/setup-stripe-credit-packs.ts
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY must be set in your environment
 *   - Run this script in production AND test mode to create products in both
 *
 * What it does:
 *   1. Creates a "Credit Packs" product in Stripe
 *   2. Creates three one-time prices for Small, Medium, and Large packs
 *   3. Outputs the price IDs that need to be added to your .env file
 */

import Stripe from 'stripe';
import { CREDIT_COSTS } from '../shared/config/credits.config';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ Error: STRIPE_SECRET_KEY environment variable is not set');
  console.error('Please set your Stripe secret key:');
  console.error('  export STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
});

// Credit pack configuration matching subscription.config.ts
const CREDIT_PACKS = [
  {
    key: 'small',
    name: 'Small Credit Pack',
    credits: CREDIT_COSTS.SMALL_PACK_CREDITS,
    priceInCents: 499, // $4.99
    description: '50 credits - Perfect for occasional use',
  },
  {
    key: 'medium',
    name: 'Medium Credit Pack',
    credits: CREDIT_COSTS.MEDIUM_PACK_CREDITS,
    priceInCents: 1499, // $14.99
    description: '200 credits - Best value for one-time purchases',
  },
  {
    key: 'large',
    name: 'Large Credit Pack',
    credits: CREDIT_COSTS.LARGE_PACK_CREDITS,
    priceInCents: 3999, // $39.99
    description: '600 credits - For larger projects',
  },
];

async function setupCreditPacks() {
  console.log('🚀 Setting up Stripe Credit Pack Products and Prices...\n');

  const mode = stripeSecretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE';
  console.log(`📍 Mode: ${mode}\n`);

  try {
    // Create a parent product for all credit packs
    console.log('Creating "Credit Packs" product...');
    const product = await stripe.products.create({
      name: 'SaaS Boilerplate Credit Packs',
      description: 'One-time credit purchases that never expire',
      metadata: {
        type: 'credit_pack',
      },
    });
    console.log(`✅ Product created: ${product.id}\n`);

    // Create prices for each pack
    const priceIds: Record<string, string> = {};

    for (const pack of CREDIT_PACKS) {
      console.log(`Creating price for ${pack.name}...`);
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pack.priceInCents,
        currency: 'usd',
        nickname: pack.name,
        metadata: {
          pack_key: pack.key,
          credits: pack.credits.toString(),
          description: pack.description,
        },
      });

      priceIds[pack.key] = price.id;
      console.log(`✅ Price created: ${price.id} ($${pack.priceInCents / 100})`);
    }

    console.log('\n🎉 Setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 Add these environment variables to your .env file:\n');
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_CREDITS_SMALL=${priceIds.small}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM=${priceIds.medium}`);
    console.log(`NEXT_PUBLIC_STRIPE_PRICE_CREDITS_LARGE=${priceIds.large}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (mode === 'TEST') {
      console.log('⚠️  Remember to run this script again in LIVE mode:');
      console.log('   export STRIPE_SECRET_KEY=sk_live_...');
      console.log('   npx tsx scripts/setup-stripe-credit-packs.ts\n');
    }

    return priceIds;
  } catch (error) {
    console.error('❌ Error setting up credit packs:', error);
    throw error;
  }
}

// Run the setup
setupCreditPacks()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to complete setup:', error);
    process.exit(1);
  });
