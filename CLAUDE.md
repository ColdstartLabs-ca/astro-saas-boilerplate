# AutopilotRank

Check `.claude/skills/` for relevant patterns.

## Critical Constraints

- **Cloudflare Workers**: 10ms CPU limit. No heavy computation. Prefer streaming. Delegate to browser when safe.
- **Colors**: Never hardcode - use Tailwind config tokens only.
- **Docs**: No auto-generated .md files unless explicitly requested.
- **Environment Variables**: NEVER use `process.env` directly. Use `clientEnv` or `serverEnv` from `@shared/config/env`.
- **Code Quality Principles**: SOLID, SRP, KISS, DRY, YAGNI.

## Before Starting

- If something is unclear or vague, ask AskUserQuestion before implementing.

## Before Finishing

- Write tests for your changes
- Run `yarn test` on affected areas
- Run `yarn verify` (required before completing any task)

## After Finishing

- Whenever you feel you learned a new "skill" for this codebase, feel free to add it to `.claude/skills/`.

## Conventions

- Principles: SOLID, SRP, KISS, DRY, YAGNI
- Interfaces: Prefix with `I` (e.g., `IUser`)
- Dates: dayjs
- Logging: `server/monitoring/logger.ts` | `client/utils/logger.ts`

### React Code Quality

When working with React files that violate code quality principles (SRP, DRY, KISS, etc.), use `/react-refactoring` for systematic refactoring patterns.

## Key Paths

- PRDs: `docs/PRDs/` → move to `done/` when complete
- Roadmap: `docs/management/ROADMAP.md`
- Env: `.env.client` (public) | `.env.api` (secrets)

## Stack

Astro 5 (SSR + Islands), React 18, React Hook Form, Zod, Zustand, Supabase, Stripe, Cloudflare Pages, Baselime

## API Routes

### Public API Routes

Add public routes to `PUBLIC_API_ROUTES` in `shared/config/security.ts`:
