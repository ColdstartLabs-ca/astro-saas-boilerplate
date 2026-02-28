# Supabase Directory

## Overview
Supabase database configuration, migrations, and database-related files.

## Structure

### Migrations (`supabase/migrations/`)
- Database schema migrations
- SQL files for table creation and updates
- Index definitions
- Function and trigger definitions

### Key Files
- Database schema definition files
- Migration scripts with timestamps
- Seed data files
- RLS (Row Level Security) policies

## Database Schema
Key tables and their purposes:
- `auth.users` - User authentication (Supabase managed)
- `profiles` - Extended user profile information
- `subscriptions` - User subscription data
- `credits` - User credit balance
- `files` - File upload records
- `processing_jobs` - Image processing job tracking

## Workflow

- **Migrations**: Always use migrations for schema changes. Do not edit database directly in production.
- **Local Dev**: Use `supabase start` and `supabase stop`.
- **Types**: Generate types with `supabase gen types typescript --local > src/types/supabase.ts`.

## Golden Rule

**Every schema change is a migration** — never alter the database directly.

## Migration Rules
- All migrations must be reversible
- Use descriptive migration names with timestamps
- Include both `up` and `down` migrations
- Test migrations on development before production
- Never modify committed migrations

## Security

- **RLS**: Enable Row Level Security on ALL tables.
- **Policies**: Write policies for SELECT, INSERT, UPDATE, DELETE explicitly.
- Use service role key for admin operations
- Anon key for client-side operations
- Never commit service role keys to git

## Edge Functions

- Develop in `supabase/functions`.
- Use `deno` for runtime.

## Development Workflow
1. Create new migration: `supabase migration new <name>`
2. Write SQL changes in the migration file
3. Test locally: `supabase db push`
4. Reset and test: `supabase db reset`
5. Apply to production when ready

## Environment Setup
- Development database: Local Supabase instance
- Production database: Managed Supabase project
- Use MCP Supabase tool for database operations
- Connection strings in environment variables

## Common Operations
```bash
# Apply migrations
supabase db push

# Reset database
supabase db reset

# Generate types
supabase gen types typescript --local > types.ts

# Open database UI
supabase db ui
```
