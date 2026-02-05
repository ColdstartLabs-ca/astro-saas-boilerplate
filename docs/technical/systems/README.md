# Systems Documentation

Detailed documentation for **AutopilotRank**'s subsystems.

## Overview

```mermaid
graph TB
    subgraph "Core Engines"
        GEN[Content Generation Engine]
        CMS[CMS Integrations]
        GSC[GSC Intelligence]
    end

    subgraph "Platform Services"
        AUTH[Authentication]
        BILLING[Billing & Credits]
        ANALYTICS[Analytics]
    end

    AUTH --> GEN
    BILLING --> GEN
    GEN --> CMS
    GSC --> GEN
    CMS --> ANALYTICS
```

## System Documents

| Document                                                       | Description                                             |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| [content-generation-engine.md](./content-generation-engine.md) | The AI pipeline (Research -> Draft -> SEO -> Humanize). |
| [cms-integration.md](./cms-integration.md)                     | Adapters for WordPress, Webflow, Shopify, etc.          |
| [authentication.md](./authentication.md)                       | Supabase auth, user sessions.                           |
| [billing.md](./billing.md)                                     | Stripe integration, credit consumption logic.           |
| [credits.md](./credits.md)                                     | Credit balance management and transactional history.    |
| [monitoring.md](./monitoring.md)                               | Observability for the agent pipeline.                   |

## Deprecated/Removed

- `image-processing.md` (Replaced by Content Generation Engine)
