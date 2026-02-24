# IndexNow SEO Skill

Use this skill when you need to submit URLs to IndexNow for faster search engine indexing. IndexNow is a protocol that instantly notifies search engines about content changes.

## When to Use

- After publishing new blog posts or pages
- After making significant content updates
- When running bulk URL submission campaigns
- When setting up IndexNow for the first time
- When debugging IndexNow integration issues

## Overview

- **Library**: `lib/seo/indexnow.ts` - Core IndexNow functions
- **API Route**: `src/pages/api/seo/indexnow/index.ts` - Protected API endpoint
- **Scripts** (run from project root):
  - `.claude/skills/indexnow/scripts/submit-indexnow.ts` - CLI for single/batch/CSV submission
  - `.claude/skills/indexnow/scripts/create-keyfile.ts` - Generate key file

## Key Components

### Environment Configuration

Add to `.env.api`:

```bash
# Generate with: tsx scripts/create-indexnow-keyfile.ts --generate
INDEXNOW_KEY=your32characterkeyhere
```

### Library Functions

```typescript
import {
  submitUrl,
  submitBatch,
  submitFromCSV,
  getSubmissionStatus,
  generateIndexNowKey,
  validateIndexNowKey,
  getKeyFileContent,
} from '@lib/seo/indexnow';

// Submit single URL
const result = await submitUrl('https://autopilotrank.com/blog/new-post');

// Submit batch
const result = await submitBatch(
  ['https://autopilotrank.com/blog/post-1', 'https://autopilotrank.com/blog/post-2'],
  { batchSize: 100, delayMs: 1000 }
);

// Submit from CSV
const csvContent = await fs.readFile('./urls.csv', 'utf-8');
const result = await submitFromCSV(csvContent);

// Check status
const status = await getSubmissionStatus();

// Generate new key
const key = generateIndexNowKey(32);
```

### API Endpoint

Protected by `x-cron-secret` header (uses CRON_SECRET from env).

```bash
# GET - Check status
curl -H "x-cron-secret: $CRON_SECRET" \
  https://autopilotrank.com/api/seo/indexnow

# POST - Submit single URL
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://autopilotrank.com/blog/new-post"}' \
  https://autopilotrank.com/api/seo/indexnow

# POST - Submit batch
curl -X POST \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://autopilotrank.com/page1","https://autopilotrank.com/page2"]}' \
  https://autopilotrank.com/api/seo/indexnow
```

### CLI Scripts

Run from project root:

```bash
# Generate new key and see instructions
tsx .claude/skills/indexnow/scripts/create-keyfile.ts --generate

# Check configuration status
tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --status

# Submit single URL
tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --single https://autopilotrank.com/blog/post

# Submit from CSV
tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --csv ./urls.csv
```

## Setup Checklist

1. **Generate IndexNow Key**

   ```bash
   tsx .claude/skills/indexnow/scripts/create-keyfile.ts --generate
   ```

2. **Add to environment**

   ```bash
   # .env.api
   INDEXNOW_KEY=your32characterkeyhere
   ```

3. **Create verification file**

   ```bash
   tsx .claude/skills/indexnow/scripts/create-keyfile.ts $INDEXNOW_KEY
   ```

   This creates `public/{key}.txt` accessible at `https://autopilotrank.com/{key}.txt`

4. **Verify setup**

   ```bash
   tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --status
   ```

5. **Test submission**
   ```bash
   tsx .claude/skills/indexnow/scripts/submit-indexnow.ts --single https://autopilotrank.com/
   ```

## IndexNow Response Codes

| Status | Meaning                    |
| ------ | -------------------------- |
| 200    | URL submitted successfully |
| 202    | URL received (duplicate)   |
| 400    | Invalid format             |
| 403    | Key not valid              |
| 422    | URLs not from host         |
| 429    | Rate limited               |

## Key Files

- `lib/seo/indexnow.ts` - Core implementation
- `src/pages/api/seo/indexnow/index.ts` - API endpoint
- `scripts/submit-indexnow.ts` - CLI tool
- `scripts/create-indexnow-keyfile.ts` - Key file generator
- `shared/config/env.ts` - INDEXNOW_KEY definition
- `shared/config/security.ts` - /api/seo/* in PUBLIC_API_ROUTES
