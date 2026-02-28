# Workers Directory

Cloudflare Workers running at the edge (cron jobs, background tasks).

## Critical Constraints

- **10ms CPU limit**: No heavy computation. Prefer streaming. Delegate to browser when safe.
- **Cron handlers must be idempotent/claim-based**: Before any external side effect (publish, webhook, delivery), claim the record atomically (optimistic lock or RPC claim) so overlapping cron runs cannot process the same item twice.
- **Deploy must fail closed**: If worker deploy fails, the deployment pipeline must fail — do not silently continue.

## Structure

- `cron/` — Scheduled cron handlers (Wrangler-based)
