# System Architecture

High-level architecture for **AutopilotRank**, an autonomous SEO content automation platform.

## Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App (Next.js)]
        PLUGIN[WordPress Plugin]
        API_CLIENT[External API Clients]
    end

    subgraph "Edge & Routing"
        CDN[Cloudflare CDN]
        WAF[Cloudflare WAF]
    end

    subgraph "Application Layer"
        API[Next.js API Routes]
        QUEUE[Job Queue (BullMQ/Inngest)]
        WORKERS[Background Workers]
    end

    subgraph "Service Layer"
        AUTH[Supabase Auth]
        DB[(PostgreSQL)]
        VECTOR[(Vector DB)]
        CACHE[Redis]
    end

    subgraph "AI & Data Engine"
        ORCHESTRATOR[Agent Orchestrator]
        LLMS[LLM Gateway (GPT-4/Claude/Gemini)]
        SERP[SERP Data Provider]
        GSC[GSC Integration Service]
    end

    WEB --> CDN
    PLUGIN --> CDN
    CDN --> API

    API --> AUTH
    API --> QUEUE
    API --> DB

    QUEUE --> WORKERS
    WORKERS --> ORCHESTRATOR

    ORCHESTRATOR --> LLMS
    ORCHESTRATOR --> SERP
    ORCHESTRATOR --> GSC
    ORCHESTRATOR --> VECTOR
```

## Content Generation Pipeline

The core engine of AutopilotRank uses a multi-agent system to generate high-quality SEO content.

```mermaid
sequenceDiagram
    participant Queue
    participant Researcher as Research Agent
    participant Writer as Writer Agent
    participant SEO as SEO Optimizer
    participant Humanizer as Humanizer Engine
    participant QA as QA System
    participant CMS as CMS Integration

    Queue->>Researcher: Start Job (Keyword)
    Researcher->>Researcher: Analyze SERP Intent
    Researcher->>Researcher: Extract Competitor Headings
    Researcher-->>Writer: Content Brief & Outline

    Writer->>Writer: Draft Content (Multi-Model)
    Writer-->>SEO: Initial Draft

    SEO->>SEO: Inject NLP Keywords
    SEO->>SEO: Optimize Structure
    SEO-->>Humanizer: Optimized Draft

    Humanizer->>Humanizer: Apply Human-like Phrasing
    Humanizer->>Humanizer: Anti-AI Detection Pass
    Humanizer-->>QA: Final Draft

    QA->>QA: Plagiarism Check
    QA->>QA: Fact Check (Basic)
    QA->>QA: AI Detection Score

    alt Passes QA
        QA-->>CMS: Publish/Draft
    else Fails QA
        QA-->>Writer: Regenerate/Refine
    end
```

## Component Architecture

```mermaid
graph LR
    subgraph "Dashboard Components"
        PROJECTS[Project Manager]
        KW_RESEARCH[Keyword Researcher]
        EDITOR[Content Editor]
        SETTINGS[Integration Settings]
    end

    subgraph "Core Services"
        GSC_SYNC[GSC Data Sync]
        KEYWORD_CLUSTERING[Keyword Clustering]
        CONTENT_GEN[Content Generator]
        CMS_Connector[CMS Connectors]
    end

    subgraph "External Integrations"
        WP[WordPress]
        WEBFLOW[Webflow]
        SHOPIFY[Shopify]
        GHOST[Ghost]
    end

    PROJECTS --> GSC_SYNC
    KW_RESEARCH --> KEYWORD_CLUSTERING
    KEYWORD_CLUSTERING --> CONTENT_GEN
    CONTENT_GEN --> CMS_Connector

    CMS_Connector --> WP
    CMS_Connector --> WEBFLOW
    CMS_Connector --> SHOPIFY
    CMS_Connector --> GHOST
```

## Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Input"
        USER[User Input]
        GSC[GSC Data]
        CSV[CSV Upload]
    end

    subgraph "Processing"
        QUEUE[Job Queue]
        AGENTS[AI Agents]
        DB[(Database)]
    end

    subgraph "Output"
        HTML[HTML Content]
        META[Meta Data]
        SCHEMA[Schema Markup]
        IMAGES[AI Images]
    end

    USER --> QUEUE
    GSC --> QUEUE
    CSV --> QUEUE

    QUEUE --> AGENTS
    AGENTS --> DB

    AGENTS --> HTML
    AGENTS --> META
    AGENTS --> SCHEMA
    AGENTS --> IMAGES
```

## Infrastructure & Scaling

- **Compute**: Serverless/Edge functions for API, specific long-running containers for AI processing agents.
- **Database**: PostgreSQL (Supabase) for relational data, Vector DB for semantic search/context.
- **Queues**: Redis-backed queues (BullMQ) to handle massive bulk generation jobs without timeouts.
- **Storage**: Object storage (R2/S3) for generated images and backups.

## Security Architecture

- **Authentication**: Usage of Supabase Auth (JWT).
- **API Security**: Rate limiting, API Key management for external access.
- **Data Privacy**: User credentials (CMS passwords/keys) encrypted at rest.
- **Isolation**: Tenant isolation via RLS (Row Level Security).
