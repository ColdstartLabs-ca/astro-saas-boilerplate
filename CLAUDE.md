# AutopilotRank

SaaS platform for AI-powered SEO content generation. Users create projects, run keyword campaigns, and generate/publish articles to their CMS (WordPress, Ghost, Shopify, Webflow, Notion, Wix, webhooks) — on autopilot. Credit-based billing via Stripe with tiered subscriptions.

Check `.claude/skills/` for relevant patterns.

## Tech Stack

Astro 5 SSR + React 18 islands · TypeScript 5.5 strict · Cloudflare Pages + Workers (10ms CPU limit) · Supabase Postgres (no ORM, raw queries, RLS on all tables) · Supabase Auth · Stripe · Zustand + TanStack Query · Tailwind 3 (semantic tokens, never hardcode colors) · Zod · tsyringe DI · OpenRouter/OpenAI/Replicate for AI

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
content/            # Blog MDX content
locales/            # i18n translations (en, pt-BR)
```

**Path aliases**: `@client`, `@server`, `@shared`, `@src`, `@lib` (see `tsconfig.json`)

## Key Files

- `shared/config/env.ts` — `clientEnv` / `serverEnv` (all env access goes here)
- `shared/config/subscription.config.ts` — plans, prices, credits, Stripe IDs
- `shared/config/security.ts` — CSP, public API routes, CORS
- `src/pages/api/_utils.ts` — `withAuth`, `withAuthAndBody`, `jsonResponse`, `fireAndForget`
- `shared/types/` — domain interfaces (`IArticle`, `ICampaign`, `IProject`, etc.)
- API response envelope: `{ success, data }` or `{ success: false, error: { code, message } }`

## Testing

- **Unit**: Vitest — `*.unit.spec.ts` — `yarn test`
- **API/E2E**: Playwright — `*.api.spec.ts`, `*.e2e.spec.ts` — mock DB via `inMemorySupabaseAdmin`
- **Verify**: `yarn verify` = `tsc --noEmit && eslint && i18n:icu && seo:validate`

## Base Principles

- SOLID, SRP, KISS, DRY, YAGNI — no over-engineering.
- NEVER use `process.env` directly — use `clientEnv` / `serverEnv` from `@shared/config/env`.

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
