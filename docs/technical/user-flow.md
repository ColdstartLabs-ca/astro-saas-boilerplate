# User Flows

Detailed user journeys for **AutopilotRank**.

## 1. Onboarding & Setup

```mermaid
flowchart TD
    A[Sign Up] --> B{Select User Type}
    B -->|SMB Owner| C[Project Wizard]
    B -->|Agency| D[Agency Dashboard]

    C --> C1[Enter Website URL]
    C1 --> C2[Connect GSC (Optional)]

    C2 --> C3{GSC Connected?}
    C3 -->|Yes| C4[Auto-Analyze Opportunities]
    C3 -->|No| C5[Manual Keyword/Competitor Entry]

    C4 --> E[Configure Brand Voice]
    C5 --> E

    E --> F[Connect CMS (WordPress/etc)]
    F --> G[Onboarding Complete]
```

## 2. Campaign Creation (The Core Loop)

```mermaid
flowchart TD
    Start[Dashboard] --> NewCamp[New Campaign]

    NewCamp --> Source{Keyword Source}
    Source -->|GSC Opportunities| GCSList[Select from GSC Data]
    Source -->|Manual CSV| CSV[Upload CSV]
    Source -->|Competitor Gap| Gap[Enter Competitor URL]

    GCSList --> Config[Configure Content Settings]
    CSV --> Config
    Gap --> Config

    Config --> Params[Set Parameters]
    Params --> AI_Model[Select AI Model]
    Params --> Article_Len[Length: Short/Long]
    Params --> Images[AI Images / Stock]
    Params --> Links[Internal Linking]

    Params --> Preview[Review Campaign Config]
    Preview --> Launch[Start Generation]

    Launch --> Queue[Job Queued]
```

## 3. Content Review & Publishing

```mermaid
sequenceDiagram
    participant User
    participant Dashboard
    participant Editor
    participant CMS

    User->>Dashboard: View Campaign Status
    Dashboard-->>User: List of Generated Articles

    User->>Dashboard: Click "Review" on Article
    Dashboard->>Editor: Open Standard Editor

    User->>Editor: Read content, checking SEO score

    alt Needs Edits
        User->>Editor: Edit Text / Regenerate Section
        Editor-->>User: Updated Content
    else Looks Good
        User->>Editor: Click "Publish"
    end

    Editor->>CMS: Post to WordPress/Shopify
    CMS-->>Editor: Success (Live URL)
    Editor-->>User: "Published Successfully"
```

## 4. The "Autopilot" Mode (GSC Driven)

```mermaid
flowchart TD
    Timer[Weekly Scheduler] --> Check[Check GSC Data]
    Check --> Opps{New Opportunities?}

    Opps -->|Yes| Filter[Filter by Difficulty/Volume]
    Filter --> Gen[Generate Content Candidates]

    Gen --> Approval{Auto-Publish On?}

    Approval -->|Yes| Publish[Publish to CMS]
    Approval -->|No| Draft[Save as Draft & Notify User]

    Publish --> Report[Weekly Email Report]
    Draft --> Report
```

## 5. Subscription & Credits

```mermaid
flowchart TD
    User --> Credits{Check Credits}

    Credits -->|Enough| Allow[Action Allowed]
    Credits -->|Low| Warn[Low Balance Warning]
    Credits -->|Empty| Block[Action Blocked] --> Upgrade[Pricing Page]

    Upgrade --> Stripe[Stripe Checkout]
    Stripe --> Webhook[Webhook Handler]
    Webhook --> DB[Update Credit Balance]
```
