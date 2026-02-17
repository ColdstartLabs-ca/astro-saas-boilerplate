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

---

## Reliability: SLOs, SLIs & Error Budgets

> **Business Commitment:** AutopilotRank targets **99.9% uptime** (see [landing page](../../business/landing-page.md:392)). This section documents the technical implementation to support that commitment.

### Service Level Objectives (SLOs)

| Service                | SLO                | Measurement Period | Error Budget             |
| ---------------------- | ------------------ | ------------------ | ------------------------ |
| **API Availability**   | 99.9% uptime       | Rolling 30 days    | 43.2 minutes/month       |
| **Article Generation** | 99% success rate   | Rolling 7 days     | 1.68 hours/week          |
| **Payment Processing** | 99.9% success rate | Rolling 30 days    | 43.2 minutes/month       |
| **Data Persistence**   | 99.99% durability  | Calendar month     | ~4.3 minutes/year credit |

### Service Level Indicators (SLIs)

#### API Availability

```typescript
// Metric: (Successful requests / Total requests) * 100
// Target: >= 99.9%
// Source: Baselime request成功率 aggregation

interface IAvailabilitySLI {
  total_requests: number;
  successful_requests: number; // HTTP 2xx-3xx
  failed_requests: number; // HTTP 4xx-5xx
  availability_percentage: number;
}
```

**Alert Thresholds:**

- **Warning:** Availability < 99.5% for 5 minutes
- **Critical:** Availability < 99% for 2 minutes
- **Page:** Availability < 95% for 1 minute

#### Article Generation Success Rate

```typescript
// Metric: (Completed articles / Started articles) * 100
// Target: >= 99%
// Source: Amplitude `article_generated` event success property

interface IGenerationSLI {
  articles_started: number;
  articles_completed: number;
  articles_failed: number;
  success_rate: number;
  average_duration_ms: number;
}
```

**Alert Thresholds:**

- **Warning:** Success rate < 98% over 1 hour
- **Critical:** Success rate < 95% over 15 minutes

#### Payment Processing

```typescript
// Metric: (Successful payments / Attempted payments) * 100
// Target: >= 99.9%
// Source: Stripe webhook success rate + Baselime checkout API monitoring

interface IPaymentSLI {
  checkout_attempts: number;
  checkout_success: number;
  webhook_received: number;
  webhook_processed: number;
  end_to_end_success_rate: number;
}
```

**Alert Thresholds:**

- **Warning:** Success rate < 99.5% for 10 minutes
- **Critical:** Success rate < 99% for 5 minutes

### Error Budget Calculation

**Monthly Error Budget (99.9% uptime target):**

- Total time: 30 days × 24 hours × 60 minutes = 43,200 minutes
- Allowed downtime: 43,200 × 0.001 = 43.2 minutes
- Error budget: 43.2 minutes per month

**Error Budget Burn Rate:**

| Burn Rate | Description                            | Action                        |
| --------- | -------------------------------------- | ----------------------------- |
| **1x**    | Normal consumption within budget       | Monitor                       |
| **2x**    | Consuming budget 2x faster than normal | Investigate                   |
| **10x**   | Rapid burn - major incident            | Page on-call, halt releases   |
| **100x**  | Complete service outage                | Emergency response, all-hands |

### Incident Response

#### Severity Levels

| Severity  | Description                                 | Response Time | Example                              |
| --------- | ------------------------------------------- | ------------- | ------------------------------------ |
| **SEV-1** | Complete service outage, all users affected | 15 minutes    | API returning 500 for all requests   |
| **SEV-2** | Major feature broken, most users affected   | 1 hour        | Article generation completely failed |
| **SEV-3** | Minor feature broken, some users affected   | 4 hours       | Single CMS integration failing       |
| **SEV-4** | Cosmetic issue, no user impact              | 1 day         | Typos in UI                          |

#### On-Call Ownership

| Role                 | Responsibilities                         | Escalation                    |
| -------------------- | ---------------------------------------- | ----------------------------- |
| **On-Call Engineer** | Initial response, triage, assessment     | → Engineering Lead if >30 min |
| **Engineering Lead** | Coordination, communication, resolution  | → CTO if SEV-1                |
| **CTO**              | SEV-1 incidents, executive communication | → All-hands if needed         |

