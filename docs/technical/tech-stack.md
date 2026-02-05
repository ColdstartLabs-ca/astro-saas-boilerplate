# Technology Stack

Complete technology stack for **AutopilotRank**.

## Stack Overview

```mermaid
graph TB
    subgraph "Frontend"
        NEXT[Next.js 14+]
        REACT[React 18]
        TS[TypeScript]
        TAILWIND[Tailwind CSS]
        SHADCN[ShadCN UI]
    end

    subgraph "Backend Services"
        NEXT_API[Next.js API]
        NODE[Node.js Workers]
        PYTHON[Python AI Service (Optional)]
    end

    subgraph "Data Persistence"
        SUPABASE[(Supabase PG)]
        REDIS[(Redis/Queue)]
        PINECONE[(Pinecone/Vector)]
    end

    subgraph "AI & External"
        OPENAI[OpenAI API]
        ANTHROPIC[Anthropic API]
        PERPLEXITY[Perplexity (Research)]
        DATA_SEO[DataForSEO/Serper]
    end

    NEXT --> NEXT_API
    NEXT_API --> SUPABASE
    NEXT_API --> REDIS

    NODE --> REDIS
    NODE --> OPENAI
    NODE --> ANTHROPIC
    NODE --> DATA_SEO
```

## Core Technologies

### Frontend

| Technology | Version | Purpose |
|Data Visualization|
| **Next.js** | 14+ (App Router) | Core Framework |
| **TypeScript** | 5.x | Type Safety |
| **Tailwind CSS** | 3.x | Styling |
| **ShadCN/UI** | Latest | UI Components |
| **TanStack Query** | v5 | State Management |
| **Recharts** | Latest | Analytics Charts |

### Backend & Infrastructure

| Technology          | Purpose                                     |
| ------------------- | ------------------------------------------- |
| **Supabase**        | Auth, Database (PostgreSQL), & Realtime     |
| **Vercel**          | Hosting & Deployments                       |
| **Redis (Upstash)** | Job Queues & Caching                        |
| **BullMQ**          | Handling background content generation jobs |

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

- **Pattern**: User initiates Job -> pushed to Redis Queue -> Worker processes it -> Updates DB -> Frontend polls/subscribes via Supabase Realtime.

### 3. Native CMS Integrations

- **Strategy**: Direct API integrations rather than copy-paste.
- **Auth**: OAuth where possible (WordPress, Shopify), API Keys for others.

## Environment Variables

```bash
# Core
NEXT_PUBLIC_APP_URL=https://app.autopilotrank.com

# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# SEO Data
DATA_FOR_SEO_LOGIN=
DATA_FOR_SEO_PASSWORD=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```
