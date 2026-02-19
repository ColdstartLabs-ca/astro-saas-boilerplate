---
name: env-management
description: Manage environment variables with split .env.client and .env.api structure. Use when adding new env vars, debugging config issues, or setting up environments.
---

# Environment Variables

## Split Structure

This project uses split env files (see `docs/PRDs/env-system-refactor.md`):

| File          | Purpose             | Prefix     |
| ------------- | ------------------- | ---------- |
| `.env.client` | Public browser vars | `PUBLIC_*` |
| `.env.api`    | Server secrets      | No prefix  |

## Adding New Variables

### Client-side (Public)

1. Add to `.env.client`:
   ```
   PUBLIC_API_URL=https://api.example.com
   ```
2. Access in code via `clientEnv`:
   ```typescript
   import { clientEnv } from '@shared/config/env';
   const url = clientEnv.PUBLIC_API_URL;
   ```

### Server-side (Secret)

1. Add to `.env.api`:
   ```
   STRIPE_SECRET_KEY=sk_live_xxx
   ```
2. Access only in server code via `serverEnv`:
   ```typescript
   // Only in src/pages/api/*, server/*, or server-side Astro pages
   import { serverEnv } from '@shared/config/env';
   const key = serverEnv.STRIPE_SECRET_KEY;
   ```

## Security Rules

- Never put secrets in `.env.client`
- Never prefix secrets with `PUBLIC_`
- Never use `process.env` directly — always use `clientEnv` or `serverEnv` from `@shared/config/env`
- Supabase anon key is public (safe for client)
- Supabase service role key is secret (API only)

## Local Development

Copy example files:

```bash
cp .env.client.example .env.client
cp .env.api.example .env.api
```

## Cloudflare Deployment

Secrets are managed via **GCloud Secret Manager** and deployed using **wrangler pages secret**:

```bash
# Set a secret for Cloudflare Pages (pulls from GCloud Secret Manager or set directly)
wrangler pages secret put SECRET_NAME
```

Public vars (`PUBLIC_*`) are configured in the Cloudflare Pages build environment settings or via wrangler config. Secrets (`.env.api` values) must never be committed and are injected at deploy time via the CI/CD pipeline using wrangler.
