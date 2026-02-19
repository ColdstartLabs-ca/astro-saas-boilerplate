---
name: gcloud-secrets
description: Manage Google Cloud Secret Manager for storing and fetching environment secrets. Use when working with deployment, secrets, or gcloud commands.
---

# Google Cloud Secret Manager

## Project Configuration

- **Project ID**: `autopilotrank`
- **Personal account**: `jfurtado141@gmail.com`
- **Service account**: `deploy@autopilotrank.iam.gserviceaccount.com`
- **Service account key**: `cloud/keys/autopilotrank-866faa7dedda.json` (gitignored)
- **Secrets**:
  - `autopilotrank-api-prod` → `.env.api.prod` (server secrets)
  - `autopilotrank-client-prod` → `.env.client.prod` (public vars)

## IAM Roles

| Principal                 | Role                           | Can do                      |
| ------------------------- | ------------------------------ | --------------------------- |
| `deploy@` service account | `secretmanager.secretAccessor` | Read secrets (deploy fetch) |
| `jfurtado141@gmail.com`   | Owner                          | Read + write new versions   |

**Rule**: use service account for reading (deploy), personal account for writing new versions.

## Fetching Secrets (read)

The deploy script handles this automatically via `scripts/deploy/steps/00-fetch-secrets.sh`.
It activates the service account key first, then falls back to personal account.

Manual fetch:

```bash
gcloud auth activate-service-account --key-file=cloud/keys/autopilotrank-866faa7dedda.json --quiet
gcloud secrets versions access latest --secret="autopilotrank-api-prod" --project="autopilotrank" > .env.api.prod
gcloud secrets versions access latest --secret="autopilotrank-client-prod" --project="autopilotrank" > .env.client.prod
```

## Updating Secrets (write)

Must use personal account — service account lacks `secretVersionAdder` role.

```bash
# Switch to personal account
gcloud config set account jfurtado141@gmail.com

# Fetch current version into temp file
gcloud secrets versions access latest --secret="autopilotrank-api-prod" --project="autopilotrank" > /tmp/api-prod.env

# Edit /tmp/api-prod.env (add/update vars), then push new version
gcloud secrets versions add autopilotrank-api-prod --data-file=/tmp/api-prod.env --project=autopilotrank

# Same for client secret
gcloud secrets versions access latest --secret="autopilotrank-client-prod" --project="autopilotrank" > /tmp/client-prod.env
# ... edit ...
gcloud secrets versions add autopilotrank-client-prod --data-file=/tmp/client-prod.env --project=autopilotrank

# Cleanup temp files
rm -f /tmp/api-prod.env /tmp/client-prod.env
```

## Destroying Old Versions

After adding a new version, destroy the old one to avoid secret sprawl:

```bash
# List versions
gcloud secrets versions list autopilotrank-api-prod --project=autopilotrank

# Destroy old version (replace N)
gcloud secrets versions destroy N --secret=autopilotrank-api-prod --project=autopilotrank --quiet
gcloud secrets versions destroy N --secret=autopilotrank-client-prod --project=autopilotrank --quiet
```

## Uploading to Cloudflare Pages (live, no redeploy)

For urgent single-secret updates without a full redeploy:

```bash
echo "secret-value" | npx wrangler pages secret put SECRET_NAME --project-name=autopilotrank
```

A full deploy (`yarn deploy`) handles all secrets via `scripts/deploy/steps/05-secrets.sh`.

## Common Issues

### "PERMISSION_DENIED: secretmanager.versions.add"

Service account is read-only. Switch to personal account: `gcloud config set account jfurtado141@gmail.com`

### "Failed to fetch secret"

1. Check active account: `gcloud config get-value account`
2. Ensure service account key exists at `cloud/keys/autopilotrank-866faa7dedda.json`
3. Activate manually: `gcloud auth activate-service-account --key-file=cloud/keys/autopilotrank-866faa7dedda.json`

### Wrong GCloud project

The script always sets `--project=autopilotrank` explicitly and also runs `gcloud config set project autopilotrank`.
The ADC quota project warning ("does not match quota project") is harmless — it's about a different auth mechanism.

## What Goes Where

| Variable                   | File          | Secret                      |
| -------------------------- | ------------- | --------------------------- |
| Server secrets (no prefix) | `.env.api`    | `autopilotrank-api-prod`    |
| Public vars (`PUBLIC_*`)   | `.env.client` | `autopilotrank-client-prod` |

**Important**: `PUBLIC_*` vars are baked into the Astro build at deploy time AND uploaded as Pages secrets for SSR runtime access.
