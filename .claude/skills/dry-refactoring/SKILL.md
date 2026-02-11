---
name: dry-refactoring
description: Identify and eliminate code duplication across client hooks, API routes, services, and shared utilities. Suggests abstractions, custom hooks, factory patterns, and shared schemas to reduce repetition while keeping things simple (KISS).
---

# DRY Refactoring Guide

Use this skill when auditing the codebase for duplication, or when creating new features that might duplicate existing patterns. The goal is to reduce repetition without over-engineering.

## How to Run an Audit

When asked to find DRY violations, scan these areas in order:

1. **Validation Schemas** - Duplicate Zod schemas across API routes and services
2. **API Route Boilerplate** - Repeated auth/validation/error patterns in `src/pages/api/`
3. **Client Hooks** - Repeated fetch/mutation patterns in `client/hooks/`
4. **Service Layer** - Repeated CRUD patterns in `server/services/`
5. **Component Logic** - Repeated UI patterns in `client/components/`

Report findings as a table: `| Location | Pattern | Severity | Suggested Fix |`

---

## 1. Validation Schema Duplication (Critical)

### Problem

Zod schemas are often defined in BOTH the API route AND the service layer, leading to drift.

```typescript
// BAD: Schema duplicated in two files
// src/pages/api/campaigns/index.ts
const createCampaignSchema = z.object({ name: z.string().min(1), ... });

// server/services/campaign.service.ts
const createCampaignSchema = z.object({ name: z.string().min(1), ... });
```

### Fix: Single Source of Truth in `shared/validation/`

```typescript
// shared/validation/campaign.schema.ts
import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100),
  projectId: z.string().uuid('Invalid project ID'),
  keywords: z.array(z.string().min(1).max(200)).min(1).max(500),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial().omit({ projectId: true });

export type ICreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type IUpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
```

```typescript
// Then import in BOTH places:
// src/pages/api/campaigns/index.ts
import { createCampaignSchema } from '@shared/validation/campaign.schema';

// server/services/campaign.service.ts
import { createCampaignSchema } from '@shared/validation/campaign.schema';
```

### Where Schemas Should Live

| Schema Type | Location | Example |
|-------------|----------|---------|
| Entity CRUD schemas | `shared/validation/{entity}.schema.ts` | `campaign.schema.ts` |
| Form-specific schemas | `shared/validation/{entity}.schema.ts` (same file) | `projectOnboardingSchema` |
| One-off API validation | Inline in API route (acceptable) | Query param checks |

### Existing Good Example

`shared/validation/project.schema.ts` already centralizes project schemas - follow this pattern for all entities.

---

## 2. API Route Boilerplate (High Priority)

### Problem

Every API route repeats the same auth + try/catch + error handling wrapper:

```typescript
// This pattern is repeated in EVERY authenticated route
export const GET: APIRoute = async ({ url, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
  } catch {
    return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
  }

  try {
    // ... actual logic ...
  } catch (error) {
    console.error('Error doing X:', error);
    if (error instanceof z.ZodError) {
      return errorResponse('VALIDATION_ERROR', error.errors[0]?.message ?? 'Validation failed', 400);
    }
    const message = error instanceof Error ? error.message : 'Failed to do X';
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
};
```

### Fix: Authenticated Route Handler Factory

Add to `src/pages/api/_utils.ts`:

```typescript
import type { APIRoute, APIContext } from 'astro';
import { z } from 'zod';

type AuthenticatedHandler = (
  userId: string,
  context: APIContext
) => Promise<Response>;

/**
 * Wraps an API route with authentication and standard error handling.
 * Eliminates repeated auth check + try/catch boilerplate.
 */
export function withAuth(handler: AuthenticatedHandler): APIRoute {
  return async (context) => {
    let userId: string;
    try {
      userId = getUserIdFromLocals(context.locals);
    } catch {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    try {
      return await handler(userId, context);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse(
          'VALIDATION_ERROR',
          error.errors[0]?.message ?? 'Validation failed',
          400
        );
      }

      console.error(`[API] ${context.url.pathname}:`, error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return errorResponse('INTERNAL_ERROR', message, 500);
    }
  };
}
```

### Usage (Before vs After)

