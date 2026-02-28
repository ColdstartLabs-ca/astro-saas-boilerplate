# AutopilotRank

Check `.claude/skills/` for relevant patterns.

## Tech Stack

- **Framework**: Astro 5 (SSR) + React 18 islands (`@astrojs/react`)
- **Language**: TypeScript 5.5 (strict)
- **Deployment**: Cloudflare Pages + Workers (cron in `workers/cron/`)
- **Database**: Supabase (Postgres) — no ORM, raw client queries. RLS on all tables.
- **Auth**: Supabase Auth (Google/Facebook/Azure OAuth + email/password)
- **Payments**: Stripe
- **State**: Zustand (global client), TanStack React Query (server state)
- **Styling**: Tailwind CSS 3 — use semantic tokens (`main`, `surface`, `accent`, etc.), never hardcode colors
- **Validation**: Zod schemas in `shared/validation/`
- **DI**: tsyringe (server-side)
- **AI**: OpenRouter (text), OpenAI (embeddings), Replicate (images)
- **Email**: Resend/Brevo/SendPulse + React Email templates

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
```

## Key Files

- `shared/config/env.ts` — `clientEnv` / `serverEnv` (all env access goes here)
- `shared/config/subscription.config.ts` — plans, prices, credits, Stripe IDs
- `shared/config/credits.config.ts` — credit costs
- `shared/config/security.ts` — CSP, public API routes, CORS
- `src/pages/api/_utils.ts` — `withAuth`, `withAuthAndBody`, `jsonResponse`, `fireAndForget`
- `shared/types/` — all domain interfaces (`IArticle`, `ICampaign`, `IProject`, etc.)

## API Conventions

- Response envelope: `{ success: boolean, data: T }` or `{ success: false, error: { code, message } }`
- Auth: `getAuthenticatedUser(req)` from `server/middleware/getAuthenticatedUser.ts`

## Testing

- **Unit**: Vitest — `*.unit.spec.ts` — `yarn test`
- **API/E2E**: Playwright — `*.api.spec.ts`, `*.e2e.spec.ts` — mock DB via `inMemorySupabaseAdmin`
- **Verify**: `yarn verify` = `tsc --noEmit && eslint && i18n:icu && seo:validate`

## Base Principles

- SOLID, SRP, KISS, DRY, YAGNI — no over-engineering.
- **Environment Variables**: NEVER use `process.env` directly. Use `clientEnv` or `serverEnv` from `@shared/config/env`.

## Production Safety

- **Money + state changes must be atomic**: Any flow that mutates status and credits/ledger together must use one DB transaction or RPC. Never split claim, deduction, and ledger writes across separate best-effort updates.
- **Cron handlers must be idempotent/claim-based**: Claim the record atomically before any external side effect (publish, webhook, delivery).
- **Deploy must fail closed**: If dependent services fail, deployment must fail — never silently continue.

## Workflow

### Before Starting

- If something is unclear or vague, ask AskUserQuestion before implementing.

### Before Finishing

- Write tests for your changes
- Run `yarn test` on affected areas
- Run `yarn verify` (required before completing any task)

### After Finishing

- Whenever you feel you learned a new "skill" for this codebase, feel free to add it to `.claude/skills/`.
