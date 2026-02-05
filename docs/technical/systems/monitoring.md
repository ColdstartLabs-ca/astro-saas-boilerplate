# Monitoring System

Server-side error logging with Baselime and client-side analytics with Amplitude.

## Overview

The application uses two complementary monitoring systems:

1. **Baselime** - Server-side error logging and request tracking for API routes
2. **Amplitude** - Product analytics and user behavior tracking (client + server)

## Baselime Integration

### Server Logger

Location: `/home/joao/projects/autopilotrank.com/server/monitoring/logger.ts`

The `createLogger()` function creates a Baselime logger instance for edge/serverless functions:

```typescript
import { createLogger } from '@server/monitoring/logger';

const logger = createLogger(request, 'namespace', {
  userId: 'user_123',
  requestId: 'req_456',
});

logger.info('Processing started', { imageSize: 1024 });
logger.warn('Rate limit approaching');
logger.error('Processing failed', { error: err.message });

await logger.flush();
```

### Logging Wrapper

The `withLogging()` wrapper automatically handles logging and error capture:

```typescript
import { withLogging } from '@server/monitoring/logger';

export const POST = withLogging('api-namespace', async (request, logger) => {
  logger.info('Request received');

  // Your handler logic

  return Response.json({ success: true });
});
```

The wrapper:

- Creates a logger with the provided namespace
- Logs request completion with status code
- Captures errors and logs them with context
- Automatically calls `logger.flush()`
- Returns appropriate error responses

### HttpError Class

For status code preservation through the logging wrapper:

```typescript
import { HttpError } from '@server/monitoring/logger';

throw new HttpError('Resource not found', 404, 'NOT_FOUND');
throw new HttpError('Invalid input', 400, 'VALIDATION_ERROR', { field: 'email' });
```

### Configuration

**Environment Variable:**

- `BASELIME_API_KEY` - Baselime API key (server-side, from `.env.api`)

**Service Name:** `saas-boilerplate-api`

**Development Mode:** In development or when no API key is present, logs are skipped (`isLocalDev: true`).

## Amplitude Analytics

### Client-Side Analytics

Location: `/home/joao/projects/autopilotrank.com/client/analytics/analyticsClient.ts`

Browser-based analytics using Amplitude Browser SDK with consent management:

```typescript
import { analytics } from '@client/analytics/analyticsClient';

// Initialize (called on app load)
analytics.init(apiKey);

// Set consent status
analytics.setConsent('granted', apiKey);

// Track events
analytics.track('page_view', { path: '/dashboard' });
analytics.trackPageView('/pricing', { referrer: document.referrer });

// Identify user
await analytics.identify({
  userId: 'user_123',
  email: 'user@example.com',
  subscriptionTier: 'pro',
});

// Reset on logout
analytics.reset();
```

**Features:**

- Consent management (GDPR/CCPA compliant)
- Email hashing (SHA-256) via Web Crypto API
- Session tracking via sessionStorage
- UTM parameter capture on page views

### Server-Side Analytics

Location: `/home/joao/projects/autopilotrank.com/server/analytics/analyticsService.ts`

Server-side event tracking via Amplitude HTTP API:

```typescript
import { trackServerEvent } from '@server/analytics';

await trackServerEvent(
  'subscription_created',
  { plan: 'pro', amountCents: 2900 },
  { apiKey: serverEnv.AMPLITUDE_API_KEY, userId: 'user_123' }
);
```

### Analytics Event API

Location: `/home/joao/projects/autopilotrank.com/src/pages/api/analytics/event/index.ts`

Public API endpoint for client-to-server event relay:

- **Route:** `POST /api/analytics/event`
- **Auth:** Optional (supports anonymous and authenticated events)
- **Rate Limiting:** Public tier applied
- **Validation:** Zod schema + security validation for event names

**Allowed Events:**

