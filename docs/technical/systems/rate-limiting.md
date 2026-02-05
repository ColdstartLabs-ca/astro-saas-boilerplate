# Rate Limiting System

In-memory rate limiting for API protection using sliding window algorithm.

## Overview

Location: `/home/joao/projects/autopilotrank.com/server/rateLimit.ts`

The application uses simple in-memory rate limiting with no external dependencies. Rate limiting is applied via Astro middleware at `/home/joao/projects/autopilotrank.com/src/middleware.ts`.

## Rate Limiters

### Available Limiters

```typescript
import { rateLimit, publicRateLimit } from '@server/rateLimit';

// Authenticated users: 50 requests per 10 seconds
rateLimit.limit(identifier);

// Public/anonymous: 10 requests per 10 seconds
publicRateLimit.limit(identifier);
```

### Limit Configuration

| User Type        | Limit | Window | Limiter           |
| ---------------- | ----- | ------ | ----------------- |
| Authenticated    | 50    | 10 sec | `rateLimit`       |
| Public/Anonymous | 10    | 10 sec | `publicRateLimit` |

### Special Case Limiters

The `upscaleRateLimit` is also available but is only used in specific contexts. It has special handling for test environments where rate limiting is skipped:

```typescript
// 5 requests per 60 seconds, skips in test environment
import { upscaleRateLimit } from '@server/rateLimit';
```

## Middleware Integration

Location: `/home/joao/projects/autopilotrank.com/lib/middleware/rateLimit.ts`

Rate limiting is applied through helper functions in the Astro middleware:

```typescript
import { applyPublicRateLimit, applyUserRateLimit } from '@lib/middleware';
```

### applyPublicRateLimit

For unauthenticated API routes:

```typescript
const rateLimitResponse = await applyPublicRateLimit(request, response);
if (rateLimitResponse) {
  return rateLimitResponse; // Returns 429 if rate limited
}
```

**Limit:** 10 requests per 10 seconds
**Identifier:** Client IP address

### applyUserRateLimit

For authenticated API routes:

```typescript
const rateLimitResponse = await applyUserRateLimit(userId, response);
if (rateLimitResponse) {
  return rateLimitResponse; // Returns 429 if rate limited
}
```

**Limit:** 50 requests per 10 seconds
**Identifier:** User ID

### IP Address Extraction

```typescript
import { getClientIp } from '@lib/middleware';

const ip = getClientIp(request);
```

Priority order:

1. `cf-connecting-ip` (Cloudflare-specific, most reliable)
2. `x-forwarded-for` (first IP)
3. `x-real-ip`
4. `unknown`

## Response Format

### Rate Limit Headers

All successful responses include rate limit headers:

```typescript
{
  'X-RateLimit-Limit': '50',           // Maximum requests
  'X-RateLimit-Remaining': '42',       // Requests remaining in window
  'X-RateLimit-Reset': '2024-01-15T10:30:00Z'  // Window reset time
}
```

### Rate Limited Response

When limit exceeded (HTTP 429):

```json
{
  "error": "Too many requests",
  "details": {
    "retryAfter": 5
  }
}
```

Headers:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 5
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-15T10:30:00Z
```

## Test Environment Detection

Rate limiting is automatically skipped in test environments:

```typescript
import { isTestEnvironment } from '@lib/middleware';

if (isTestEnvironment()) {
  // Rate limiting is disabled
}
```

**Test Conditions:**

- `ENV === 'test'`
- `NODE_ENV === 'test'`
- `PLAYWRIGHT_TEST === '1'`

## Algorithm Details

### Sliding Window

The rate limiter uses a sliding window algorithm:

1. Store timestamps of each request in memory
2. Remove timestamps outside the current window
3. If remaining timestamps >= limit, reject request
4. Otherwise, add current timestamp and accept request

### Memory Management

- **Storage:** In-memory `Map<string, IRateLimitEntry>`
- **Cleanup:** Every 5 minutes, removes entries with timestamps older than 5 minutes
- **Entry Structure:**

```typescript
interface IRateLimitEntry {
  timestamps: number[];
}
```

### Result Format

```typescript
interface IRateLimitResult {
  success: boolean; // Whether request is allowed
  remaining: number; // Requests remaining in window
  reset: number; // Unix timestamp of window reset
}
```

## Public API Routes

Rate limiting is applied to public API routes defined in `/home/joao/projects/autopilotrank.com/shared/config/security.ts`:

```typescript
export const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/webhooks/*',
  '/api/analytics/*',
  '/api/cron/*',
  '/api/proxy-image',
  '/api/support/*',
] as const;
```

Public routes use `applyPublicRateLimit()`. Protected API routes use `applyUserRateLimit()`.

## Limitations

### Single Instance

The in-memory implementation has known limitations:

- No shared state across Cloudflare Workers edge locations
- State is lost on worker restart/redeployment
- Rate limit evasion possible through distributed requests

### Mitigation Strategies

| Attack Vector        | Mitigation                    |
| -------------------- | ----------------------------- |
| IP rotation          | User ID limiting for auth     |
| Distributed requests | User ID limiting for auth     |
| Header spoofing      | Cloudflare `cf-connecting-ip` |

### Scaling Path

For multi-instance deployments, consider:

1. **Cloudflare KV** - Shared state, global consistency
2. **Durable Objects** - Perfect accuracy, higher cost
3. **Redis** - External cache, very high accuracy

## Usage Examples

### Direct Limiter Usage

```typescript
import { rateLimit } from '@server/rateLimit';

const { success, remaining, reset } = await rateLimit.limit('user_123');

if (!success) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return new Response('Too many requests', {
    status: 429,
    headers: { 'Retry-After': retryAfter.toString() },
  });
}

// Process request...
```

### Middleware Implementation

From `/home/joao/projects/autopilotrank.com/src/middleware.ts`:

```typescript
// For public API routes
if (isPublic) {
  const response = await next();
  applySecurityHeaders(response);

  const rateLimitResponse = await applyPublicRateLimit(request, response);
  if (rateLimitResponse) return rateLimitResponse;

  return response;
}

// For protected API routes
const authResult = await verifyApiAuth(request);

const response = await next();
applySecurityHeaders(response);

const rateLimitResponse = await applyUserRateLimit(authResult.user.id, response);
return rateLimitResponse || response;
```

## Dependencies

- No external dependencies
- Uses only built-in `Map` and `setInterval`
- Works in Cloudflare Workers edge runtime
- Environment detection via `serverEnv`

## Files Reference

| File                          | Purpose                          |
| ----------------------------- | -------------------------------- |
| `server/rateLimit.ts`         | Core rate limiter implementation |
| `lib/middleware/rateLimit.ts` | Middleware helper functions      |
| `src/middleware.ts`           | Astro middleware integration     |
| `shared/config/security.ts`   | Public API route definitions     |
