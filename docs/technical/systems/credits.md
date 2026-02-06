# Credit System

Credit-based usage tracking for content generation.

## Overview

AutopilotRank uses a simple credit system. 1 Credit is generally equal to 1 Article.

> **Canonical Pricing:** For subscription tiers, credit allocation, and pricing details, see [Revenue Streams](../../business/business-model-canvas/revenue-streams.md).

```mermaid
graph TD
    subgraph "Credit Sources"
        SIGNUP[Free Signup: 3 credits]
        SUB[Subscription: Monthly]
        BONUS[Refill Packs]
    end

    subgraph "Credit Pool"
        BALANCE[(credits_balance)]
    end

    subgraph "Credit Usage"
        GENERATE[Content Generation]
    end

    SIGNUP --> BALANCE
    SUB --> BALANCE
    BONUS --> BALANCE

    BALANCE --> GENERATE
```

## Credit Costs

| Action                                 | Cost                 |
| -------------------------------------- | -------------------- |
| **Standard Article** (1000-1500 words) | 1 Credit             |
| **Long-Form Guide** (2500+ words)      | 2 Credits            |
| **Bulk Batch** (10 Articles)           | 10 Credits           |
| **Keyword Research**                   | 0 Credits (Included) |
| **Publishing**                         | 0 Credits (Included) |

## Credit Allocation by Tier

| Tier        | Monthly Articles | Rollover Cap | Notes                      |
| ----------- | ---------------- | ------------ | --------------------------- |
| **Trial**   | 3 (one-time)     | 3            | No monthly refresh          |
| **Starter** | 30               | 90           | 3x rollover                 |
| **Growth**  | 100              | 300          | 3x rollover                 |
| **Agency**  | 500              | 0            | No rollover - use or lose   |

## Deduction Flow

Atomic deduction ensures no race conditions during bulk generation.

```sql
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
) RETURNS void AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Lock row
  SELECT credits_balance INTO current_balance
  FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient credits';
  END IF;

  UPDATE profiles
  SET credits_balance = credits_balance - p_amount
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'usage', p_description);
END;
$$ LANGUAGE plpgsql;
```
