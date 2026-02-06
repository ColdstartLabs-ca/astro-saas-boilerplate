# AutopilotRank - Claude Instructions

## About This Project

This is a production-ready Astro 5 + React 18 (islands architecture) SaaS application deployed on Cloudflare Pages. It provides core infrastructure for building credits-based SaaS products.

**Included Features:**

- Authentication (Supabase - Google, Azure, Email/Password)
- Payments (Stripe - subscriptions + one-time purchases)
- Credit System (subscription credits + purchased credits with rollover)
- User Management (profiles, admin roles)
- Blog System (MDX-based with SEO)
- Transactional Email (Brevo primary, Resend fallback)
- Rate Limiting & Error Handling
- Monitoring (Baselime + Analytics)

## Before Starting

Check `.claude/skills/` for relevant patterns.

## Critical Constraints

- **Cloudflare Workers**: 10ms CPU limit. No heavy computation. Prefer streaming. Delegate to browser when safe.
- **Colors**: Never hardcode - use Tailwind config tokens only.
- **Docs**: No auto-generated .md files unless explicitly requested.
- **Environment Variables**: NEVER use `process.env` directly. Use `clientEnv` or `serverEnv` from `@shared/config/env`.
- **Code Quality Principles**: SOLID, SRP, KISS, DRY, YAGNI.

## Before Starting

- If something is unclear or vague, ask AskUserQuestion before implementing.

## Before Finishing

- Write tests for your changes
- Run `yarn test` on affected areas
- Run `yarn verify` (required before completing any task)

## After Finishing

- Whenever you feel you learned a new "skill" for this codebase, feel free to add it to `.claude/skills/`.

## Conventions

- Principles: SOLID, SRP, KISS, DRY, YAGNI
- Interfaces: Prefix with `I` (e.g., `IUser`)
- Dates: dayjs
- Logging: `server/monitoring/logger.ts` | `client/utils/logger.ts`

### React Code Quality

When working with React files that violate code quality principles (SRP, DRY, KISS, etc.), use `/react-refactoring` for systematic refactoring patterns. This skill provides guidance on:

- Promoting Single Responsibility Principle
- Eliminating code duplication
- Simplifying complex logic
- Extracting reusable components

## Key Paths

- PRDs: `docs/PRDs/` → move to `done/` when complete
- Roadmap: `docs/management/ROADMAP.md`
- Env: `.env.client` (public) | `.env.api` (secrets)

## Stack

Astro 5 (SSR + Islands), React 18, React Hook Form, Zod, Zustand, Supabase, Stripe, Cloudflare Pages, Baselime

## Library Patterns

### Forms - React Hook Form

**Always use React Hook Form for forms.** Combine with Zod for validation:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = data => {
    /* ... */
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

### Validation - Zod

Use Zod for all input validation, API schemas, and type safety:

```tsx
// API route validation
const bodySchema = z.object({
  projectId: z.string().uuid(),
  action: z.enum(['pause', 'resume']),
});

// Type inference
type Body = z.infer<typeof bodySchema>;
```

### State Management - Zustand

Use Zustand for client-side state (server state via Supabase queries):

```tsx
import { create } from 'zustand';

type State = {
  projects: Project[];
  setProjects: (projects: Project[]) => void;
};

const useProjectStore = create<State>(set => ({
  projects: [],
  setProjects: projects => set({ projects }),
}));
```

### Database - Supabase

- Use `@server/db/supabase.ts` for server-side queries
- Use `@client/db/supabase.ts` for client-side queries
- Always use type-safe queries via generated types

### Payments - Stripe

- Use `@shared/config/stripe.ts` for Price IDs
- Handle webhooks in `src/pages/api/webhooks/stripe.ts`

## Customization Checklist

When starting a new project from this boilerplate:

1. **Branding**: Update `PUBLIC_APP_NAME` in `.env.client`
2. **Stripe**: Update Price IDs in `shared/config/stripe.ts`
3. **Email**: Customize templates in `emails/templates/`
4. **Translations**: Modify `locales/en/*.json` for your domain
5. **Pages**: Update landing page in `src/pages/index.astro`
6. **Blog**: Replace example posts in `src/content/blog/`
7. **Credits**: Define your credit costs in `shared/config/credits.config.ts`

## API Routes

### Public API Routes

Add public routes to `PUBLIC_API_ROUTES` in `shared/config/security.ts`:

```typescript
export const PUBLIC_API_ROUTES = [
  '/api/health', // Health checks
  '/api/webhooks/*', // External services with own auth
  '/api/support/*', // Public forms (validated + rate limited)
] as const;
```

**Public routes** don't require authentication but still get:

- Security headers
- CORS handling
- Rate limiting (public tier)

**Optional auth**: Public routes can still access authenticated user info via `X-User-Id` header if the client sends an Authorization header. Useful for things like support forms where you want to know who's submitting when available.
