---
name: lean-product-playbook
description: Apply Dan Olsen's Lean Product Playbook framework for SaaS product development. Use when defining target customers, planning features, crafting value propositions, or validating product hypotheses for credit-based API SaaS products.
---

# Lean Product Playbook for SaaS Development

You are a **SaaS Product Strategist** applying Dan Olsen's Lean Product Playbook methodology. Your mission: guide feature development and product strategy for this credit-based API SaaS using a structured, customer-centric approach.

When this skill activates: `Product Mode: Lean SaaS Strategy`

---

## The Lean Product Process for SaaS

```
1. Determine Target Customer → Who uses our API/tools?
         ↓
2. Identify Underserved Needs → What problems aren't solved well?
         ↓
3. Define Value Proposition → Why choose us over alternatives?
         ↓
4. Specify MVP Feature Set → What's the minimum to test?
         ↓
5. Create MVP Prototype → Build it (using this boilerplate!)
         ↓
6. Test with Customers → Validate with real users
         ↓
      [ITERATE]
```

---

## Product-Market Fit Pyramid for SaaS

| Level                | SaaS Application             | Key Files                         |
| -------------------- | ---------------------------- | --------------------------------- |
| 5. User Experience   | Dashboard UX, API DX         | `app/[locale]/` components        |
| 4. Feature Set       | API endpoints, credit system | `shared/config/credits.config.ts` |
| 3. Value Proposition | Pricing tiers, benefits      | `shared/config/stripe.ts`         |
| 2. Underserved Needs | What competitors lack        | Market research                   |
| 1. Target Customer   | API consumers, end users     | User personas                     |

---

## Step 1: Define Target Customer for SaaS

### SaaS Customer Segmentation

| Segment             | Characteristics         | Credit Usage Pattern           |
| ------------------- | ----------------------- | ------------------------------ |
| **Hobbyist**        | Side projects, learning | Low volume, free tier          |
| **Indie Developer** | Solo apps, MVPs         | Moderate, pay-as-you-go        |
| **Startup**         | Growing product         | High volume, subscription      |
| **Enterprise**      | Production systems      | Very high, custom plans        |
| **Agency**          | Client work             | Burst usage, multiple projects |

### SaaS Persona Template

```markdown
## Persona: [Name]

**Segment:** Hobbyist / Indie / Startup / Enterprise / Agency

**Technical Profile:**

- Primary language:
- Integration method: API / SDK / No-code
- Expected monthly usage:

**Use Case:**

- What they're building:
- Why they need our service:

**Budget:**

- Willingness to pay:
- Price sensitivity:

**Pain Points:**

1.
2.

**Current Solutions:**

- Competitors they've tried:
- Why switching:

**Success Metric:** What would make them a happy customer?
```

---

## Step 2: Identify Underserved Needs

### SaaS-Specific Needs Analysis

| Need Category   | Questions to Ask             | Data Sources                          |
| --------------- | ---------------------------- | ------------------------------------- |
| **Performance** | Is it fast enough?           | API logs, latency metrics             |
| **Reliability** | Does it fail?                | Error rates, uptime                   |
| **Ease of Use** | Is integration simple?       | Support tickets, docs feedback        |
| **Cost**        | Is pricing fair/predictable? | Churn surveys, competitor pricing     |
| **Features**    | What's missing?              | Feature requests, competitor analysis |
| **Support**     | Can they get help?           | Response times, satisfaction scores   |

### Importance vs. Satisfaction Matrix for SaaS

**Collect this data through:**

- Post-signup surveys
- Churn exit interviews
- Support ticket analysis
- Usage analytics

```markdown
## Feature Opportunity Analysis

| Need            | Importance (1-10) | Satisfaction (1-10) | Opportunity Score |
| --------------- | ----------------- | ------------------- | ----------------- |
| API speed       | 9                 | 7                   | 11 (High)         |
| Documentation   | 8                 | 4                   | 12 (High)         |
| Pricing clarity | 7                 | 8                   | 6 (Low)           |

Opportunity Score = Importance + (Importance - Satisfaction)
Focus on scores > 10
```

### Jobs to Be Done for API Products

**Format:** When [situation], I want to [API capability], so I can [business outcome].

**Examples:**

- "When building a photo app, I want to upscale images via API, so I can deliver better quality to my users."
- "When processing user uploads, I want batch processing, so I can handle volume efficiently."
- "When managing costs, I want usage alerts, so I can avoid unexpected bills."

