# Capability Status Matrix

> **Source of Truth:** This matrix tracks the implementation status of all AutopilotRank features. When other documentation references feature status, it should link here.

## Status Legend

| Status | Description |
|--------|-------------|
| **Implemented** | Fully deployed and operational in production |
| **Beta** | Partially implemented, in testing, or limited availability |
| **Planned** | Roadmap item, not yet implemented |

## Core Platform

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **Authentication** | Implemented | Supabase Auth (Google, Azure, Email/Password) | [authentication.md](./systems/authentication.md) |
| **User Management** | Implemented | Profiles, roles, admin functions | `server/services/user.service.ts` |
| **Session Management** | Implemented | JWT-based, secure cookies | [auth-redirect-system.md](./systems/auth-redirect-system.md) |

## Billing & Credits

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **Stripe Integration** | Implemented | Subscriptions + one-time purchases | [billing.md](./systems/billing.md) |
| **Credit System** | Implemented | Subscription credits + purchased credits with rollover | [credits.md](./systems/credits.md) |
| **Pricing Tiers** | Implemented | Trial/Starter/Growth/Agency/Enterprise | `shared/config/subscription.config.ts` |
| **Usage Tracking** | Implemented | Per-article credit consumption | `server/services/credit-usage.service.ts` |
| **Revenue Streams** | Implemented | Canonical source: `docs/business/business-model-canvas/revenue-streams.md` | [revenue-streams.md](../business/business-model-canvas/revenue-streams.md) |

## Content Generation

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **Article Generation API** | Beta | Outline + article flow via `article-generation.service.ts` | `src/pages/api/articles/generate.ts` |
| **AI Model Integration** | Beta | OpenRouter integration, multiple models | `server/services/openrouter.service.ts` |
| **SEO Scoring** | Beta | Basic analysis implemented | `server/services/article-generation.service.ts` |
| **Humanizer Engine** | Planned | Multi-stage rewrite pipeline not yet deployed | [content-generation-engine.md](./systems/content-generation-engine.md) |
| **Image Generation** | Planned | DALL-E integration for article images | [revenue-streams.md](../business/business-model-canvas/revenue-streams.md) |
| **Pre-Publication QA** | Planned | Automated quality checks before publishing | [content-generation-engine.md](./systems/content-generation-engine.md) |

## Campaign & Project Management

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **Projects** | Implemented | Database table, CRUD operations | `20260205100000_create_projects_table.sql` |
| **Campaigns** | Implemented | Database table, job queuing | `20260205100100_create_campaigns_table.sql` |
| **Articles** | Implemented | Database table with generation tracking | `20260205100200_create_articles_table.sql` |
| **Keywords** | Implemented | Database table for campaign keywords | `20260205100300_create_keywords_table.sql` |
| **Quick Generate** | Implemented | Single article generation without full campaign | `src/pages/api/articles/generate.ts` |

## SEO Automation (Beta)

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **GSC Integration** | Beta | Data fetching implemented, autopilot mode planned | `server/services/gsc.service.ts` |
| **Keyword Research** | Planned | Competitor gap analysis, opportunity detection | [user-flow.md](./user-flow.md) |
| **Competitor Analysis** | Planned | URL-based gap analysis | [user-flow.md](./user-flow.md) |
| **Weekly Autopilot** | Planned | Scheduled GSC-driven content generation | [user-flow.md](./user-flow.md) |
| **Rank Tracking** | Planned | Position monitoring over time | [revenue-streams.md](../business/business-model-canvas/revenue-streams.md) |

## CMS Integration

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **WordPress Adapter** | Planned | Native WordPress autopublishing | [cms-integration.md](./systems/cms-integration.md) |
| **Shopify Adapter** | Planned | Shopify blog publishing | [cms-integration.md](./systems/cms-integration.md) |
| **Webflow Adapter** | Planned | Webflow CMS publishing | [cms-integration.md](./systems/cms-integration.md) |
| **Generic Webhook** | Planned | POST-based publishing to any endpoint | [cms-integration.md](./systems/cms-integration.md) |

## Analytics & Monitoring

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **Event Tracking** | Implemented | Amplitude integration | `server/analytics/amplitude.ts` |
| **Performance Monitoring** | Implemented | Baselime observability | [monitoring.md](./systems/monitoring.md) |
| **PMF Metrics** | Partial | Sean Ellis, retention tracking partially implemented | [analytics.md](./systems/analytics.md) |
| **Revenue KPIs** | Planned | LTV:CAC, NRR, trial-to-paid dashboards | [revenue-streams.md](../business/business-model-canvas/revenue-streams.md) |
| **SLO/SLI Tracking** | Planned | Error budgets, incident response | [monitoring.md](./systems/monitoring.md) |

## Infrastructure

| Capability | Status | Notes | Reference |
|------------|--------|-------|-----------|
| **Cloudflare Pages** | Implemented | Production deployment | [system-architecture.md](./system-architecture.md) |
| **Edge Functions** | Implemented | API routes via Astro SSR | [system-architecture.md](./system-architecture.md) |
| **Cron Jobs** | Implemented | Cloudflare Workers Cron | [system-architecture.md](./system-architecture.md) |
| **Rate Limiting** | Implemented | Per-user and public tier limits | `src/middleware.ts` |
| **Email System** | Implemented | Brevo primary, Resend fallback | [monitoring.md](./systems/monitoring.md) |

## Documentation Updates Required

This matrix replaces conflicting status statements in:

- ~~`system-architecture.md:5`~~ (said SEO "not implemented") → See SEO Automation section above
- ~~`user-flow.md:27`~~ (showed full campaign flows as current) → See Campaign section above
- ~~`systems/README.md:9`~~ (listed all systems as active) → Refer to individual statuses

## How to Update

When changing a capability's status:

1. Update the Status column
2. Add/update Notes explaining the change
3. Update the Reference if new docs are created
4. Consider updating dependent documentation that references this capability

---

**Last Updated:** 2026-02-05
**Maintained By:** Engineering team
**Source of Truth:** Business docs in `docs/business/` take precedence for pricing/goals, this doc tracks implementation status only.
