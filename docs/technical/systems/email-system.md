# Email System

## Overview

Transactional and marketing email system with multi-provider failover. Uses Brevo (primary, 300/day) and Resend (fallback, 3,000/month) with React Email templates.

## Architecture

```
EmailService -> EmailProviderManager -> Provider Adapters (Brevo/Resend) -> Email APIs
                                                |
                                     BaseEmailProviderAdapter
                                                |
                         Template rendering, preference checking, logging
```

### Provider Priority

| Provider | Priority | Free Tier              | Usage                                                          |
| -------- | -------- | ---------------------- | -------------------------------------------------------------- |
| Brevo    | 1        | 300/day (~9,000/month) | Primary - direct REST API for Cloudflare Workers compatibility |
| Resend   | 2        | 3,000/month            | Fallback when Brevo unavailable or over limit                  |

## Core Components

### EmailService (`server/services/email.service.ts`)

Singleton service that delegates to the provider manager.

```typescript
import { getEmailService } from '@server/services/email.service';

const emailService = getEmailService();
await emailService.send({
  to: 'user@example.com',
  template: 'welcome',
  data: { userName: 'John' },
  type: 'transactional',
  userId: 'user-123',
});
```

### EmailProviderManager (`server/services/email-providers/email-provider-manager.ts`)

Manages provider selection and automatic fallback.

- Tries providers by priority order
- Skips unavailable providers (over limit, disabled)
- Falls back to next available provider on failure
- Tracks usage via `provider_credit_tracker.service.ts`

### BaseEmailProviderAdapter (`server/services/email-providers/base-email-provider-adapter.ts`)

Abstract base class handling:

- Template loading and rendering (`@react-email/render`)
- Marketing email preference checking (`email_preferences` table)
- Development/test mode (logs instead of sending)
- Email logging to `email_logs` table
- Common props injection (`baseUrl`, `supportEmail`, `appName`)

### Provider Adapters

- `brevo.provider-adapter.ts` - Direct REST API calls (not SDK) for Cloudflare Workers compatibility
- `resend.provider-adapter.ts` - Resend SDK

## Email Types

| Type            | Behavior                             |
| --------------- | ------------------------------------ |
| `transactional` | Always sent, no preference check     |
| `marketing`     | Checks `marketing_emails` preference |

## Templates

Located in `emails/templates/` using `@react-email/components`:

| Template              | Subject                               | Props                                                                 | API accessible     |
| --------------------- | ------------------------------------- | --------------------------------------------------------------------- | ------------------ |
| `welcome`             | Welcome to {appName}!                 | `userName`, `verifyUrl` (optional — shows dashboard CTA when omitted) | ✅                 |
| `payment-success`     | Payment confirmed - {amount}          | `userName`, `amount`, `planName`, `credits`, `receiptUrl`             | ✅                 |
| `subscription-update` | Your subscription has been updated    | `userName`, `planName`, `status`, `action`, `manageUrl`               | ✅                 |
| `low-credits`         | Running low on credits                | `userName`, `creditsRemaining`, `upgradeUrl`                          | ✅                 |
| `password-reset`      | Reset your password                   | `userName`, `resetUrl`                                                | ✅                 |
| `article-complete`    | Your article is ready: {articleTitle} | `userName`, `articleTitle`, `keyword`, `campaignName`, `articleId`    | ✅                 |
| `support-request`     | [Support] [{category}] {subject}      | `name`, `email`, `category`, `subject`, `message`                     | ❌ (internal only) |

> **Note:** `support-request` is not in the `sendEmailSchema` enum — it is only used internally via `EmailService.send()` directly (e.g., from the support contact form), not through the admin `/api/email/send` endpoint.

### Common Props (Auto-Injected)

All templates receive:

- `baseUrl` - from `serverEnv.BASE_URL`
- `supportEmail` - from `serverEnv.SUPPORT_EMAIL`
- `appName` - from `serverEnv.APP_NAME`

## Development/Test Mode

When `isDevelopment()` or `isTest()` is true (and `ALLOW_TRANSACTIONAL_EMAILS_IN_DEV` is false):

