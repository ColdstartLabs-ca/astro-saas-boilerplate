# Baselime Error Monitoring Setup Guide

This guide walks you through setting up Baselime for error monitoring and observability in SaaS Boilerplate.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Account Setup](#account-setup)
4. [Environment Variables](#environment-variables)
5. [How It Works](#how-it-works)
6. [Using the Server Logger](#using-the-server-logger)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)
9. [Dashboard & Alerts](#dashboard--alerts)
10. [Troubleshooting](#troubleshooting)

## Overview

Baselime provides:

- **Client-side Real User Monitoring (RUM)** - Captures browser errors and Web Vitals
- **Server-side Edge Logging** - Captures API route errors and logs
- **Automatic Error Tracking** - Unhandled exceptions are reported automatically
- **Web Vitals** - LCP, FID, CLS metrics for performance monitoring

### Architecture

```
Browser (React)              Server (API Routes)
       │                            │
       ▼                            ▼
  BaselimeRum              BaselimeLogger
       │                            │
       └──────────┬─────────────────┘
                  ▼
           Baselime Console
         (Logs, Errors, Metrics)
```

## Prerequisites

1. **Baselime Account**: [Sign up for free](https://console.baselime.io)
2. **Project Setup**: SaaS Boilerplate with packages installed:
   - `@baselime/react-rum` (client-side)
   - `@baselime/edge-logger` (server-side)

## Account Setup

### Step 1: Create Baselime Account

1. Go to [console.baselime.io](https://console.baselime.io)
2. Sign up with GitHub or email
3. Create a new environment (e.g., "saas-boilerplate-production")

### Step 2: Get API Keys

1. Go to **Settings** > **API Keys**
2. Create a new API key or use the default one
3. Copy the API key (you'll use this for both client and server)

> **Note**: Baselime uses the same API key for both client RUM and server logging. The client key is safe to expose as it only allows sending data, not reading it.

## Environment Variables

### Local Development

This project uses split environment files:

**`.env.client`** (public variables):

```bash
# Baselime monitoring (client-side RUM)
PUBLIC_BASELIME_KEY=your-api-key-here
```

**`.env.api`** (server-side secrets):

```bash
# Baselime monitoring (server-side)
BASELIME_API_KEY=your-api-key-here
```

> **Note:** Both keys can be the same value from Baselime Console. The client key is safe to expose as it only allows sending data.

### Cloudflare Pages (Production)

1. Go to **Workers & Pages** > Your Project > **Settings** > **Environment Variables**
2. Add:
   - `PUBLIC_BASELIME_KEY` (can be plaintext)
   - `BASELIME_API_KEY` (mark as secret/encrypted)

## How It Works

### Client-Side (Automatic)

The `BaselimeProvider` component in `src/components/monitoring/BaselimeProvider.tsx` wraps your app and automatically:

- Captures unhandled JavaScript errors
- Reports Web Vitals (LCP, FID, CLS)
- Tracks page loads and sessions
- Skips monitoring in development mode

```tsx
// Already configured in src/components/ClientProviders.tsx
<BaselimeProvider>{children}</BaselimeProvider>
```

### Server-Side (Manual)

Use the logger utility in API routes for structured logging and error capture.

## Using the Server Logger

### Basic Usage

```typescript
import { createLogger } from '@/server/monitoring/logger';

export const POST: APIRoute = async request => {
  const logger = createLogger(request, 'api-example');

  try {
    logger.info('Processing request', {
      userId: 'user-123',
      dataSize: 1024,
    });

    // Your logic here...

    logger.info('Request completed successfully');
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Request failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ error: 'Failed' }, { status: 500 });
  } finally {
    // IMPORTANT: Always flush logs before response completes
    await logger.flush();
  }
};
```

### Using the Wrapper (Recommended)

The `withLogging` wrapper handles error capture and flushing automatically:

```typescript
import { withLogging } from '@/server/monitoring/logger';

export const POST = withLogging('api-example', async (request, logger) => {
  logger.info('Processing request');

  const body = await request.json();
  logger.info('Request body parsed', { itemCount: body.items?.length });

  // Your logic here...

  return Response.json({ success: true });
});
```

### Log Levels

```typescript
logger.info('Informational message', { context: 'data' });
logger.warn('Warning message', { issue: 'something' });
logger.error('Error message', { error: 'details' });
logger.debug('Debug message', { verbose: 'data' });
```

### Adding Context

```typescript
const logger = createLogger(request, 'checkout-api', {
  userId: user.id,
  requestId: crypto.randomUUID(),
  tier: user.subscription?.tier,
});
```

## Testing

### Test Client-Side Errors

1. Add a test error in any component:

   ```tsx
   useEffect(() => {
     throw new Error('Test Baselime error');
   }, []);
   ```

2. Check Baselime Console for the error

### Test Server-Side Logging

1. Add logging to an API route
2. Make a request to that endpoint
3. Check Baselime Console for logs

### Verify in Development

In development, logs are printed to console instead of sent to Baselime:

```bash
# You'll see logs like:
[baselime] info: Processing request { dataSize: 1024 }
```

## Production Deployment

### Checklist

- [ ] Add `PUBLIC_BASELIME_KEY` to Cloudflare Pages
- [ ] Add `BASELIME_API_KEY` to Cloudflare Pages (as secret)
- [ ] Deploy and verify logs appear in Baselime Console
- [ ] Set up alert notifications (Slack/email)

### Verify Deployment

1. Visit your production site
2. Open browser DevTools > Network
3. Look for requests to `rum.baselime.io`
4. Check Baselime Console for incoming data

## Dashboard & Alerts

### Setting Up Alerts

1. Go to Baselime Console > **Alerts**
2. Create alerts for:
   - **Error rate spike**: Alert when errors exceed threshold
   - **New error**: Alert on first occurrence of new errors
   - **Web Vitals**: Alert when LCP/CLS degrades

### Recommended Alerts

| Alert           | Condition           | Channel |
| --------------- | ------------------- | ------- |
| High error rate | >10 errors in 5 min | Slack   |
| New error type  | First occurrence    | Email   |
| LCP degradation | LCP > 4s            | Slack   |
| API failure     | 5xx errors > 5/min  | Slack   |

### Slack Integration

1. Go to **Settings** > **Integrations**
2. Add Slack workspace
3. Select channel for alerts

## Troubleshooting

### Logs not appearing

1. **Check API key**: Verify `BASELIME_API_KEY` is set correctly
2. **Check flush**: Ensure `logger.flush()` is called
3. **Check environment**: Logs are only sent when API key is present

### Client errors not captured

1. **Check key**: Verify `PUBLIC_BASELIME_KEY` is set
2. **Check network**: Look for blocked requests to `rum.baselime.io`
3. **Check provider**: Ensure `BaselimeProvider` wraps your app

### Development mode

In development, Baselime is disabled by default. To enable:

```tsx
// In BaselimeProvider.tsx, remove the development check:
if (!apiKey) {
  // Remove: || import.meta.env.DEV
  return <>{children}</>;
}
```

### Quota exceeded

Baselime free tier includes generous limits. If exceeded:

1. Check for log spam (reduce verbose logging)
2. Filter out non-critical logs
3. Upgrade plan if needed

## API Reference

### `createLogger(request, namespace, context?)`

Creates a new logger instance.

| Parameter   | Type      | Description                                         |
| ----------- | --------- | --------------------------------------------------- |
| `request`   | `Request` | The incoming request object                         |
| `namespace` | `string`  | Identifier for the log source (e.g., 'api-example') |
| `context`   | `object`  | Optional additional context to include in all logs  |

### `withLogging(namespace, handler)`

Wraps an API handler with automatic logging.

| Parameter   | Type       | Description                              |
| ----------- | ---------- | ---------------------------------------- |
| `namespace` | `string`   | Identifier for the log source            |
| `handler`   | `function` | `(request, logger) => Promise<Response>` |

## Resources

- [Baselime Docs](https://baselime.io/docs)
- [Baselime Console](https://console.baselime.io)
- [Edge Logger API](https://baselime.io/docs/sending-data/platforms/cloudflare/)
- [React RUM Docs](https://baselime.io/docs/sending-data/languages/react/)
