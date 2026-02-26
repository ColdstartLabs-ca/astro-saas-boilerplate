# Developer Onboarding Guide

> A plain-language walkthrough of how AutopilotRank works, where things live, and how to get productive fast.

**Last updated:** 2026-02-25

---

## What Is This Project?

AutopilotRank is an **AI SEO content automation platform**. Users sign up, pick a subscription plan, get credits, and use those credits to generate SEO-optimized articles. Think of it as "Outrank + Surfer SEO" but fully automated — from keyword research to article generation to CMS publishing.

The codebase started as a generic SaaS boilerplate (auth, billing, credits) and evolved into the current product. You'll occasionally see references to "PixelPerfect" or "myimageupscaler" in archived PRDs — that was a previous product built on the same boilerplate. Ignore those.

For the product roadmap and launch timeline, see [`docs/management/ROADMAP.md`](management/ROADMAP.md).

---

## Tech Stack at a Glance

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | **Astro 5** (SSR) | Server-rendered pages + React "islands" for interactive bits |
| UI | **React 18** | Only hydrates where needed (islands architecture) |
| Styling | **Tailwind CSS** | Dark theme support; never hardcode colors |
| State | **Zustand** | Client-side stores in `client/store/` |
| Forms | **React Hook Form + Zod** | All forms use this combo |
| Database | **Supabase** (Postgres) | Auth, data, RLS policies |
| Payments | **Stripe** | Subscriptions + one-time credit packs |
| Email | **Brevo** (primary), **Resend** (fallback) | Transactional emails |
| Hosting | **Cloudflare Pages + Workers** | 10ms CPU limit — keep it light |
| Monitoring | **Baselime** + **Amplitude** + **GA4** | Errors, analytics, traffic |
| Tests | **Playwright** (E2E + API) + **Vitest** (unit) | See testing section below |
| i18n | Custom system | 7 locales, ICU message format |

---

## Project Structure

Here's what each top-level directory does:

```
autopilotrank.com/
├── client/          # Browser-only code (React components, hooks, stores, styles)
├── server/          # Server-only code (controllers, services, middleware, DB access)
├── shared/          # Isomorphic code (types, validation, config — runs everywhere)
├── src/             # Astro framework layer (pages, layouts, components, middleware)
│   ├── pages/       # File-based routing (both UI pages and API routes)
│   │   └── api/     # All API endpoints live here
│   ├── components/  # Astro components (non-React, server-rendered)
│   ├── layouts/     # Page layouts
│   └── middleware.ts # THE middleware entry point (see below)
├── lib/             # Middleware helpers extracted from src/middleware.ts
├── locales/         # Translation JSON files (en, de, es, fr, it, ja, pt-BR)
├── supabase/        # Database migrations (87 files) and config
├── tests/           # Playwright E2E + API tests, Vitest unit tests
├── scripts/         # Setup, deploy, validation, and helper scripts
├── docs/            # PRDs, guides, management docs, technical specs
├── emails/          # Email templates (Brevo/Resend)
├── content/         # MDX blog posts (Astro content collections)
├── public/          # Static assets
├── workers/         # Cloudflare Worker scripts
└── outrank.so/      # Outrank integration module
```

### The Three Code Layers

The codebase is split into three clear layers. This is important:

1. **`client/`** — Browser-only. React components, hooks, Zustand stores, client-side analytics. Never import server code here.

2. **`server/`** — Server-only. Controllers, services, Supabase admin client, Stripe logic, webhooks. Never import this from client code.

3. **`shared/`** — Runs in both. Types, Zod schemas, config, constants. No browser APIs (`window`), no Node APIs (`fs`). Pure TypeScript.

The **`src/`** directory is Astro's domain — it wires everything together with file-based routing, layouts, and the middleware chain.

---

## How a Request Flows Through the App

```
Browser Request
     │
     ▼
src/middleware.ts          ← Astro middleware (THE entry point)
     │
     ├─ Security headers (CSP, CORS)
     ├─ Locale detection (CF-IPCountry → cookie → default)
     ├─ Currency detection (regional pricing)
     ├─ Tracking param cleanup (utm_*, fbclid, etc.)
     │
     ├─ If API route (/api/*):
     │    ├─ Check PUBLIC_API_ROUTES → skip auth if public
     │    ├─ Rate limiting (public or user tier)
     │    ├─ Auth verification (Supabase JWT)
     │    └─ Inject user context into Astro locals
     │
     ├─ If dashboard route (/dashboard/*):
     │    ├─ Verify Supabase session
     │    └─ Redirect to login if unauthenticated
     │
     └─ If public page:
          └─ Pass through (SSR by Astro)
```

