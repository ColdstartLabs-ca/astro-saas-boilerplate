# Shared Directory

## Overview

Code and types that are shared between client and server environments.

## Structure

### Types (`shared/types/`)

- TypeScript interfaces and types used across the application
- Database schema types
- API request/response types
- Domain model definitions

### Utils (`shared/utils/`)

- Utility functions that work in both client and server
- Data transformation helpers
- Validation schemas
- Constants and enums

### Validation (`shared/validation/`)

- Zod schemas for data validation
- Form validation rules
- API payload validation
- Type-safe parsing utilities

### Config (`shared/config/`)

- Shared configuration values
- Feature flags
- Default settings
- Environment-specific constants

## Conventions

- Interfaces: Prefix with `I` (e.g., `IUser`)
- No browser-specific or Node.js-specific APIs

## Key Rules

- All code must work in both client and server environments
- Use universal JavaScript/TypeScript features only
- No browser-specific APIs (like `window`, `document`)
- No Node.js-specific APIs (like `fs`, `path`)
- Prefer pure functions without side effects
- Include comprehensive TypeScript types

## Usage Examples

```typescript
// Types
interface IUser {
  id: string;
  email: string;
  subscription: ISubscription;
}

// Validation
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Utils
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
```

## Dependencies

- TypeScript (strict mode)
- Zod for validation
- No external dependencies that require client/server specific features
