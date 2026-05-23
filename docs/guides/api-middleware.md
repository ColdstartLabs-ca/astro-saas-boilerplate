# API Middleware & Security Guide

This guide explains how to use the API middleware system for authentication, rate limiting, CORS, and security headers.

## Overview

The middleware system provides automatic:

- **JWT Authentication** - Verifies Supabase tokens for protected routes
- **Rate Limiting** - Prevents API abuse (50 req/10s for authenticated, 10 req/10s for public)
- **Security Headers** - CSP, X-Frame-Options, X-Content-Type-Options, etc.
- **CORS Configuration** - Cross-origin resource sharing for API routes
- **User Context** - Injects user information into request headers

**No external dependencies or paid services required!** Uses simple in-memory rate limiting.

## Quick Start

### 1. Set Up Environment Variables

Add to your `.env.api`:

```bash
# Supabase service role key (from Supabase Dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# CORS - set to your domain in production
ALLOWED_ORIGIN=*
```

### 2. Configure CORS (Production Only)

For production, set the allowed origin in `.env.api`:

```bash
ALLOWED_ORIGIN=https://yourdomain.com
```

⚠️ **Security Warning**: Never use `ALLOWED_ORIGIN=*` in production!

That's it! No external services to set up.

## How It Works

### Architecture Flow

```
1. Client Request
   ↓
2. middleware.ts (runs on Cloudflare Edge)
   ↓
3. Security Headers Applied
   ↓
4. Public Route Check
   ├─ Yes → IP-based Rate Limit → Continue
   └─ No → JWT Verification
       ↓
5. User-based Rate Limit
   ↓
6. Set User Headers (X-User-Id, X-User-Email)
   ↓
7. API Route Handler (server/api/*/route.ts)
```

### File Structure

```
example.com/
├── src/middleware/
│   └── index.ts                                  # Main middleware (runs on Edge)
├── server/lib/
│   └── rateLimit.ts                              # In-memory rate limiter
├── server/api/
│   ├── health/route.ts                           # Public route example
│   └── protected/example/route.ts                # Protected route example
└── tests/api/
    └── middleware.spec.ts                         # Integration tests
```

## Creating Protected Routes

### Basic Example

```typescript
import { type APIRoute } from 'astro';
import { getAuthenticatedUser } from '@/server/middleware/getAuthenticatedUser';

export const GET: APIRoute = async req => {
  // Middleware already verified JWT and set X-User-Id header
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  return new Response(
    JSON.stringify({
      message: 'Success',
      userId: user.id,
    })
  );
};
```

### Accessing User Without Database Query

If you only need the user ID or email, read it directly from headers:

```typescript
export const GET: APIRoute = async req => {
  const userId = req.headers.get('X-User-Id');
  const userEmail = req.headers.get('X-User-Email');

  // No database query needed
  return new Response(JSON.stringify({ userId, userEmail }));
};
```

## Creating Public Routes

Add routes to the `PUBLIC_API_ROUTES` array in `shared/config/security.ts`:

```typescript
export const PUBLIC_API_ROUTES = [
  '/api/health', // Health checks
  '/api/webhooks/*', // External services with own auth
  '/api/support/*', // Public forms (validated + rate limited)
] as const;
```

Public routes still get:

- Security headers
- IP-based rate limiting (10 requests per 10 seconds)
- CORS headers

## Rate Limiting

### How It Works

The middleware uses a **simple in-memory rate limiter** with sliding window algorithm:

- Stores timestamps in memory (Map)
- Automatically cleans up old entries every 5 minutes
- No external dependencies
- Perfect for single-instance deployments

### Authenticated Routes

- **Limit**: 50 requests per 10 seconds per user
- **Identifier**: User ID from JWT

### Public Routes

- **Limit**: 10 requests per 10 seconds per IP
- **Identifier**: IP address (from `x-forwarded-for` or `req.ip`)

### Rate Limit Headers

All responses include:

```
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
```

When rate limited (429 response):

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-15T10:30:00.000Z
Retry-After: 8
```

### Customizing Rate Limits

Edit `server/lib/rateLimit.ts`:

```typescript
// Change authenticated user limits
export const rateLimit = {
  limit: createRateLimiter(100, 60 * 1000), // 100 req/min
};

// Change public route limits
export const publicRateLimit = {
  limit: createRateLimiter(5, 10 * 1000), // 5 req/10s
};
```

### Multi-Instance Deployments

⚠️ **Note**: The in-memory rate limiter works great for single-instance deployments. For multi-instance deployments (e.g., Cloudflare with multiple edge locations), each instance has its own memory, so limits are per-instance.

If you need global rate limiting across all instances, consider:

- Cloudflare KV
- Cloudflare Durable Objects
- Redis (self-hosted or managed)

## Security Headers

The middleware automatically applies these headers to all API responses:

### Frame Protection

```
X-Frame-Options: DENY
```

Prevents clickjacking attacks.

### Content Type Sniffing

```
X-Content-Type-Options: nosniff
```

Prevents MIME type sniffing.

### XSS Protection

```
X-XSS-Protection: 1; mode=block
```

Legacy XSS filter (for older browsers).

### Referrer Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

Controls referrer information sent with requests.

### Content Security Policy

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
```