```typescript
// BEFORE: 30+ lines of boilerplate per handler
export const GET: APIRoute = async ({ url, locals }) => {
  let userId: string;
  try { userId = getUserIdFromLocals(locals); } catch { ... }
  try {
    const projectId = url.searchParams.get('projectId');
    if (!projectId) return errorResponse('VALIDATION_ERROR', '...', 400);
    const campaigns = await campaignService.listByProject(userId, projectId);
    return jsonResponse({ campaigns });
  } catch (error) { ... }
};

// AFTER: Just the logic
export const GET = withAuth(async (userId, { url }) => {
  const projectId = url.searchParams.get('projectId');
  if (!projectId) {
    return errorResponse('VALIDATION_ERROR', 'projectId is required', 400);
  }
  const campaigns = await campaignService.listByProject(userId, projectId);
  return jsonResponse({ campaigns });
});
```

### Validated Body Variant

```typescript
/**
 * Wraps an API route with auth + body validation.
 * For POST/PUT/PATCH routes that need parsed + validated bodies.
 */
export function withAuthAndBody<T extends z.ZodType>(
  schema: T,
  handler: (userId: string, body: z.infer<T>, context: APIContext) => Promise<Response>
): APIRoute {
  return withAuth(async (userId, context) => {
    const body = await getBody(context.request, schema);
    return handler(userId, body, context);
  });
}

// Usage:
export const POST = withAuthAndBody(createCampaignSchema, async (userId, input, ctx) => {
  const campaign = await campaignService.create(userId, input);
  return jsonResponse({ campaign }, 201);
});
```

---

## 3. Client Hook Patterns (Medium Priority)

### Problem

Every entity hook (`useProjects`, `useCampaigns`, `useArticles`) repeats:
1. API fetch functions (GET/POST/PUT/DELETE)
2. `useQuery` setup with similar options
3. `useMutation` + `useMutationWithToast` wrapping
4. Cache invalidation patterns

### Fix A: Typed API Helpers

Add to `client/utils/api-client.ts`:

```typescript
/**
 * Typed GET helper - eliminates repeated apiFetch boilerplate
 */
export async function apiGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = params ? `${endpoint}?${buildQueryString(params)}` : endpoint;
  const result = await apiFetch<{ data: T }>(url, { method: 'GET' });
  return result.data;
}

/**
 * Typed POST helper
 */
export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const result = await apiFetch<{ data: T }>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result.data;
}

// Same for apiPut, apiPatch, apiDelete

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) searchParams.set(key, String(value));
  }
  return searchParams.toString();
}
```

### Fix B: CRUD Query Key Convention

Standardize query keys to enable consistent invalidation:

```typescript
// client/hooks/queryKeys.ts
export const queryKeys = {
  projects: {
    all: (userId?: string) => ['projects', userId] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  },
  campaigns: {
    all: (projectId: string) => ['campaigns', projectId] as const,
    detail: (campaignId: string) => ['campaigns', 'detail', campaignId] as const,
  },
  articles: {
    all: (params: Record<string, unknown>) => ['articles', params] as const,
    detail: (articleId: string) => ['articles', 'detail', articleId] as const,
  },
} as const;
```

### When NOT to Abstract Hooks Further

Do NOT create a generic `useEntityCRUD` factory. Each entity hook has unique logic:
- `useProjects` has active project management + auto-selection
- `useCampaigns` has project-scoped queries
- `useCampaignDetail` has complex nested data

**The existing `useMutationWithToast` is the right level of abstraction.** Don't go higher - it would violate KISS.

---

## 4. Service Layer Patterns (Medium Priority)

### Problem

Services repeat ownership-check and CRUD patterns:

```typescript
// This pattern appears in ProjectService, CampaignService, etc.
async getById(id: string, userId: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from('table_name')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(`Failed to get entity: ${error.message}`);
  return data as T;
}
```

### Fix: Supabase Query Helpers

Add to `server/supabase/queryHelpers.ts`:

```typescript
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Fetch a single row by ID with ownership check.
 * Returns null if not found, throws on other errors.
 */
export async function getOwnedRecord<T>(
  table: string,
  id: string,
  userId: string,
  select = '*'
): Promise<T | null> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(select)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(`Failed to get ${table}: ${error.message}`);
  return data as T;
}

/**
 * List rows for a user, ordered by creation date (newest first).
 */
export async function listOwnedRecords<T>(
  table: string,
  userId: string,
  select = '*',
  orderBy = 'created_at'
): Promise<T[]> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(select)
    .eq('user_id', userId)
    .order(orderBy, { ascending: false });

  if (error) throw new Error(`Failed to list ${table}: ${error.message}`);
  return (data as T[]) ?? [];
}

/**
 * Delete a row with ownership check.
 */
export async function deleteOwnedRecord(
  table: string,
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete ${table}: ${error.message}`);
}

/**
 * Build an update object from validated input, including only defined fields.
 */