**Key file:** [`src/middleware.ts`](../src/middleware.ts)
**Middleware helpers:** [`lib/middleware/`](../lib/middleware/)
**Auth middleware:** [`server/middleware/getAuthenticatedUser.ts`](../server/middleware/getAuthenticatedUser.ts)

---

## Environment Variables

**Never use `process.env` or `import.meta.env` directly.** Always use:

```typescript
import { clientEnv } from '@shared/config/env';  // Browser-safe (PUBLIC_* vars)
import { serverEnv } from '@shared/config/env';  // Server-only (secrets)
```

There are three env files:

| File | Purpose | Loaded by |
|------|---------|-----------|
| `.env.client` | Public vars (`PUBLIC_*` prefix) | `source scripts/load-env.sh` during dev |
| `.env.api` | Secrets (Stripe keys, Supabase service role, etc.) | Same loader; never exposed to browser |
| `.env.test` | Test overrides | `playwright.config.ts` and `scripts/dev-test.sh` |

All env vars are validated with Zod at startup — see [`shared/config/env.ts`](../shared/config/env.ts).

---

## Authentication

Auth is handled entirely by **Supabase Auth**:

- **Providers:** Google OAuth, Azure OAuth, Email/Password
- **Session:** Supabase manages JWTs; the middleware refreshes sessions on every request
- **Protected routes:** Any `/dashboard/*` path requires auth; unauthenticated users get redirected to login
- **API auth:** API routes verify the JWT via `getAuthenticatedUser()` in server middleware
- **Admin:** Admin role check via `requireAdmin` middleware

**Key files:**
- [`shared/utils/supabase/middleware.ts`](../shared/utils/supabase/) — Session management
- [`server/middleware/getAuthenticatedUser.ts`](../server/middleware/getAuthenticatedUser.ts) — API auth
- [`server/middleware/requireAdmin.ts`](../server/middleware/requireAdmin.ts) — Admin guard
- [`docs/authentication/`](authentication/) — OAuth setup guides

---

## Database (Supabase)

Postgres hosted on Supabase. Key tables include:

- `profiles` — User profiles (linked to Supabase Auth users)
- `subscriptions` — Stripe subscription state
- `credit_transactions` — Every credit change (subscription grants, purchases, usage, refunds)
- `projects` — User's SEO projects
- `campaigns` — Article generation campaigns within projects
- `keywords` — Target keywords per campaign
- `articles` — Generated articles with status tracking
- `integrations` — CMS connections (WordPress, etc.)
- `integration_deliveries` — Article publish tracking
- `provider_usage` — AI model usage tracking (backend-only)

**Migrations:** 87 SQL files in `supabase/migrations/` with `YYYYMMDDHHMMSS_name.sql` naming. Timestamps must be unique (see gotchas below).

**RLS:** Row-Level Security is enabled on all tables. Most use user-scoped policies; a few backend-only tables (`dispute_events`, `provider_usage`) use service-role-only policies.

**Key files:**
- [`server/supabase/`](../server/supabase/) — Server-side Supabase client
- [`shared/repositories/`](../shared/repositories/) — Data access layer
- [`supabase/config.toml`](../supabase/config.toml) — Local Supabase config

---

## Credit System

Credits are the core currency. 1 credit = 1 article generation (base cost).

**How credits work:**
- **Subscription credits:** Monthly allocation (Starter: 30, Growth: 100, Agency: 500). Unused credits roll over up to a cap.
- **Purchased credits:** Buy packs of 10/25/50. Never expire, used after subscription credits.
- **Free tier:** 3 trial articles on signup (no credit card).
- **Writer presets** add to cost: `budget` (1cr), `balanced` (1cr), `pro` (2cr), `ultra` (3cr).
- **Image presets** are an addon: some free, premium ones cost +1 credit.

**Key files:**
- [`shared/constants/credit-costs.constants.ts`](../shared/constants/) — Cost definitions
- [`shared/config/credits.config.ts`](../shared/config/credits.config.ts) — Re-exports and legacy compat
- [`shared/config/subscription.config.ts`](../shared/config/subscription.config.ts) — Plan definitions (single source of truth)
- [`docs/technical/systems/credit-expiration-implementation.md`](technical/systems/credit-expiration-implementation.md)

---

## Payments (Stripe)

Stripe handles subscriptions and one-time purchases:

