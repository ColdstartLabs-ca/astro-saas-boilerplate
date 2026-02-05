# Technology Stack

Complete technology stack for **AutopilotRank**.

## Stack Overview

```mermaid
graph TB
    subgraph "Frontend"
        ASTRO[Astro 5]
        REACT[React 18 Islands]
        TS[TypeScript]
        TAILWIND[Tailwind CSS]
        SHADCN[ShadCN UI]
    end

    subgraph "Backend Services"
        ASTRO_API[Astro SSR API Routes]
        CF_WORKERS[Cloudflare Workers Cron]
    end

    subgraph "Data Persistence"
        SUPABASE[(Supabase PG)]
    end

    subgraph "AI & External"
        OPENAI[OpenAI API]
        ANTHROPIC[Anthropic API]
        PERPLEXITY[Perplexity (Research)]
        DATA_SEO[DataForSEO/Serper]
    end

    ASTRO --> ASTRO_API
    ASTRO_API --> SUPABASE

    CF_WORKERS --> ASTRO_API
    ASTRO_API --> OPENAI
    ASTRO_API --> ANTHROPIC
    ASTRO_API --> DATA_SEO
```

## Core Technologies

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Astro** | 5.x | Core Framework (SSR + Islands) |
| **React** | 18.x | Interactive UI Components (Islands) |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 3.x | Styling |
| **ShadCN/UI** | Latest | UI Components |
| **TanStack Query** | v5 | State Management |
| **Recharts** | Latest | Analytics Charts |

### Backend & Infrastructure

| Technology               | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| **Supabase**             | Auth, Database (PostgreSQL), & Realtime         |
| **Cloudflare Pages**     | Hosting & Deployments (Astro SSR)               |
| **Cloudflare Workers**   | Cron Jobs (webhook recovery, expiration checks) |

### AI & Agents

| Provider              | Models              | Usage                                         |
| --------------------- | ------------------- | --------------------------------------------- |
| **OpenAI**            | GPT-4o, GPT-4-turbo | Complex reasoning, outlines, SEO optimization |
| **Anthropic**         | Claude 3.5 Sonnet   | Long-form writing, human-like nuance          |
| **Google**            | Gemini 1.5 Pro      | Fact-checking, large context analysis         |
| **Llama**             | Llama 3             | Fast drafting, lower cost tasks               |
| **Perplexity/Serper** | -                   | Real-time web research & fact gathering       |

### Data & SEO Power

| Service                       | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| **Google Search Console API** | Performance data, keyword opportunities            |
| **DataForSEO / Ahrefs API**   | SERP analysis, keyword difficulty, competitor data |
| **BrightData**                | Proxies for SERP scraping (if needed)              |

## Key Architecture Decisions

### 1. Multi-Model AI Pipeline

Instead of relying on a single model, we use a "Chain of Thought" approach:

- **Research**: Perplexity/Search APIs to gather facts.
- **Drafting**: Claude 3.5 Sonnet for natural flow.
- **Optimization**: GPT-4 for strict SEO rule adherence.
- **Humanizer**: Specialized fine-tuned models to reduce AI footprint.

### 2. Async Job Processing

Content generation is time-consuming (research -> write -> optimize). We cannot use simple Request/Response.

- **Pattern**: User initiates Job -> stored in DB with "queued" status -> Cloudflare Workers cron picks up jobs -> Processes via AI pipeline -> Updates DB -> Frontend polls/subscribes via Supabase Realtime.

### 3. Native CMS Integrations

- **Strategy**: Direct API integrations rather than copy-paste.
- **Auth**: OAuth where possible (WordPress, Shopify), API Keys for others.

## Environment Variables

**Important**: Never use `process.env` directly. Use `clientEnv` or `serverEnv` from `@shared/config/env`.

- **Client vars** (`.env.client`): Prefixed with `PUBLIC_*`, accessed via `import.meta.env`
- **Server vars** (`.env.api`): Validated with Zod schema, accessed via `serverEnv`

```bash
# .env.client (public, client-safe)
PUBLIC_APP_URL=https://app.autopilotrank.com
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_STRIPE_PUBLISHABLE_KEY=

# .env.api (secrets, server-only)
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DATA_FOR_SEO_LOGIN=
DATA_FOR_SEO_PASSWORD=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```
