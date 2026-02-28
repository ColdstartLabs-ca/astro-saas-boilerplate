# AutopilotRank

Check `.claude/skills/` for relevant patterns.

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