- **Subscriptions:** Starter ($49/mo), Growth ($99/mo), Agency ($249/mo)
- **Credit packs:** Small (10), Medium (25), Large (50)
- **Webhooks:** `src/pages/api/webhooks/stripe.ts` handles all Stripe events
- **Price IDs:** Derived from `subscription.config.ts` — never hardcoded

**Key files:**
- [`shared/config/stripe.ts`](../shared/config/stripe.ts) — Price config (derived from subscription.config)
- [`shared/config/subscription.config.ts`](../shared/config/subscription.config.ts) — THE source of truth for plans
- [`server/stripe/`](../server/stripe/) — Server-side Stripe operations
- [`docs/guides/STRIPE_QUICKSTART.md`](guides/STRIPE_QUICKSTART.md) — Setup guide
- [`docs/guides/STRIPE_TEST_SETUP.md`](guides/STRIPE_TEST_SETUP.md) — Test mode setup

---

## API Routes

All API endpoints live under `src/pages/api/` and follow Astro's file-based routing:

```
src/pages/api/
├── admin/          # Admin-only endpoints
├── articles/       # Article CRUD & generation
├── auth/           # Auth helpers
├── campaigns/      # Campaign management
├── checkout/       # Stripe checkout sessions
├── credits/        # Credit balance & history
├── cron/           # Scheduled jobs
├── gsc/            # Google Search Console integration
├── health/         # Health checks (public)
├── integrations/   # CMS integrations
├── models/         # AI model configuration
├── onboarding/     # User onboarding flow
├── opportunities/  # SEO opportunities
├── projects/       # Project CRUD
├── settings/       # User settings
├── subscriptions/  # Subscription management
├── support/        # Support forms (public)
├── webhooks/       # Stripe & other webhooks (public, own auth)
└── _utils.ts       # Shared API utilities
```

**Public routes** (no auth required) are defined in [`shared/config/security.ts`](../shared/config/security.ts). Everything else requires a valid Supabase JWT.

**Response format:** All API responses are wrapped in `{ success: boolean, data: T }`.

---

## The Article Generation Pipeline

This is the core product feature:

1. User creates a **Project** (e.g., "My SaaS Blog")
2. Within a project, creates a **Campaign** with target keywords
3. Starts the campaign → system generates articles for each keyword
4. Articles go through statuses: `queued` → `generating` → `draft` (or `failed`)
5. User reviews drafts, can approve (`draft` → `approved`) or request regeneration
6. Approved articles can be published to connected CMS via **Integrations**

**AI models:** Multi-model engine using OpenRouter (GPT-4, Claude, Gemini). Writer presets control quality/cost tradeoffs.

**Key files:**
- [`server/services/`](../server/services/) — Article generation, status transitions, etc.
- [`server/controllers/`](../server/controllers/) — API controller logic
- [`docs/PRDs/done/ai-content-generation-engine.md`](PRDs/done/ai-content-generation-engine.md) — Original PRD
- [`docs/PRDs/done/gsc-article-generation-pipeline.md`](PRDs/done/gsc-article-generation-pipeline.md) — GSC-driven pipeline

---

## Testing

Three test layers:

### Unit Tests (Vitest)
```bash
yarn test:unit              # Run all
yarn test:watch             # Watch mode
```

### API Tests (Playwright)
```bash
yarn test:api               # Run API tests
yarn test:api:verbose       # With detailed output
```

API tests use a mock Supabase (`inMemorySupabaseAdmin`) and test-mode auth tokens. Test users have IDs prefixed with `mock_user_`. See [`tests/api/`](../tests/api/) for examples.

### E2E Tests (Playwright)
```bash
yarn test:e2e               # Run E2E (Chromium)
yarn test:e2e:full          # All browsers
yarn test:e2e:ui            # Interactive UI mode
```

E2E tests use page objects in [`tests/pages/`](../tests/pages/) and fixtures in [`tests/test-fixtures.ts`](../tests/test-fixtures.ts).

**Run everything:**
```bash
yarn test                   # API + E2E + unit
yarn verify                 # tsc + lint + i18n check + SEO validate (run before finishing any task)
yarn verify:full            # verify + all tests
```

---

## Common Dev Commands

```bash
# Setup (first time)
yarn bootstrap              # Install deps + run setup scripts

# Development
yarn dev                    # Start dev server + Stripe webhook listener
yarn dev:no-webhooks        # Dev server only (no Stripe)
yarn dev:test               # Dev server in test mode (for Playwright)

# Quality
yarn verify                 # Type-check + lint + i18n + SEO validation
yarn tsc                    # TypeScript check only
yarn lint                   # ESLint + fix
yarn format                 # Prettier

# Deploy
yarn build                  # Build for production
yarn deploy                 # Deploy to Cloudflare Pages

# Stripe
yarn stripe:listen          # Listen for Stripe webhooks locally
yarn stripe:setup           # Setup Stripe products/prices

# i18n
yarn i18n:check             # Check translation completeness
yarn i18n:stats             # Translation stats per locale
```

