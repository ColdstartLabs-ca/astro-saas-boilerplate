# Database Schema

AutopilotRank uses PostgreSQL (Supabase) with strict RLS policies.

## Entity Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ PROJECTS : "owns"
    PROJECTS ||--o{ INTEGRATIONS : "has"
    PROJECTS ||--o{ CAMPAIGNS : "contains"
    CAMPAIGNS ||--o{ ARTICLES : "generates"
    PROJECTS ||--o{ KEYWORDS : "tracks"

    PROFILES {
        uuid id PK
        string email
        string stripe_customer_id
        int credits_balance
        string subscription_tier
    }

    PROJECTS {
        uuid id PK
        uuid user_id FK
        string domain
        string name
        jsonb brand_voice_settings
        boolean autopilot_enabled
    }

    INTEGRATIONS {
        uuid id PK
        uuid project_id FK
        enum type "wordpress, webflow, shopify, gsc"
        jsonb credentials "encrypted"
        boolean active
    }

    CAMPAIGNS {
        uuid id PK
        uuid project_id FK
        string name
        enum status "draft, running, completed"
        int total_keywords
        jsonb settings "model, length, tone"
    }

    ARTICLES {
        uuid id PK
        uuid campaign_id FK
        uuid project_id FK
        string target_keyword
        string title
        text content_html
        text content_markdown
        int seo_score
        enum status "queued, generating, review, published, failed"
        string cms_post_id
        string published_url
    }
```

## Tables

### profiles

Extends Supabase `auth.users`.

- `credits_balance`: Current available credits for content generation.
- `subscription_tier`: 'starter', 'growth', 'agency'.

### projects

Represents a website or client.

- `domain`: The target domain (e.g., `example.com`).
- `brand_voice_settings`: JSON blob containing tone, excluded words, persona details.
- `autopilot_enabled`: Boolean, if true, system auto-generates from GSC opportunities.

### integrations

Stores connection details for external services.

- `type`: 'wordpress', 'webflow', 'shopify', 'gsc'.
- `credentials`: **Encrypted** storage of API keys/Passwords. Use Postgres pgcrypto or application-level encryption.

### campaigns

A batch of content generation tasks.

- `settings`: specific generation parameters for this batch (e.g., "Use GPT-4, Aggressive SEO, Long-form").

### articles

The core content unit.

- `target_keyword`: Primary keyword.
- `content_html`: Final generic HTML.
- `seo_score`: Internal calculation (0-100).
- `status`: Lifecycle state.
- `cms_post_id`: ID returned from the CMS after publishing.

### credit_transactions

Ledger for credit usage.

- `amount`: Negative for usage, positive for purchase.
- `resource_id`: FK to `articles.id` (if usage) or `stripe_payment_id`.

## RLS Policies

All tables reference `user_id` (either directly or via `project_id`). Policies must ensure users can only access their own data.

```sql
-- Example for Projects
CREATE POLICY "Users can view own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

-- Example for Articles (via Project)
CREATE POLICY "Users can view own articles"
    ON articles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = articles.project_id
            AND projects.user_id = auth.uid()
        )
    );
```