#### Incident Runbook Template

```markdown
# Incident [SEV-X]: [Brief Description]

**Started:** [Timestamp]
**Owner:** [Name]
**Severity:** [SEV-1/2/3/4]

## Status

[One-line status update]

## Impact

- [ ] Users affected: [estimate]
- [ ] Services affected: [list]
- [ ] Error budget impact: [calculation]

## Timeline

- [HH:MM] [What happened]
- [HH:MM] [Action taken]

## Next Steps

1. [ ] [Immediate action]
2. [ ] [Follow-up action]

## Links

- [Incident channel](#)
- [Dashboard](#)
- [Runbook](#)
```

### Monitoring Dashboards

**Key Dashboards:**

1. **Service Health** (Baselime)
   - Request rate, error rate, latency (p50, p95, p99)
   - Real-time alert status
   - Link: [Baselime Dashboard](https://app.baselime.io)

2. **Article Generation** (Amplitude)
   - Generation success rate
   - Average generation time
   - Failure reasons breakdown
   - Link: [Amplitude Dashboard](https://app.amplitude.com)

3. **Business Metrics** (Stripe + Custom)
   - Trial-to-paid conversion
   - MRR/churn
   - Active users
   - Link: [Stripe Dashboard](https://dashboard.stripe.com)

### Runbook: Common Incidents

#### High Error Rate

1. **Check Baselime** for error spike pattern and correlation
2. **Check recent deployments** - rollback if needed
3. **Check dependency status** (Supabase, Stripe, OpenRouter)
4. **Check rate limits** - are we hitting API quotas?

#### Payment Processing Failures

1. **Check Stripe Status** - [stripe.status](https://status.stripe.com)
2. **Review webhook logs** - are webhooks being received?
3. **Check idempotency** - duplicate events causing issues?
4. **Verify API keys** - rotation needed?

#### Article Generation Failures

1. **Check OpenRouter status** and API key
2. **Review recent generation logs** - specific error patterns?
3. **Check credit balances** - are users running out?
4. **Monitor token usage** - hitting rate limits?

---

## Baselime Alert Configuration

This section documents the alert rules that must be configured in the Baselime console for production monitoring. Alerts are based on structured error logs from the application.

### Alert Setup Instructions

1. Log in to [Baselime Console](https://app.baselime.io)
2. Navigate to the workspace for AutopilotRank
3. Go to **Alerts** > **Create Alert**
4. Configure each alert using the specifications below
5. Set notification channels (email, Slack, etc.)

### Required Alert Rules

#### Alert 1: Generation Failure Spike

**Description:** Triggers when article generation failures spike, indicating potential service degradation.

| Property        | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| **Name**        | Generation Failure Spike                                       |
| **Description** | More than 5 article generation failures in 10 minutes          |
| **Severity**    | Warning                                                        |
| **Query**       | `level=error AND message CONTAINS 'Article generation failed'` |
| **Threshold**   | Count > 5                                                      |
| **Time Window** | 10 minutes                                                     |
| **Channel**     | Email to admin                                                 |

**Baselime CLI Configuration:**

```yaml
alerts:
  - name: generation-failure-spike
    description: More than 5 article generation failures in 10 minutes
    enabled: true
    query:
      calc: count()
      filters:
        - key: level
          value: error
        - key: message
          value: Article generation failed
          operator: contains
      having:
        op: gt
        value: 5
    interval: 10m
    notifications:
      - type: email
        target: admin@autopilotrank.com
```

---

#### Alert 2: AI Provider Unavailable

**Description:** Triggers when AI providers return 503 errors, indicating provider outages.

| Property        | Value                                                      |
| --------------- | ---------------------------------------------------------- |
| **Name**        | AI Provider Unavailable                                    |
| **Description** | Any AI provider returns 503 more than 3 times in 5 minutes |
| **Severity**    | Critical                                                   |
| **Query**       | `provider IN (openrouter, replicate) AND httpStatus=503`   |
| **Threshold**   | Count > 3                                                  |
| **Time Window** | 5 minutes                                                  |
| **Channel**     | Email to admin                                             |

**Baselime CLI Configuration:**

```yaml
alerts:
  - name: ai-provider-unavailable
    description: AI provider returns 503 more than 3 times in 5 minutes
    enabled: true
    query:
      calc: count()
      filters:
        - key: provider
          value: openrouter,replicate
          operator: in
        - key: httpStatus
          value: 503
      having:
        op: gt
        value: 3
    interval: 5m
    notifications:
      - type: email
        target: admin@autopilotrank.com
```

---

#### Alert 3: Credit System Error

**Description:** Triggers on any credit system error (deduction or refund failures).

| Property        | Value                                       |
| --------------- | ------------------------------------------- |
| **Name**        | Credit System Error                         |
| **Description** | Any credit deduction or refund failure      |
| **Severity**    | Critical                                    |
| **Query**       | `message CONTAINS 'credit' AND level=error` |
| **Threshold**   | Count >= 1                                  |
| **Time Window** | 5 minutes                                   |
| **Channel**     | Email to admin                              |

**Baselime CLI Configuration:**

```yaml
alerts:
  - name: credit-system-error
    description: Any credit deduction or refund failure
    enabled: true
    query:
      calc: count()
      filters:
        - key: level
          value: error
        - key: message
          value: credit
          operator: contains
      having:
        op: gte
        value: 1
    interval: 5m
    notifications:
      - type: email
        target: admin@autopilotrank.com
```

---

#### Alert 4: Email Delivery Failure

**Description:** Triggers when email send failures exceed threshold.

| Property        | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| **Name**        | Email Delivery Failure                                                   |
| **Description** | Email send failures exceed 3 in 1 hour                                   |
| **Severity**    | Warning                                                                  |
| **Query**       | `message CONTAINS 'email' AND level=error AND message CONTAINS 'failed'` |
| **Threshold**   | Count > 3                                                                |
| **Time Window** | 1 hour                                                                   |
| **Channel**     | Email to admin                                                           |

**Baselime CLI Configuration:**

```yaml
alerts:
  - name: email-delivery-failure
    description: Email send failures exceed 3 in 1 hour
    enabled: true
    query:
      calc: count()
      filters:
        - key: level
          value: error
        - key: message
          value: email
          operator: contains
        - key: message
          value: failed
          operator: contains
      having:
        op: gt
        value: 3
    interval: 1h
    notifications:
      - type: email
        target: admin@autopilotrank.com
```

### Structured Error Logging Format

Article generation failures are logged with the following structured format for Baselime queries:

```typescript
{
  message: 'Article generation failed',
  level: 'error',
  articleId: string,
  timestamp: ISO8601,
  stage: 'credit_check' | 'outline_generation' | 'article_generation' | 'quality_gate' | 'image_generation' | 'image_upload' | 'metadata_extraction' | 'storage' | 'unknown',
  provider: 'openrouter' | 'replicate' | 'supabase' | 'stripe' | 'internal' | 'unknown',
  category: 'transient' | 'rate_limit' | 'quota_exceeded' | 'invalid_input' | 'auth' | 'timeout' | 'content_quality' | 'unknown',
  isRetryable: boolean,
  httpStatus: number | null,
  errorMessage: string
}
```

### Useful Baselime Queries

```bash
# All article generation failures in last hour
level=error AND message CONTAINS 'Article generation failed'

# Failures from specific provider
provider=openrouter AND level=error

# Retryable errors (good candidates for automatic retry)
isRetryable=true

# HTTP 5xx errors
httpStatus>=500

# Rate limit issues
category=rate_limit

# Provider timeouts
provider=openrouter AND category=timeout
```

### Alert Response Playbook

When an alert fires:

1. **Generation Failure Spike**:
   - Check OpenRouter/Replicate status pages
   - Review recent error messages in Baselime
   - Check if errors are retryable (`isRetryable=true`)
   - If widespread, consider temporarily pausing new generations

2. **AI Provider Unavailable**:
   - Verify provider status page (OpenRouter, Replicate)
   - Check if issue is provider-wide or account-specific
   - If provider is down, wait for recovery
   - If account issue, verify API keys and quotas

3. **Credit System Error**:
   - IMMEDIATE investigation required (billing impact)
   - Check Supabase database connectivity
   - Review credit transaction logs
   - Manually reconcile affected user credits if needed

4. **Email Delivery Failure**:
   - Check Brevo/Resend status pages
   - Verify email provider API keys
   - Review bounce/complaint logs in email provider
   - Check if sender domain reputation is affected