---

## Internationalization (i18n)

7 locales: `en`, `de`, `es`, `fr`, `it`, `ja`, `pt-BR`

- Translation files: `locales/{locale}/*.json`
- ICU message format for plurals, gender, etc.
- Locale detection: Cloudflare `CF-IPCountry` header → cookie → browser preference → `en`
- Regional pricing: Currency adapts per country (not per locale)
- Config: [`src/i18n/config.ts`](../src/i18n/config.ts)

---

## Deployment

Deployed to **Cloudflare Pages** with SSR via Workers.

**Critical constraint:** Cloudflare Workers have a **10ms CPU time limit**. This means:
- No heavy computation on the server
- Prefer streaming responses
- Delegate heavy work to the browser when safe
- Long-running tasks (article generation) use fire-and-forget patterns

**Key files:**
- [`scripts/deploy/`](../scripts/deploy/) — Deployment scripts
- [`docs/guides/namecheap-to-cloudflare-deployment.md`](guides/namecheap-to-cloudflare-deployment.md) — DNS/deployment guide

---

## Key Documentation Index

### Getting Started
- **This file** — You're here
- [`CLAUDE.md`](../CLAUDE.md) — AI coding assistant instructions (also good human reference)
- [`docs/management/ROADMAP.md`](management/ROADMAP.md) — Product roadmap and launch plan

### Architecture & Systems
- [`docs/technical/`](technical/) — System architecture, DB schema, API reference
- [`docs/technical/systems/credit-expiration-implementation.md`](technical/systems/credit-expiration-implementation.md) — Credit system deep dive

### Setup Guides
- [`docs/guides/STRIPE_QUICKSTART.md`](guides/STRIPE_QUICKSTART.md) — Stripe setup
- [`docs/guides/STRIPE_TEST_SETUP.md`](guides/STRIPE_TEST_SETUP.md) — Stripe test mode
- [`docs/authentication/`](authentication/) — OAuth provider setup (Google, Azure, Facebook)

### PRDs (Feature Specs)
- [`docs/PRDs/done/`](PRDs/done/) — Completed feature PRDs (~45 files)
- [`docs/PRDs/night-watch/`](PRDs/night-watch/) — Automated analysis PRDs
- [`docs/PRDs/archive/`](PRDs/archive/) — Old product era (ignore)

### Management
- [`docs/management/ROADMAP.md`](management/ROADMAP.md) — Roadmap
- [`docs/management/PRE-RELEASE-CHECKLIST.md`](management/PRE-RELEASE-CHECKLIST.md) — Launch checklist
- [`docs/management/CORE-APP-FLOW-VALIDATION-CHECKLIST.md`](management/CORE-APP-FLOW-VALIDATION-CHECKLIST.md) — Test coverage tracking
- [`docs/management/PRODUCTION-READINESS-REPORT-2026-02-14.md`](management/PRODUCTION-READINESS-REPORT-2026-02-14.md) — Production audit

### Business
- [`docs/business/`](business/) — Business model canvas, revenue model, competitive analysis

---

## Gotchas & Tips

1. **Environment variables:** Always use `clientEnv`/`serverEnv` from `@shared/config/env`. The linter will catch `process.env` usage.

2. **Migration timestamps:** Must be globally unique (`YYYYMMDDHHMMSS` format). Two migrations on the same date will cause `duplicate key` errors.

3. **Credit column name:** The column in `credit_transactions` is `type`, NOT `transaction_type`.

4. **UUID generation:** Use `gen_random_uuid()` in SQL, not `uuid_generate_v4()`.

5. **Color values:** Never hardcode colors in JSX/CSS. Always use Tailwind config tokens.

6. **10ms CPU limit:** Cloudflare Workers will kill your request if you exceed this. Keep server-side logic lean.

7. **Test user IDs:** Mock test users have `mock_user_` prefix — these are NOT valid UUIDs, so endpoints with UUID validation will reject them.

8. **API response envelope:** All responses use `{ success, data }`. In tests, access data via `body.data ?? body`.

9. **Before committing:** Always run `yarn verify`. This checks types, linting, i18n, and SEO validation.

10. **Writer presets:** Valid keys are `budget`, `balanced`, `pro`, `ultra`. There is no `standard` preset.
