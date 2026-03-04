# SaaS Boilerplate

A production-ready Astro 5 + React 18 (islands architecture) SaaS boilerplate deployed on Cloudflare Pages. Fork this to quickly build your next credits-based SaaS product.

## What's Included

This boilerplate provides the essential infrastructure for building a SaaS product:

- **Authentication**: Supabase Auth with email/password, Google, Facebook, and Azure SSO
- **Billing**: Stripe integration with subscriptions, one-time credit packs, and customer portal
- **Credits System**: Flexible credit-based usage with rollover, expiration, and admin management
- **Admin Panel**: User management, credit adjustments, and subscription oversight
- **Email**: Multi-provider email service (Brevo, Resend) with templates
- **Analytics**: Amplitude server-side tracking
- **Monitoring**: Baselime logging for Cloudflare Workers
- **i18n**: Internationalization support (English, Portuguese)

## Tech Stack

- **Frontend**: Astro 5 (SSR + Islands), React 18, Tailwind CSS
- **Backend**: Astro API Routes (Cloudflare Workers - 10ms CPU limit)
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Deployment**: Cloudflare Pages

## Quick Start

```bash
# Install dependencies
yarn install

# Copy environment files
cp .env.example .env
cp .env.prod.example .env.prod

# Run database migrations
./scripts/setup-supabase.sh --manual

# Start development server
yarn dev
```

## Setup Guides

| Guide                                                         | Description                              |
| ------------------------------------------------------------- | ---------------------------------------- |
| [Supabase Setup](docs/guides/supabase-setup.md)               | Database, Auth, and RLS configuration    |
| [Google OAuth Setup](docs/guides/google-oauth-setup.md)       | Google Cloud Console OAuth configuration |
| [GitHub OAuth Setup](docs/guides/github-oauth-setup.md)       | GitHub OAuth App configuration           |
| [Stripe Setup](docs/guides/stripe-setup.md)                   | Payments, subscriptions, and webhooks    |
| [E2E Testing Setup](docs/guides/e2e-testing-setup.md)         | Playwright test configuration            |
| [Cloudflare Deployment](docs/guides/cloudflare-deployment.md) | Production deployment                    |
| [Baselime Setup](docs/guides/baselime-setup.md)               | Error monitoring                         |

## Environment Variables

This project uses a split environment variable structure:

| File          | Purpose          | Contains                                               |
| ------------- | ---------------- | ------------------------------------------------------ |
| `.env.client` | Public variables | `PUBLIC_*` prefixed variables                          |
| `.env.api`    | Server secrets   | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc. |

See [Supabase Setup Guide](docs/guides/supabase-setup.md) for details.

## Available Scripts

| Command                | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `yarn dev`             | Start development server (Astro + Stripe webhook forward) |
| `yarn dev:no-webhooks` | Start development server without Stripe webhooks          |
| `yarn build`           | Build for production                                      |
| `yarn verify`          | Run TypeScript, ESLint, i18n checks, and SEO validation   |
| `yarn test:e2e`        | Run E2E browser tests                                     |
| `yarn test:api`        | Run API tests                                             |
| `yarn test:all`        | Run all Playwright tests                                  |

## Documentation

- **Setup Guides**: `docs/guides/`
- **PRDs**: `docs/PRDs/`
- **Technical Docs**: `docs/technical/`
- **Roadmap**: `docs/management/ROADMAP.md`

## Project Structure

```
├── src/
│   ├── pages/              # Astro pages (SSR)
│   │   ├── api/            # REST API routes
│   │   ├── auth/           # Authentication pages
│   │   └── dashboard/      # Dashboard pages
│   ├── layouts/            # Astro layouts
│   └── components/         # Astro components
├── client/
│   ├── components/         # React island components
│   │   ├── admin/          # Admin panel components
│   │   ├── auth/           # Authentication components
│   │   ├── form/           # Form components
│   │   ├── layout/         # Layout components
│   │   ├── modal/          # Modal components
│   │   ├── settings/       # Settings components
│   │   └── stripe/         # Stripe components
│   ├── hooks/              # React hooks
│   ├── store/              # Zustand stores
│   └── styles/             # Global styles
├── server/
│   ├── services/           # Business logic services
│   │   ├── SubscriptionCredits.ts  # Credit management
│   │   ├── email.service.ts        # Email service
│   │   ├── api-key.service.ts      # API key management
│   │   └── admin-*.service.ts      # Admin services
│   ├── controllers/        # API route handlers
│   └── middleware/         # Express-like middleware
├── shared/
│   ├── config/             # Shared configuration
│   │   ├── env.ts          # Environment variables
│   │   ├── subscription.config.ts  # Subscription plans
│   │   ├── stripe.ts       # Stripe configuration
│   │   └── security.ts     # Security configuration
│   ├── types/              # Shared TypeScript types
│   ├── validation/         # Zod schemas
│   └── repositories/       # Database repositories
├── supabase/
│   └── migrations/         # Database migrations
├── tests/
│   ├── e2e/                # E2E browser tests
│   ├── api/                # API tests
│   └── pages/              # Page Object Models
├── emails/                 # React Email templates
├── locales/                # i18n translations
├── workers/cron/           # Cloudflare Workers cron handlers
└── docs/                   # Documentation
```

## Extension Points

When building your SaaS product on this boilerplate:

1. **Add your domain logic** in `server/services/`
2. **Create API routes** in `src/pages/api/`
3. **Add React components** in `client/components/`
4. **Define types** in `shared/types/`
5. **Add migrations** in `supabase/migrations/`
6. **Update i18n** in `locales/`

## License

Private - All rights reserved.
