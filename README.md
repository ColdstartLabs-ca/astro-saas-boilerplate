# AutopilotRank

A production-ready Astro 5 + React 18 (islands architecture) SaaS application deployed on Cloudflare Pages. Provides core infrastructure for building credits-based SaaS products.

## Tech Stack

- **Frontend**: Astro 5 (SSR + Islands), React 18, Tailwind CSS
- **Backend**: Astro API Routes (Cloudflare Workers)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email, Google, Azure OAuth)
- **Payments**: Stripe (Subscriptions & One-time Credits)
- **Deployment**: Cloudflare Pages
- **Monitoring**: Baselime

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
| `yarn verify`          | Run TypeScript, ESLint, and all tests                     |
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
│   ├── layouts/            # Astro layouts
│   ├── components/         # Astro components (analytics, etc.)
│   └── i18n/               # i18n utilities
├── client/
│   ├── components/         # React island components
│   ├── hooks/              # React hooks
│   ├── store/              # Zustand stores
│   └── styles/             # Global styles
├── server/
│   ├── blog.ts             # Blog data service
│   ├── services/           # Business logic services
│   └── controllers/        # API route handlers
├── shared/
│   ├── config/             # Shared configuration
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Shared utilities
│   └── validation/         # Zod schemas
├── supabase/
│   └── migrations/         # Database migrations
├── tests/
│   ├── e2e/                # E2E browser tests
│   ├── api/                # API tests
│   ├── pages/              # Page Object Models
│   └── helpers/            # Test utilities
├── scripts/                # Setup and utility scripts
└── docs/                   # Documentation
```

## License

Private - All rights reserved.