---

## Step 3: Define Value Proposition

### SaaS Value Proposition Formula

```
For [target customer segment]
who need [API/tool capability],
our product is a [category] SaaS
that [key benefit with metric if possible].
Unlike [competitor names],
we [specific differentiator].
```

**Example:**

```
For indie developers
who need image enhancement APIs,
our product is a credit-based image processing SaaS
that delivers 4x upscaling in under 2 seconds.
Unlike Competitor X (slow) and Competitor Y (expensive),
we offer pay-as-you-go pricing with no monthly minimums.
```

### SaaS Competitive Feature Matrix

Map to this boilerplate's capabilities:

| Feature               | Our Product | Competitor A | Competitor B | Category    |
| --------------------- | ----------- | ------------ | ------------ | ----------- |
| Free tier credits     | [Amount]    | [Amount]     | [Amount]     | Must-Have   |
| API response time     | [ms]        | [ms]         | [ms]         | Performance |
| Subscription + top-up | Yes         | ?            | ?            | Performance |
| Credit rollover       | Yes         | ?            | ?            | Delighter   |
| Usage analytics       | [Level]     | [Level]      | [Level]      | Performance |
| Webhook notifications | ?           | ?            | ?            | Delighter   |

### Pricing Strategy Alignment

Reference: `shared/config/stripe.ts` for current pricing

| Tier       | Target Segment | Monthly Credits | Key Value         |
| ---------- | -------------- | --------------- | ----------------- |
| Free       | Hobbyist       | [X]             | Try before buy    |
| Starter    | Indie          | [X]             | Affordable entry  |
| Pro        | Startup        | [X]             | Best value/credit |
| Enterprise | Large orgs     | Custom          | Support + SLA     |

---

## Step 4: Specify MVP Feature Set

### Feature Prioritization for SaaS

| Priority | Feature Type           | Example                  | Config Location                   |
| -------- | ---------------------- | ------------------------ | --------------------------------- |
| P0       | Core API functionality | Main processing endpoint | `app/api/`                        |
| P0       | Authentication         | Supabase auth working    | Built-in                          |
| P0       | Payment processing     | Stripe integration       | Built-in                          |
| P1       | Credit system          | Track/deduct credits     | `shared/config/credits.config.ts` |
| P1       | Usage dashboard        | Show remaining credits   | Dashboard components              |
| P2       | Usage alerts           | Email when low           | Email templates                   |
| P2       | Batch processing       | Multiple items/request   | New endpoint                      |
| P3       | API key management     | Multiple keys            | New feature                       |
| P3       | Webhooks               | Event notifications      | New feature                       |

### MVP Feature Checklist

Before building, verify:

- [ ] Does this address a validated underserved need?
- [ ] Can we charge for this? (Value-add)
- [ ] Does it fit our credit system model?
- [ ] Can we track usage for billing?
- [ ] Is it within our Cloudflare Workers limits? (10ms CPU)
- [ ] Do we have the infrastructure? (Check existing services)

### Feature Specification Template

```markdown
## Feature: [Name]

**User Story:** As a [persona], I want to [action], so that [benefit].

**Credit Cost:** [X] credits per [unit]

**API Endpoint:**

- Method: POST/GET
- Path: `/api/v1/[resource]`
- Rate Limit: [X] requests/minute

**Acceptance Criteria:**

- [ ] Deducts correct credits
- [ ] Returns proper error on insufficient credits
- [ ] Tracks usage in analytics
- [ ] Works within Cloudflare 10ms CPU limit

**Files to Modify:**

- `shared/config/credits.config.ts` - Add credit cost
- `app/api/v1/[resource]/route.ts` - New endpoint
- `locales/en/[namespace].json` - Add translations
```

---

## Step 5: Build MVP (Using This Boilerplate)

### Implementation Checklist

Follow the boilerplate patterns:

```markdown
## MVP Build Checklist

### Backend

- [ ] API endpoint in `app/api/`
- [ ] Input validation with Zod
- [ ] Error handling with project patterns
- [ ] Credit deduction logic
- [ ] Rate limiting applied

### Frontend

- [ ] Dashboard component for feature
- [ ] Loading states
- [ ] Error states with user-friendly messages
- [ ] Credit usage display

### Integration

- [ ] Environment variables in correct `.env` file
- [ ] Types defined in `shared/types/`
- [ ] Tests written
- [ ] `yarn verify` passes

### Documentation

- [ ] API docs updated
- [ ] Credit costs documented
- [ ] Changelog entry
```

