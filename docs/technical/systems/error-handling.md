# Error Handling System

## Overview

Comprehensive error handling using standardized response formats, error middleware for API routes, React Error Boundaries for client components, and Baselime monitoring integration.

## API Error Handling

### Standard Error Response Format

All API errors return this consistent structure:

```typescript
interface IErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}
```

### withErrorHandler Middleware (`server/middleware/errorHandler.ts`)

Higher-order function that wraps API route handlers with consistent error handling.

```typescript
import { withErrorHandler } from '@server/middleware/errorHandler';

export const GET = withErrorHandler(async req => {
  // Your handler logic
  return new Response(JSON.stringify({ success: true, data: result }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Behavior:**

- Catches all errors thrown in handler
- Returns formatted JSON error responses
- Preserves HTTP status codes from `AppError` instances
- Logs errors to console
- Uses `AppError.code` as error code, or `INTERNAL_ERROR` for unknown errors

### AppError Class (`shared/utils/errors.ts`)

Application error class with proper error code and details.

```typescript
import { AppError, ErrorCodes } from '@shared/utils/errors';

throw new AppError(
  ErrorCodes.INSUFFICIENT_CREDITS,
  'You do not have enough credits for this action.',
  402,
  { required: 10, balance: 5 }
);
```

### Error Codes (`shared/utils/errors.ts`)

| Code                   | Status | Description                          |
| ---------------------- | ------ | ------------------------------------ |
| `INVALID_REQUEST`      | 400    | The request is invalid or malformed  |
| `INVALID_FILE`         | 400    | Uploaded file type not supported     |
| `FILE_TOO_LARGE`       | 400    | File exceeds size limit              |
| `INVALID_DIMENSIONS`   | 400    | Image dimensions out of bounds       |
| `VALIDATION_ERROR`     | 400    | Request data validation failed       |
| `UNAUTHORIZED`         | 401    | Authentication required              |
| `FORBIDDEN`            | 403    | Permission denied                    |
| `NOT_FOUND`            | 404    | Resource not found                   |
| `INSUFFICIENT_CREDITS` | 402    | Not enough credits                   |
| `PAYMENT_REQUIRED`     | 402    | Payment required                     |
| `RATE_LIMITED`         | 429    | Too many requests                    |
| `BATCH_LIMIT_EXCEEDED` | 429    | Batch limit exceeded                 |
| `MODEL_NOT_FOUND`      | 400    | Model not found                      |
| `MODEL_NOT_SUPPORTED`  | 400    | Model doesn't support this operation |
| `TIER_RESTRICTED`      | 403    | Feature requires higher tier         |
| `INTERNAL_ERROR`       | 500    | Unexpected error occurred            |
| `AI_UNAVAILABLE`       | 503    | AI service temporarily unavailable   |
| `PROCESSING_FAILED`    | 500    | Processing failed                    |

### Utility Functions

| Function                  | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `createErrorResponse()`   | Creates standardized error response with status   |
| `createSuccessResponse()` | Creates standardized success response             |
| `serializeError()`        | Safely converts any error to user-friendly string |
| `ErrorStatusMap`          | Maps error codes to status codes and messages     |

## Monitoring Integration

### Baselime Logger (`server/monitoring/logger.ts`)

Edge-compatible logger for serverless functions.

```typescript
import { createLogger, HttpError } from '@server/monitoring/logger';

export async function POST(request: Request) {
  const logger = createLogger(request, 'api-namespace');

  try {
    logger.info('Processing request', { userId: '123' });
    // ... logic
    return Response.json({ success: true });
  } catch (error) {
    logger.error('Request failed', { error });
    throw new HttpError('Failed', 500, 'OPERATION_FAILED');
  } finally {
    await logger.flush();
  }
}
```

### withLogging Wrapper

Alternative to `withErrorHandler` that adds Baselime logging.

```typescript
import { withLogging } from '@server/monitoring/logger';

export const POST = withLogging('api-namespace', async (request, logger) => {
  logger.info('Processing');
  // Automatically logs completion/errors
  return Response.json({ success: true });
});
```

**Features:**

- Auto-flushes logs after handler completes
- Captures errors with stack traces
- Preserves `HttpError` status codes
- Returns formatted error responses

### HttpError Class

Custom error class compatible with the logging wrapper.

```typescript
throw new HttpError('Resource not found', 404, 'NOT_FOUND', { resourceId: '123' });
```

## Client-Side Error Handling

### ErrorBoundary Component (`client/components/errors/ErrorBoundary.tsx`)

React Error Boundary for catching React errors in component trees.

```tsx
import { ErrorBoundary } from '@client/components/errors/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary
  fallback={(error, resetError) => (
    <CustomErrorUI error={error} onRetry={resetError} />
  )}
>
  <YourComponent />
</ErrorBoundary>
```

**Features:**

- Catches and logs errors with stack traces
- Integrates with Baselime (checks `window.baselime.logError`)
- Shows detailed error info in development mode
- Provides "Try Again" and "Go Home" actions
- Supports custom fallback UI

## Server-Side Error Pages

### 404 Page (`src/pages/404.astro`)

Displayed when a route doesn't exist.

- Full-screen centered layout
- Large "404" display with search icon
- Links to home page
- Uses i18n translations

### 500 Page (`src/pages/500.astro`)

Displayed for unhandled server errors.

- Full-screen centered layout
- Warning icon with "Something went wrong"
- "Try Again" (reload) and "Go Home" buttons
- Shows development info in dev mode

## Best Practices

### API Errors

1. **Use AppError for known errors:**

   ```typescript
   throw new AppError(ErrorCodes.INSUFFICIENT_CREDITS, 'Not enough credits', 402);
   ```

2. **Wrap all handlers with middleware:**

   ```typescript
   export const POST = withErrorHandler(async (req) => { ... });
   // OR
   export const POST = withLogging('namespace', async (req, logger) => { ... });
   ```

3. **Include details for debugging:**
   ```typescript
   throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Invalid input', 400, {
     field: 'email',
     value: input,
   });
   ```

### Client Errors

1. **Wrap components that may throw:**

   ```tsx
   <ErrorBoundary>
     <DataFetchingComponent />
   </ErrorBoundary>
   ```

2. **Handle expected failures explicitly:**

   ```tsx
   const [error, setError] = useState<string | null>(null);
   try {
     await fetchData();
   } catch (err) {
     setError(err.message); // Show inline error
   }
   ```

3. **Always log errors:**
   ```tsx
   console.error('Operation failed:', error);
   ```

### Logging

1. **Use appropriate log levels:**
   - `logger.info()` - Normal operations
   - `logger.warn()` - Unexpected but recoverable issues
   - `logger.error()` - Errors requiring investigation

2. **Include context:**

   ```typescript
   logger.info('Processing payment', { userId, amount, planId });
   logger.error('Payment failed', { userId, error: err.message, code: err.code });
   ```

3. **Always flush:**
   ```typescript
   try {
     // ... logic
   } finally {
     await logger.flush();
   }
   ```

## Related Files

- `/home/joao/projects/autopilotrank.com/shared/utils/errors.ts`
- `/home/joao/projects/autopilotrank.com/server/middleware/errorHandler.ts`
- `/home/joao/projects/autopilotrank.com/server/monitoring/logger.ts`
- `/home/joao/projects/autopilotrank.com/client/components/errors/ErrorBoundary.tsx`
- `/home/joao/projects/autopilotrank.com/src/pages/404.astro`
- `/home/joao/projects/autopilotrank.com/src/pages/500.astro`
