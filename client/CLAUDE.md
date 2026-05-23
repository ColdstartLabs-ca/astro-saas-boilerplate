# Client Directory

## Overview

Client-side React components, hooks, and utilities that run in the browser.

## Structure

### Components (`client/components/`)

- `ui/` - Reusable UI components (buttons, inputs, modals, etc.)
- `layout/` - Layout components (headers, footers, sidebars)
- `forms/` - Form components with validation
- `features/` - Feature-specific components

### Hooks (`client/hooks/`)

- Custom React hooks for data fetching, state management, and utilities
- Examples: `useAuth`, `useSupabase`, `useStripe`, `useLocalStorage`

### Store (`client/store/`)

- Zustand stores for global client state
- Minimal usage - prefer server state via React Query

### Styles (`client/styles/`)

- Tailwind CSS configuration and custom styles
- Component-specific styling files

### Utils (`client/utils/`)

- Client-side utility functions
- Helpers for API calls, data formatting, etc.

## Conventions

- Interfaces: Prefix with `I` (e.g., `IUser`)
- Dates: dayjs
- Logging: `client/utils/logger.ts`

## Key Rules

- All TypeScript files (`.ts`, `.tsx`)
- Use functional components with hooks
- Components should be small and focused
- Use composition over inheritance
- Implement proper error boundaries
- Use React Query for server state management
- Use Zustand sparingly for global client state
- **UX**: Don't make users think — clarity beats cleverness every time.
- **State**: Use zustand to avoid prop drilling when state is shared across multiple components.
- When React files violate SRP, DRY, or KISS, use `/react-refactoring` for systematic refactoring patterns.
- **API requests**: Use [`useApiRequest`](/home/joao/projects/example.com/client/hooks/useApiRequest.ts) for client `fetch` calls. It centralizes auth header injection, JSON body handling, envelope unwrapping, and error normalization.
- **Auth toggle**: For public endpoints, call `request(url, { authenticated: false })`; keep `authenticated: true` (default) for protected routes.

## Styling Rules

- **Never hardcode colors** — always use Tailwind theme tokens (e.g., `text-primary`, `bg-surface`, `border-muted`)
- Do not use arbitrary color values like `text-[#ff0000]`, `bg-[rgb(0,0,0)]`, or inline `style={{ color: '...' }}`
- If a color isn't available in the theme, add it to `tailwind.config.ts` instead of hardcoding it
- Use semantic tokens (`primary`, `secondary`, `muted`, `destructive`, etc.) over raw palette values (`gray-500`, `red-600`)

## Dependencies

- React 18+ with hooks
- React Query/SWR for server state
- Zustand for minimal global state
- Tailwind CSS for styling
