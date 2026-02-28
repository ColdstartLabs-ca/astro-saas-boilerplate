# Server Directory

## Overview

Server-side code including API handlers, middleware, and external service integrations.

## Structure

### Services (`server/services/`)

- Business logic and data processing
- External API integrations
- Utility functions for server operations

### Supabase (`server/supabase/`)

- Database queries and operations
- Authentication helpers
- Row Level Security (RLS) policies

### Stripe (`server/stripe/`)

- Payment processing logic
- Webhook handlers
- Subscription management

### Analytics (`server/analytics/`)

- Event tracking implementation
- Analytics service integrations
- Data aggregation logic

### Middleware (`server/middleware/`)

- Request processing middleware
- Authentication checks
- Error handling middleware

### Monitoring (`server/monitoring/`)

- Baselime error monitoring setup
- Performance tracking
- Health check endpoints

## Conventions

- Interfaces: Prefix with `I` (e.g., `IUser`)
- Dates: dayjs
- Logging: `server/monitoring/logger.ts`

## Key Rules

- All server-side code only (never exposed to browser)
- Use environment variables from `.env.prod` (no `NEXT_PUBLIC_` prefix)
- Implement proper error handling and logging
- Validate all input data
- Use TypeScript with strict typing
- Server components and API routes should be lightweight

## Security

- **Never trust the client** — validate and authorize everything server-side.
- Never expose sensitive data
- Implement proper authentication checks
- Validate and sanitize all inputs
- Use HTTPS-only cookies for sensitive data
- Implement rate limiting where appropriate

## Golden Rules

- **API**: Fail loudly with actionable errors — vague 500s are bugs in themselves.
- **Database**: Every schema change is a migration — never alter directly.
- **Testing**: Test behavior, not implementation — tests should survive refactors.

## API Routes

### Public API Routes

Add public routes to `PUBLIC_API_ROUTES` in `shared/config/security.ts`.
