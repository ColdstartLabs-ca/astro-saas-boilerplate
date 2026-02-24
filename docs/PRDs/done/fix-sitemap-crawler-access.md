# PRD: Fix Sitemap Discovery & Crawler Access Issues

**Complexity: 1 → LOW mode**

---

## 1. Context

**Problem:** Google Search Console reports 0 URLs discovered from the sitemap, and Ahrefs receives a 403 when crawling autopilotrank.com.

**Files Analyzed:**

- `src/pages/sitemap.xml.ts` — sitemap index
- `src/pages/sitemap-geo.xml.ts` — geo sitemap (exists but not referenced)
- `src/pages/robots.txt.ts` — robots directives
- `src/middleware.ts` — no bot-blocking code found

**Current Behavior:**

- `sitemap.xml` references 6 sitemaps but omits `sitemap-geo.xml`
- `robots.txt` Sitemap directives also missing `sitemap-geo.xml`
- `sitemap-geo.xml.ts` is a fully-functioning route already deployed — just undiscoverable
- No User-Agent or bot-blocking logic in middleware; 403 for Ahrefs is external (Cloudflare dashboard)

---

## 2. Solution

**Approach:**

- Add `/sitemap-geo.xml` to the `sitemaps` array in `sitemap.xml.ts`
- Add a `Sitemap:` directive for `sitemap-geo.xml` in `robots.txt.ts`
- Document Cloudflare dashboard steps to diagnose the Ahrefs 403 (manual, out of code scope)

**Data Changes:** None

---

## Integration Points

- Entry point: HTTP GET `/sitemap.xml` and `/sitemap-geo.xml` (existing Astro routes)
- Crawlers (Googlebot, Ahrefs) follow `robots.txt` → `sitemap.xml` → child sitemaps
- No new code paths; purely additive string changes to existing route handlers

---

## 4. Execution Phases

### Phase 1: Register geo sitemap in index and robots.txt

**Files:**

- `src/pages/sitemap.xml.ts` — add `'/sitemap-geo.xml'` to the sitemaps array
- `src/pages/robots.txt.ts` — add `Sitemap: ${BASE_URL}/sitemap-geo.xml` directive

**Implementation:**

- [ ] In `sitemap.xml.ts`, add `'/sitemap-geo.xml'` as the last entry in the `sitemaps` array (line 20, after `'/sitemap-use-cases.xml'`)
- [ ] In `robots.txt.ts`, add `Sitemap: ${BASE_URL}/sitemap-geo.xml` after the existing `sitemap-tools.xml` line (line 43)

**Exact diffs:**

`src/pages/sitemap.xml.ts`:

```ts
// Before
const sitemaps = [
  '/sitemap-static.xml',
  '/sitemap-blog.xml',
  '/sitemap-tools.xml',
  '/sitemap-comparisons.xml',
  '/sitemap-alternatives.xml',
  '/sitemap-use-cases.xml',
];

// After
const sitemaps = [
  '/sitemap-static.xml',
  '/sitemap-blog.xml',
  '/sitemap-tools.xml',
  '/sitemap-comparisons.xml',
  '/sitemap-alternatives.xml',
  '/sitemap-use-cases.xml',
  '/sitemap-geo.xml',
];
```

`src/pages/robots.txt.ts`:

```ts
// Before (line 43)
Sitemap: ${BASE_URL}/sitemap-tools.xml

# Host

// After
Sitemap: ${BASE_URL}/sitemap-tools.xml
Sitemap: ${BASE_URL}/sitemap-geo.xml

# Host
```

**Tests Required:**

| Test File                             | Test Name                                         | Assertion                                  |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| `src/__tests__/sitemap.spec.ts` (new) | `should include sitemap-geo.xml in sitemap index` | Response body contains `sitemap-geo.xml`   |
| `src/__tests__/sitemap.spec.ts`       | `should reference sitemap-geo.xml in robots.txt`  | robots.txt body contains `sitemap-geo.xml` |

**Verification Plan:**

```bash
# Start dev server, then:
curl -s http://localhost:4321/sitemap.xml | grep sitemap-geo
# Expected: <loc>https://autopilotrank.com/sitemap-geo.xml</loc>

curl -s http://localhost:4321/robots.txt | grep sitemap-geo
# Expected: Sitemap: http://localhost:4321/sitemap-geo.xml

curl -s http://localhost:4321/sitemap-geo.xml | head -5
# Expected: valid XML with <urlset ...>
```

**Automated Checkpoint:** Run `prd-work-reviewer` after implementation.

---

### Phase 2: Cloudflare Dashboard — Diagnose Ahrefs 403 (Manual)

> **No code changes.** This phase is a manual checklist for the Cloudflare dashboard.

**Steps:**

- [ ] Log into Cloudflare dashboard → select `autopilotrank.com`
- [ ] Go to **Security → Bots** — check if Bot Fight Mode or Super Bot Fight Mode is ON; if so, verify Ahrefs is in the allowed verified bots list
- [ ] Go to **Security → WAF → Custom Rules** — check for any rules that match Ahrefs User-Agent (`AhrefsBot`) or Ahrefs IP ranges and return a Block/Challenge action; disable or add exception
- [ ] Go to **Security → WAF → Rate Limiting Rules** — check if any rule rate-limits crawlers aggressively (e.g., < 10 req/min from a single IP)
- [ ] Go to **Security → Events** — filter by "Block" action and check if Ahrefs IPs appear; use the event detail to identify the triggering rule
- [ ] If Bot Fight Mode is blocking Ahrefs: add `AhrefsBot` to the **verified bots** exceptions list (Security → Bots → Configure)
- [ ] After changes, retest: ask Ahrefs to re-crawl via their dashboard, or use `curl -A "AhrefsBot/7.0" https://autopilotrank.com/` from a remote server

**After fixing:**

- [ ] In Google Search Console: go to **Sitemaps** → remove and re-add `https://autopilotrank.com/sitemap.xml` to force re-fetch
- [ ] Wait 24–48 hours for GSC to process

---

## 5. Acceptance Criteria

- [ ] Phase 1 complete: `sitemap.xml` and `robots.txt` both reference `sitemap-geo.xml`
- [ ] `yarn verify` passes
- [ ] `curl /sitemap.xml | grep sitemap-geo` returns a match
- [ ] `curl /sitemap-geo.xml` returns valid XML with geo page URLs
- [ ] Phase 2 complete: Ahrefs no longer gets 403 (verified via Ahrefs Site Audit or `curl -A "AhrefsBot"`)
- [ ] GSC sitemap resubmitted and showing > 0 URLs within 48h