1. Logs complete payload with `[EMAIL_DEV_MODE]` or `[EMAIL_TEST_MODE]` prefix
2. Records in `email_logs` with `{ dev_mode: true }` or `{ skipped: 'test environment' }`
3. Returns `messageId: 'dev-{timestamp}'`

## Database Schema

### email_preferences

| Column             | Type        | Default | Description              |
| ------------------ | ----------- | ------- | ------------------------ |
| `user_id`          | UUID (PK)   | -       | References `profiles.id` |
| `marketing_emails` | BOOLEAN     | TRUE    | Marketing email opt-in   |
| `created_at`       | TIMESTAMPTZ | NOW()   | Record creation time     |
| `updated_at`       | TIMESTAMPTZ | NOW()   | Last update time         |

### email_logs

| Column              | Type        | Default           | Description                    |
| ------------------- | ----------- | ----------------- | ------------------------------ |
| `id`                | UUID (PK)   | gen_random_uuid() | Log entry ID                   |
| `user_id`           | UUID        | NULL              | References `profiles.id`       |
| `email_type`        | TEXT        | -                 | 'transactional' or 'marketing' |
| `template_name`     | TEXT        | -                 | Template identifier used       |
| `recipient_email`   | TEXT        | -                 | Destination email address      |
| `status`            | TEXT        | -                 | 'sent', 'failed', or 'skipped' |
| `provider_response` | JSONB       | NULL              | Provider API response          |
| `sent_at`           | TIMESTAMPTZ | NOW()             | Timestamp of attempt           |

## Marketing Preference Check Flow

1. If `userId` provided: query `email_preferences.marketing_emails`
2. If only `email` provided: lookup `profiles.id`, then check preferences
3. If no user found: allow email (new/non-registered recipient)
4. Fail-open on DB errors: allow email, log error

## Error Handling

| Code                 | Description                |
| -------------------- | -------------------------- |
| `TEMPLATE_NOT_FOUND` | Invalid template name      |
| `SEND_FAILED`        | Email send threw exception |
| `EMAIL_ERROR`        | Generic email error        |

## Environment Variables

| Variable                            | Required | Default          |
| ----------------------------------- | -------- | ---------------- | ------------------------------- |
| `BREVO_API_KEY`                     | Yes      | -                |
| `RESEND_API_KEY`                    | Yes      | -                |
| `EMAIL_FROM_ADDRESS`                | No       | (from serverEnv) |
| `SUPPORT_EMAIL`                     | No       | (from serverEnv) |
| `BASE_URL`                          | No       | (from serverEnv) |
| `APP_NAME`                          | No       | (from serverEnv) |
| `ALLOW_TRANSACTIONAL_EMAILS_IN_DEV` | No       | false            | Send real emails in development |

## Usage Example

```typescript
import { getEmailService } from '@server/services/email.service';

const emailService = getEmailService();

// Transactional (always sent)
await emailService.send({
  to: 'user@example.com',
  template: 'payment-success',
  data: {
    userName: 'Jane',
    amount: '$29.99',
    planName: 'Pro',
  },
  userId: 'user-123',
  type: 'transactional',
});

// Marketing (checks preferences)
await emailService.send({
  to: 'user@example.com',
  template: 'low-credits',
  data: { creditsRemaining: 5 },
  userId: 'user-123',
  type: 'marketing',
});
```

## Related Files

- `/home/joao/projects/autopilotrank.com/server/services/email.service.ts`
- `/home/joao/projects/autopilotrank.com/server/services/email-providers/email-provider-manager.ts`
- `/home/joao/projects/autopilotrank.com/server/services/email-providers/base-email-provider-adapter.ts`
- `/home/joao/projects/autopilotrank.com/server/services/email-providers/brevo.provider-adapter.ts`
- `/home/joao/projects/autopilotrank.com/server/services/email-providers/resend.provider-adapter.ts`
- `/home/joao/projects/autopilotrank.com/shared/types/provider-adapter.types.ts`
