# Documentation Directory

## Overview

All project documentation including guides, technical specs, PRDs, and management documents.

### Critical

- Feel free to use mermaid diagrams in markdown for visual explanations
- Keep documentation up-to-date with code changes
- **No auto-generated .md files** unless explicitly requested.

## Key Paths

- PRDs: `docs/PRDs/` → move to `done/` when complete
- Roadmap: `docs/management/ROADMAP.md`
- Env: `.env.client` (public) | `.env.api` (secrets)

## Stack

Astro 5 (SSR + Islands), React 18, React Hook Form, Zod, Zustand, Supabase, Stripe, Cloudflare Pages, Baselime

## Structure

### Guides (`docs/guides/`)

- Setup and installation guides
- Development workflow documentation
- Deployment instructions
- Feature usage guides

### Technical (`docs/technical/`)

- API reference documentation
- Database schema documentation
- System architecture overview
- Tech stack specifications
- User flow diagrams

### Management (`docs/management/`)

- Product roadmap
- Development milestones
- Team processes
- Release notes

### PRDs (`docs/PRDs/`)

- Product Requirements Documents
- Feature specifications
- User stories and acceptance criteria
- Technical requirements

### Authentication (`docs/authentication/`)

- Auth flow documentation
- Security best practices
- User management guides

### Research (`docs/research/`)

- Technical research findings
- Competitive analysis
- Technology evaluations
- Proof of concept results

## Documentation Standards

- Use Markdown format with clear headings
- Include code examples and screenshots where helpful
- Keep documentation up-to-date with code changes
- Use consistent terminology and formatting
- Include table of contents for longer documents

## Key Files

- `api-reference.md` - Complete API documentation
- `database-schema.md` - Database structure and relationships
- `system-architecture.md` - High-level system overview
- `tech-stack.md` - Technology stack details
- `user-flow.md` - User journey documentation

## Maintenance

- Review and update documentation monthly
- Update docs when implementing new features
- Include documentation in code review process
- Use `docs/management/ROADMAP.md` for tracking changes