export function buildUpdateObject<T extends Record<string, unknown>>(
  input: T,
  transforms?: Partial<Record<keyof T, (value: unknown) => unknown>>
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      updates[key] = transforms?.[key as keyof T]
        ? transforms[key as keyof T]!(value)
        : value;
    }
  }
  return updates;
}
```

### Usage in Services

```typescript
// server/services/project.service.ts
import { getOwnedRecord, listOwnedRecords, deleteOwnedRecord } from '@server/supabase/queryHelpers';

export class ProjectService {
  async getById(projectId: string, userId: string) {
    return getOwnedRecord<IProject>('projects', projectId, userId);
  }

  async listByUser(userId: string) {
    return listOwnedRecords<IProject>('projects', userId);
  }

  async delete(projectId: string, userId: string) {
    return deleteOwnedRecord('projects', projectId, userId);
  }

  // create() and update() stay custom - they have entity-specific logic
}
```

### When NOT to Create a Base Service Class

Do NOT create an abstract `BaseEntityService<T>`. Services have entity-specific:
- Validation logic (plan limits, ownership cascades)
- Side effects (cascade deletes, audit logs)
- Complex queries (joins, computed fields)

**Query helpers > inheritance.** Composition over inheritance.

---

## 5. Component DRY Patterns (Low Priority)

### Common Duplication Spots

| Pattern | Where to Look | Fix |
|---------|---------------|-----|
| Loading + error + empty states | Dashboard views | Shared `DataState` wrapper component |
| Modal open/close state | Various modals | `useDisclosure()` hook |
| Form submit + loading UI | Form components | Already using React Hook Form |
| Confirmation dialogs | Delete buttons | Already has `ConfirmDialog` component |

### Existing Good Abstractions (Don't Re-Invent)

- `useMutationWithToast` - Mutation + toast + error logging
- `ConfirmDialog` - Reusable confirmation modal
- `Toast` system - Global toast notifications
- `useLogger` - Consistent client-side logging
- `apiFetch` - Authenticated API client

---

## Audit Checklist

When auditing for DRY violations, check each item:

### Schemas
- [ ] Any Zod schema defined in more than one file?
- [ ] Can schema be moved to or already exists in `shared/validation/`?
- [ ] Are `z.infer<>` types co-located with their schemas?

### API Routes (`src/pages/api/`)
- [ ] Auth boilerplate repeated? Use `withAuth()` wrapper
- [ ] Body validation repeated? Use `withAuthAndBody()` wrapper
- [ ] Error handling pattern consistent across routes?

### Hooks (`client/hooks/`)
- [ ] Fetch functions following `apiGet`/`apiPost` helpers?
- [ ] Query keys using `queryKeys` convention?
- [ ] Mutations wrapped with `useMutationWithToast`?

### Services (`server/services/`)
- [ ] Using `getOwnedRecord`/`listOwnedRecords` helpers?
- [ ] Update objects built with `buildUpdateObject`?
- [ ] Validation using shared schemas from `shared/validation/`?

### Components
- [ ] Loading/error/empty states extracted to shared components?
- [ ] Modal state using `useDisclosure` or similar?
- [ ] No inline API calls - always through hooks?

---

## Anti-Patterns to Avoid

### Don't Over-Abstract

```typescript
// BAD: Generic CRUD factory that's harder to understand than the duplication
const useCRUD = createEntityHook<Campaign>({
  entity: 'campaigns',
  endpoints: { list: '/api/campaigns', ... },
  queryKey: ['campaigns'],
});

// GOOD: Specific hook with clear intent, using shared helpers
function useCampaigns(projectId: string) {
  return useQuery({
    queryKey: queryKeys.campaigns.all(projectId),
    queryFn: () => apiGet<ICampaignWithStats[]>('/api/campaigns', { projectId }),
  });
}
```

### Don't Abstract Prematurely

- **2 occurrences**: Leave it. Note for future.
- **3 occurrences**: Consider extracting if the pattern is stable.
- **4+ occurrences**: Extract it.

### Don't Break Colocation

If a schema is only used by one API route and one service, and they're tightly coupled, a shared file is still better. But don't create `shared/validation/one-off-thing.schema.ts` for something used in a single endpoint.

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Validation schemas | `shared/validation/{entity}.schema.ts` | `campaign.schema.ts` |
| Query key maps | `client/hooks/queryKeys.ts` | Single file |
| API helpers | `client/utils/api-client.ts` | Extend existing |
| DB query helpers | `server/supabase/queryHelpers.ts` | New file |
| Route wrappers | `src/pages/api/_utils.ts` | Extend existing |