Restricts resource loading to prevent XSS and data injection.

### Permissions Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Disables browser features that could leak data.

### Customizing Security Headers

Edit `shared/config/security.ts` to adjust headers:

```typescript
// Example: Allow images from external CDN
const cspHeader = `
  default-src 'self';
  img-src 'self' https://cdn.example.com;
  script-src 'self' 'unsafe-inline';
`
  .replace(/\s{2,}/g, ' ')
  .trim();

res.headers.set('Content-Security-Policy', cspHeader);
```

## CORS Configuration

### Development

Default behavior (allows all origins):

```bash
ALLOWED_ORIGIN=*
```

### Production

Restrict to your domain:

```bash
ALLOWED_ORIGIN=https://yourdomain.com
```

## Testing

### Run Middleware Tests

```bash
yarn test:api
```

### Manual Testing with cURL

**Test public route:**

```bash
curl http://localhost:4321/api/health
```

**Test protected route (should fail):**

```bash
curl http://localhost:4321/api/protected/example
# Expected: 401 Unauthorized
```

**Test with valid token:**

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4321/api/protected/example
```

**Test rate limiting:**

```bash
for i in {1..15}; do
  curl http://localhost:4321/api/health
  echo "Request $i"
done
# Expected: Some requests return 429 after hitting limit
```

## Troubleshooting

### Rate Limiting Not Working as Expected

**Problem**: Users can make more requests than the limit.

**Explanation**: For multi-instance deployments, each instance has its own memory, so the limit is per-instance. This is expected behavior for in-memory rate limiting.

**Solution**: If you need strict global limits, upgrade to Cloudflare KV or Redis.

### 401 Unauthorized for Valid Token

**Problem**: Authenticated requests return 401.

**Solution**:

1. Verify token is in `Authorization: Bearer <token>` format
2. Check token hasn't expired (Supabase JWTs expire after 1 hour)
3. Ensure `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set

### CORS Errors in Browser

**Problem**: `Access-Control-Allow-Origin` errors in browser console.

**Solution**:

1. Check `ALLOWED_ORIGIN` matches your frontend domain
2. Ensure preflight OPTIONS requests are handled (automatic in Astro)
3. Verify request includes correct `Origin` header

### Missing User Profile

**Problem**: `getAuthenticatedUser()` returns `null` even with valid token.

**Solution**:

1. Verify user has a profile in `profiles` table
2. Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Ensure Row Level Security (RLS) policies allow service role access

## Performance

### Edge Runtime

The middleware runs on Cloudflare's Edge Runtime (not Node.js), which means:

- **Cold start**: ~10-50ms
- **Warm execution**: ~5-20ms
- **Global distribution**: Runs close to users worldwide

### In-Memory Rate Limiter

The in-memory rate limiter is extremely fast:

- **Lookup time**: ~1ms
- **Cleanup overhead**: Minimal (runs every 5 minutes in background)

Total middleware overhead: **6-70ms** per request.

### Optimization Tips

1. **Skip middleware for static assets** (already done via `matcher`)
2. **Cache user profiles** if calling `getAuthenticatedUser()` frequently
3. **Use IP-based identifier** for public routes (faster than user lookup)

## Security Best Practices

### Never Commit Secrets

Always use `.env.api` for development and environment variables in production:

```bash
# ❌ Bad
SUPABASE_SERVICE_ROLE_KEY=abc123

# ✅ Good
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY} # From CI/CD secrets
```

### Rotate Tokens Regularly

- Rotate Supabase service role key on security events
- Use short-lived JWTs (Supabase default: 1 hour)

### Monitor Rate Limit Violations

Set up alerts for unusual patterns:

- Same user hitting limit repeatedly (possible bot)
- IP addresses from unexpected regions
- Sudden spike in 429 responses

### Validate Input in Route Handlers

Middleware handles authentication, but you must still validate input:

```typescript
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const POST: APIRoute = async req => {
  const user = await getAuthenticatedUser(req);
  if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const body = await req.json();
  const result = bodySchema.safeParse(body);

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), { status: 400 });
  }

  // Proceed with validated data
};
```

## FAQ

### Can I use this with other platforms?

Yes, the middleware is compatible with both Cloudflare Workers and other edge runtime platforms.

### Does this work with API routes outside `/api`?

Yes, update the `PUBLIC_API_ROUTES` in `shared/config/security.ts` to include your custom paths.

### Can I disable rate limiting for specific routes?

Yes, add routes to a custom `NO_RATE_LIMIT_ROUTES` array and skip rate limiting:

```typescript
const NO_RATE_LIMIT_ROUTES = ['/api/webhooks/stripe'];

if (NO_RATE_LIMIT_ROUTES.includes(pathname)) {
  // Skip rate limiting but keep auth
}
```

## Additional Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
