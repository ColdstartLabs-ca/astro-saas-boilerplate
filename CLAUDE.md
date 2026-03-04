# SaaS Boilerplate

A production-ready Astro 5 + React 18 SaaS boilerplate with authentication, billing, credits, and admin panel. Fork this to build your next SaaS product.

Check `.claude/skills/` for relevant patterns.

## Tech Stack

Astro 5 SSR + React 18 islands · TypeScript 5.5 strict · Cloudflare Pages + Workers (10ms CPU limit) · Supabase Postgres (no ORM, raw queries, RLS on all tables) · Supabase Auth · Stripe · Zustand + TanStack Query · Tailwind 3 (semantic tokens, never hardcode colors) · Zod · tsyringe DI

## What's Included

### Core Infrastructure

- **Authentication**: Supabase Auth with email/password, Google, Facebook, Azure SSO
- **Billing**: Stripe subscriptions, one-time credit packs, customer portal
- **Credits System**: Flexible credit-based usage with rollover and expiration
- **Admin Panel**: User management, credit adjustments, subscription oversight
- **Email**: Multi-provider (Brevo, Resend) with React Email templates
- **Analytics**: Amplitude server-side tracking
- **Monitoring**: Baselime logging for Cloudflare Workers
- **i18n**: English, Portuguese (extensible)

### API Structure

- ~15 API routes (auth, checkout, subscription, credits, email, admin, health, portal, analytics, settings/api-keys, webhooks/stripe)
- Standardized response envelope: `{ success, data }` or `{ success: false, error: { code, message } }`
- `withAuth` / `withAuthAndBody` wrappers for authenticated routes

## Project Structure

```
src/pages/          # Astro pages + API routes (file-based routing)
src/pages/api/      # REST API — GET/POST/PUT/DELETE exports, withAuth/withAuthAndBody wrappers
client/             # React components, hooks, Zustand stores, client services
server/             # Controllers, services, integrations, DI, Supabase clients, middleware
shared/             # Types, Zod schemas, configs, utils, repositories (client + server)
workers/cron/       # Separate Cloudflare Worker for scheduled tasks
supabase/migrations/# SQL migrations (YYYYMMDDHHMMSS_name.sql)
tests/              # unit (Vitest), api/e2e/integration (Playwright)
emails/             # React Email templates
locales/            # i18n translations (en, pt-BR)
```

**Path aliases**: `@client`, `@server`, `@shared`, `@src`, `@lib` (see `tsconfig.json`)

## Key Files

- `shared/config/env.ts` — `clientEnv` / `serverEnv` (all env access goes here)
- `shared/config/subscription.config.ts` — plans, prices, credits, Stripe IDs
- `shared/config/security.ts` — CSP, public API routes, CORS
- `src/pages/api/_utils.ts` — `withAuth`, `withAuthAndBody`, `jsonResponse`, `fireAndForget`
- `shared/types/` — domain interfaces (`IUser`, `ISubscription`, `ICreditTransaction`, etc.)
- `server/services/SubscriptionCredits.ts` — credit operations

## Extension Points

When building your SaaS on this boilerplate:

1. **Add Domain Types** → `shared/types/`
2. **Add API Routes** → `src/pages/api/`
3. **Add Services** → `server/services/`
4. **Add React Components** → `client/components/`
5. **Add Migrations** → `supabase/migrations/`
6. **Add i18n Keys** → `locales/en/`, `locales/pt-BR/`

## Testing

- **Unit**: Vitest — `*.unit.spec.ts` — `yarn test`
- **API/E2E**: Playwright — `*.api.spec.ts`, `*.e2e.spec.ts` — mock DB via `inMemorySupabaseAdmin`
- **Verify**: `yarn verify` = `tsc --noEmit && eslint && i18n:icu && seo:validate`

## Base Principles

- SOLID, SRP, KISS, DRY, YAGNI — no over-engineering.
- NEVER use `process.env` directly — use `clientEnv` / `serverEnv` from `@shared/config/env`.
- Tailwind semantic tokens only — never hardcode colors like `text-red-500`.
- API responses use the envelope pattern — `{ success, data }` or `{ success: false, error }`.

## Production Safety

- Credits/status mutations → single DB transaction or RPC (never split).
- Cron handlers → claim atomically before any side effect.
- Deploys → fail closed if dependencies fail.

## Workflow

### Before Starting

- If something is unclear or vague, ask AskUserQuestion before implementing.

### Before Finishing

- Write tests for your changes
- Run `yarn test` on affected areas
- Run `yarn verify` (required before completing any task)

### After Finishing

- Whenever you feel you learned a new "skill" for this codebase, feel free to add it to `.claude/skills/`.