- `page_view`, `signup_started`, `signup_completed`, `login`, `logout`
- `subscription_created`, `subscription_canceled`, `subscription_renewed`, `upgrade_started`
- `credit_pack_purchased`, `credits_deducted`, `credits_refunded`
- `api_call_completed`, `content_downloaded`
- `checkout_started`, `checkout_completed`, `checkout_abandoned`
- `rate_limit_exceeded`, `processing_failed`
- `batch_limit_modal_shown`, `batch_limit_upgrade_clicked`, `batch_limit_partial_add_clicked`, `batch_limit_modal_closed`

### Event Types

Location: `/home/joao/projects/autopilotrank.com/server/analytics/types.ts`

```typescript
type IAnalyticsEventName =
  | 'page_view'
  | 'signup_started'
  | 'signup_completed'
  | 'login'
  | 'logout'
  | 'subscription_created'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'credit_pack_purchased'
  | 'credits_deducted'
  | 'api_call_completed'
  | 'content_downloaded'
  | 'checkout_started'
  | 'checkout_completed'
  | 'checkout_abandoned'
  | 'rate_limit_exceeded'
  | 'processing_failed'
  | 'batch_limit_modal_shown'
  | 'batch_limit_upgrade_clicked'
  | 'batch_limit_partial_add_clicked'
  | 'batch_limit_modal_closed';
```

## Client-Side Logger

Location: `/home/joao/projects/autopilotrank.com/client/utils/logger.ts`

Simple client-side logging utility:

```typescript
import { ClientLogger, useLogger } from '@client/utils/logger';

// Direct usage
ClientLogger.info('Component mounted', { props });
ClientLogger.warn('Deprecated API used');
ClientLogger.error('Fetch failed', { url, status });

// Hook usage
const logger = useLogger('MyComponent');
logger.info('User clicked button');
```

**Behavior:**

- Development: Console methods with formatted output
- Production: Errors logged to Baselime RUM (auto-captured)

## Health Check Endpoint

Location: `/home/joao/projects/autopilotrank.com/src/pages/api/health/index.ts`

Public health check endpoint:

- **Route:** `GET /api/health`
- **Response Format:**

```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  timestamp: string,
  region: 'Cloudflare' | 'Local',
  checks: {
    database: {
      status: 'pass' | 'fail',
      message: string,
      duration?: number
    }
  }
}
```

- **Status Codes:** 200 for healthy/degraded, 503 for unhealthy
- **Headers:** `Cache-Control: no-store, must-revalidate`

## Environment Configuration

### Environment Variables

**Server-side (`.env.api`):**

```bash
BASELIME_API_KEY=xxx          # Baselime logging
AMPLITUDE_API_KEY=xxx         # Server-side analytics
```

**Client-side (`.env.client`):**

```bash
PUBLIC_AMPLITUDE_API_KEY=xxx  # Client-side analytics
```

### Development vs Production

- **Development:** Baselime logging disabled, console logging enabled
- **Production:** Baselime logging enabled, console logging minimal

## Usage Patterns

### API Route with Monitoring

```typescript
import { createLogger } from '@server/monitoring/logger';
import { trackServerEvent } from '@server/analytics';

export async function POST(request: Request) {
  const logger = createLogger(request, 'checkout-api');

  try {
    logger.info('Checkout started', { plan: 'pro' });

    // Process payment...

    await trackServerEvent(
      'checkout_completed',
      { plan: 'pro', amountCents: 2900 },
      { apiKey: serverEnv.AMPLITUDE_API_KEY, userId: user.id }
    );

    logger.info('Checkout completed', { subscriptionId });
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Checkout failed', { error: error.message });
    throw error;
  } finally {
    await logger.flush();
  }
}
```

### Using withLogging Wrapper

```typescript
import { withLogging, HttpError } from '@server/monitoring/logger';

export const GET = withLogging('user-api', async (request, logger) => {
  const user = await getUser(request);

  if (!user) {
    throw new HttpError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  logger.info('User data fetched', { userId: user.id });
  return Response.json({ user });
});
```

## CSP Configuration

The Content Security Policy allows Baselime and Amplitude:

```typescript
'connect-src': [
  'https://rum.baselime.io',     // Baselime RUM
  'https://*.amplitude.com',     // Amplitude analytics
  // ...
]
```

See `/home/joao/projects/autopilotrank.com/shared/config/security.ts` for full CSP configuration.