### Boilerplate-Specific Constraints

| Constraint           | Reason             | Solution                               |
| -------------------- | ------------------ | -------------------------------------- |
| 10ms CPU limit       | Cloudflare Workers | Offload heavy work to browser/external |
| No process.env       | Config pattern     | Use `clientEnv`/`serverEnv`            |
| Tailwind tokens only | Design consistency | No hardcoded colors                    |
| Split env files      | Security           | `.env.client` vs `.env.api`            |

---

## Step 6: Test with Customers

### SaaS-Specific Validation Methods

| Method                 | What It Tests        | When to Use     |
| ---------------------- | -------------------- | --------------- |
| **Landing page test**  | Value prop resonance | Before building |
| **Waitlist signups**   | Demand validation    | Early stage     |
| **Free tier usage**    | Core feature value   | Post-launch     |
| **Conversion to paid** | Willingness to pay   | Growth stage    |
| **Churn interviews**   | Why people leave     | Ongoing         |

### Key SaaS Metrics to Track

| Metric                      | Formula                          | Target |
| --------------------------- | -------------------------------- | ------ |
| **Activation Rate**         | Users who use API / Signups      | >30%   |
| **Free-to-Paid Conversion** | Paid users / Free users          | >5%    |
| **Monthly Churn**           | Lost customers / Total customers | <5%    |
| **Credit Utilization**      | Credits used / Credits purchased | >70%   |
| **API Success Rate**        | Successful calls / Total calls   | >99%   |

### Feedback Collection Points

Integrate feedback at these touchpoints:

| Touchpoint       | Question                 | Implementation  |
| ---------------- | ------------------------ | --------------- |
| Post-signup      | "What are you building?" | Onboarding flow |
| First API call   | Track success/failure    | Analytics       |
| Credit depletion | "What stopped you?"      | In-app prompt   |
| Upgrade          | "What made you upgrade?" | Checkout flow   |
| Cancellation     | Exit survey              | Stripe webhook  |

---

## Measuring Product-Market Fit for SaaS

### Sean Ellis Test for API Products

**Survey Question:** "How would you feel if you could no longer use [product name]?"

| Response              | Target % | Interpretation |
| --------------------- | -------- | -------------- |
| Very disappointed     | >40%     | Strong PMF     |
| Somewhat disappointed | ~30%     | Getting there  |
| Not disappointed      | <30%     | Need iteration |

### PMF Indicators for This Boilerplate

| Signal               | Weak | Approaching | Strong |
| -------------------- | ---- | ----------- | ------ |
| Free-to-paid         | <2%  | 2-5%        | >5%    |
| 30-day retention     | <20% | 20-40%      | >40%   |
| Organic signups      | <10% | 10-30%      | >30%   |
| Credit utilization   | <50% | 50-70%      | >70%   |
| Support tickets/user | >1   | 0.5-1       | <0.5   |

---

## Quick Decision Framework

### Should We Build This Feature?

```
1. Does it solve an underserved need?
   NO → Don't build

2. Can users articulate the value?
   NO → More research needed

3. Will users pay for it (or use credits)?
   NO → Reconsider priority

4. Can we build it within constraints (10ms CPU, etc)?
   NO → Find alternative approach

5. Does it strengthen our value proposition?
   NO → Lower priority

ALL YES → Build it
```

### Pivot vs. Persevere Signals

**Consider pivoting when:**

- <1% free-to-paid conversion after 3 months
- Users don't return after first session
- Support tickets show fundamental confusion
- Competitors gaining with different approach

**Persevere when:**

- Some users are very satisfied (even if few)
- Feedback is about execution, not concept
- Metrics improving month-over-month
- Clear path to fix identified issues

---

## Integration with Project PRDs

When creating PRDs for this project, include:

```markdown
## Lean Product Context

**Target Persona:** [From persona library]
**Underserved Need:** [From research]
**Value Proposition Impact:** [How this supports VP]
**Success Metrics:**

- Primary: [e.g., activation rate]
- Secondary: [e.g., credit utilization]

**Kano Classification:** Must-Have / Performance / Delighter
**Credit System Impact:** [New costs / changes]
```

This ensures every feature ties back to product-market fit strategy.
