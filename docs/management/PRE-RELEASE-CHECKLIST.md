# Pre-Release Checklist

> Last Updated: 2026-02-13
> Launch Target: Early March 2026

---

## 1. Domain & Cloudflare

> Everything starts here. No production URL = nothing else works.
> Full deployment guide: [`docs/guides/cloudflare-deployment.md`](../guides/cloudflare-deployment.md)

### Transfer DNS from Namecheap to Cloudflare

- [x] Create Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com/)
- [x] In Cloudflare: **Add a Site** > enter `autopilotrank.com` > select Free plan
- [x] Cloudflare will scan existing DNS records - review and confirm they're correct
- [x] Note the two Cloudflare nameservers assigned (e.g., `ada.ns.cloudflare.com`, `lee.ns.cloudflare.com`)
- [x] In Namecheap: go to **Domain List > autopilotrank.com > Nameservers**
- [x] Change from "Namecheap BasicDNS" to **"Custom DNS"**
- [x] Enter both Cloudflare nameservers and save
- [x] Wait for propagation (can take up to 48 hours, usually 1-2 hours)
- [x] Cloudflare Dashboard will show "Active" once nameservers are verified

### Cloudflare SSL & Security Settings

> ⚠️ API token needs `Zone:Settings:Edit` permission for these — do manually in dashboard or re-create token with that scope.

- [x] **SSL/TLS** > set encryption mode to **Full (strict)**
- [x] Enable **Always Use HTTPS**
- [x] Enable **Automatic HTTPS Rewrites**
- [x] Set **Minimum TLS Version** to 1.2
- [x] Verify SSL certificate is issued and active (green padlock on site)

### Cloudflare Email Routing

- [x] In Cloudflare Dashboard > **Email > Email Routing** > enable for `autopilotrank.com`
- [x] Add MX records (Cloudflare will prompt to add them automatically)
- [x] Create routing rule: `support@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [x] Create routing rule: `admin@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [x] Create routing rule: `privacy@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [x] Create routing rule: `legal@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [x] Create routing rule: `noreply@autopilotrank.com` -> `admin@coldstartlabs.ca` (or catch-all)
- [x] Verify destination email `admin@coldstartlabs.ca` (Cloudflare sends verification email)
- [x] Test: send email to `support@autopilotrank.com` and confirm delivery to `admin@coldstartlabs.ca`

### Cloudflare DNS Records

- [ ] `A` or `CNAME` record for `@` pointing to Pages project (auto-configured when adding custom domain)
- [x] `CNAME` record for `www` -> `autopilotrank.com` ✓ set via API
- [x] SPF record: `TXT @ "v=spf1 include:_spf.mx.cloudflare.net include:sendinblue.com ~all"` ✓ set via API
- [x] DKIM record: add TXT record from Brevo's domain authentication page (needs Brevo account)
- [x] DMARC record: `TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:admin@autopilotrank.com"` ✓ set via API
- [x] Old Namecheap MX records removed; Cloudflare Email Routing MX records added (route1/2/3.mx.cloudflare.net) ✓
- [x] Verify DNS propagation: `dig autopilotrank.com NS` shows Cloudflare nameservers
- [x] Verify email DNS: check SPF + DKIM + DMARC with [MXToolbox](https://mxtoolbox.com/) (after DKIM added)

### Pages Project (Deploy via Wrangler)

- [x] Cloudflare Pages project created
- [x] Login to Wrangler CLI: `npx wrangler login`
- [x] Add custom domain: Cloudflare Dashboard > **Pages > autopilotrank > Custom domains** > add `autopilotrank.com`
- [x] First deploy: `yarn deploy` (builds + deploys via Wrangler)
- [x] Verify deployment at `https://autopilotrank.com`

---

## 2. Google Cloud Project

> Single GCP project serves OAuth, Search Console API, and Secret Manager.

- [x] Create Google Cloud project (e.g., `autopilotrank`) at [console.cloud.google.com](https://console.cloud.google.com/)
- [x] Enable **Google Identity Services** API (for OAuth)
- [x] Enable **Search Console API** (for GSC integration)
- [x] Enable **Secret Manager API** (for production secrets)
- [x] Install `gcloud` CLI and authenticate: `gcloud auth login`

---

## 3. Google Secret Manager

> All production secrets live here. Set up the vault before populating it with service keys.

- [x] In GCP Console > **Secret Manager**: create secrets for each `.env.api` value (see Section 13 for full list)
- [x] Create a CI/CD service account in GCP > **IAM & Admin > Service Accounts**
- [x] Grant the service account `secretmanager.secretAccessor` role
- [x] Export service account key JSON (for GitHub Actions)
- [x] Verify secrets accessible: `gcloud secrets versions access latest --secret=STRIPE_SECRET_KEY`

---

## 4. Supabase (Database)

> Database is the foundation. Auth, billing, content - everything reads/writes here.

- [x] Project linked (`xuuwrabuavfplyyolngf`)
- [x] All migrations applied (76 migrations)
- [x] RLS policies enabled on core tables (projects, campaigns, articles, keywords, profiles, subscriptions, credit_transactions)
- [x] PostgreSQL v17 running
- [x] Review `dispute_events` table - RLS enabled via `20260205000000_enable_missing_rls.sql` (service-role-only policy; table is used by dispute webhook handler for audit trail)
- [ ] Confirm `provider_usage` table intentionally has no RLS (admin-only)
- [ ] Verify daily backups are enabled in Supabase Dashboard
- [ ] Test database restore procedure
- [ ] Verify all RPC functions work (`get_user_credits`, `deduct_credits`, `add_credits`, `create_articles_with_credits`, `clawback_credits`)

---

## 5. Authentication

> Depends on: domain (for origins), GCP project (for OAuth), Supabase (for auth backend).
> Full setup guide: [`docs/guides/google-oauth-setup.md`](../guides/google-oauth-setup.md)

### Google OAuth Consent Screen

- [x] In GCP project > **APIs & Services > OAuth consent screen**
- [x] Select **External** user type
- [x] Fill in app info: name=`AutopilotRank`, support email, authorized domains=`autopilotrank.com`, `supabase.co`
- [x] Add scopes: `openid`, `email`, `profile`
- [x] Add test users for pre-launch testing
- [x] **Before launch:** Click **"Publish App"** to move from Testing to Production mode

### Google OAuth Credentials

- [x] Create OAuth client ID (**APIs & Services > Credentials > Create > OAuth client ID**)
- [x] Application type: `Web application`
- [x] Add **Authorized JavaScript Origins**:
  - `http://localhost` (no port - required for GIS)
  - `http://localhost:4321` (dev server)
  - `https://autopilotrank.com`
  - `https://www.autopilotrank.com`
- [x] Add **Authorized Redirect URIs**:
  - `https://xuuwrabuavfplyyolngf.supabase.co/auth/v1/callback` (Supabase fallback flow)
- [x] Copy **Client ID** and **Client Secret**

### Supabase Google Provider

- [x] In Supabase Dashboard > **Authentication > Providers > Google**: toggle ON
- [x] Paste Client ID and Client Secret
- [x] Add Client ID to the **"Client IDs"** field (required for `signInWithIdToken`)
- [x] In **Authentication > URL Configuration**: set Site URL to `https://autopilotrank.com`
- [x] Add redirect URLs: `http://localhost:4321/**`, `https://autopilotrank.com/**`

### Supabase Email Templates

- [x] Native Supabase email/password auth configured
- [ ] Customize Supabase email templates (confirmation, password reset) with AutopilotRank branding
- [ ] Set email sender in Supabase Dashboard (SMTP or built-in)

### Azure OAuth (optional - disabled by default)

- [x] `PUBLIC_ENABLE_AZURE_OAUTH=false` (current default)

### Verify Auth

- [x] Test GIS popup flow on localhost
- [x] Test GIS popup flow on production domain
- [ ] Test fallback redirect flow works if GIS blocked
- [x] Test email/password signup + email verification

---

## 6. Email Providers

> Depends on: domain DNS (for SPF/DKIM records in Cloudflare), Cloudflare email routing already set up.

### Brevo (Primary)

- [x] Create Brevo account and get API key
- [x] Register and verify sender domain (`autopilotrank.com`) in Brevo
- [x] Copy SPF and DKIM values from Brevo into Cloudflare DNS (see Section 1)
- [x] Test email delivery to Gmail, Outlook, Yahoo

### Resend (Fallback)

- [ ] Create Resend account and get API key
- [ ] Verify domain in Resend

### Store Secrets

- [x] Add `BREVO_API_KEY` to Google Secret Manager
- [ ] Add `RESEND_API_KEY` to Google Secret Manager
- [x] Set `EMAIL_FROM_ADDRESS=noreply@autopilotrank.com`
- [x] Set `SUPPORT_EMAIL=support@autopilotrank.com`
- [x] Ensure `ALLOW_TRANSACTIONAL_EMAILS_IN_DEV=false` in production

---

## 7. AI Providers

> Independent accounts. Core product doesn't work without these.

### OpenRouter (Text Generation)

- [ ] Create OpenRouter account and get API key
- [ ] Add billing/credits to OpenRouter account (sufficient for launch traffic)
- [ ] Verify model access: `openai/gpt-4o`, `google/gemini-2.0-flash-exp:free`
- [ ] Confirm `AVAILABLE_WRITER_PRESETS` env is set (budget/balanced/pro/ultra models)
- [ ] Add `OPENROUTER_API_KEY` to Google Secret Manager

### Replicate (Image Generation)

- [ ] Create Replicate account and get API key
- [ ] Add billing to Replicate account
- [ ] Confirm `AVAILABLE_IMAGE_PRESETS` env is set (budget/balanced/pro/ultra models)
- [ ] Add `REPLICATE_API_KEY` to Google Secret Manager

### OpenAI (Embeddings)

- [ ] Get OpenAI API key
- [ ] Verify embeddings endpoint works
- [ ] Add `OPENAI_API_KEY` to Google Secret Manager

---

## 8. Stripe (Payments)

> Depends on: domain (for webhook URL), auth (users must exist), database (subscriptions table).
> Webhook endpoint needs the production URL to be live.

- [ ] Switch from TEST mode to LIVE mode in Stripe Dashboard
- [ ] Create live Stripe products: Starter ($49), Growth ($99), Agency ($249)
- [ ] Create live Stripe prices and update IDs in `shared/config/subscription.config.ts`
- [ ] Set credit pack prices (Small/Medium/Large) and create live price IDs
- [ ] Create production webhook endpoint pointing to `https://autopilotrank.com/api/webhooks/stripe`
- [ ] Enable events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
- [ ] Add `STRIPE_SECRET_KEY` (live) to Google Secret Manager
- [ ] Add `STRIPE_WEBHOOK_SECRET` (live) to Google Secret Manager
- [ ] Set `PUBLIC_STRIPE_PUBLISHABLE_KEY` to `pk_live_*`
- [ ] Test full payment flow: signup -> checkout -> subscription active -> dashboard
- [ ] Test credit pack purchase flow
- [ ] Test upgrade/downgrade between plans
- [ ] Test subscription cancellation
- [ ] Verify 3D Secure works on live mode

---

## 9. Monitoring & Analytics

> Set up before launch so you can observe from day one.

### Baselime (Error Tracking)

- [ ] Create Baselime account/project
- [ ] Set `PUBLIC_BASELIME_KEY` (client-side)
- [ ] Add `BASELIME_API_KEY` to Google Secret Manager
- [ ] Verify errors appear in Baselime dashboard
- [ ] Set up alert rules for critical errors (5xx spikes, auth failures)

### Amplitude (Event Analytics)

- [ ] Create Amplitude project
- [ ] Set `PUBLIC_AMPLITUDE_API_KEY` (client-side)
- [ ] Add `AMPLITUDE_API_KEY` to Google Secret Manager
- [ ] Verify events flowing (signup, generation, purchase)

### Google Analytics 4

- [ ] Create GA4 property for autopilotrank.com
- [ ] Set `PUBLIC_GA_MEASUREMENT_ID` (e.g., `G-XXXXXXXXXX`)
- [ ] Set up conversion goals: signup, subscription purchase, article generation
- [ ] Verify pageview tracking works

### Uptime Monitoring

- [ ] Set up external uptime monitor (e.g., UptimeRobot, Better Uptime)
- [ ] Monitor `GET https://autopilotrank.com/api/health`
- [ ] Configure alerts (email/Slack) for downtime

---

## 10. Google Search Console

> Depends on: GCP project (for OAuth credentials), domain verified.

- [ ] Add `https://autopilotrank.com/api/gsc/callback` as authorized redirect URI in GCP OAuth credentials
- [ ] Add `GOOGLE_OAUTH_CLIENT_SECRET` to Google Secret Manager
- [ ] Test OAuth flow: connect -> list sites -> fetch data

---

## 11. Security Review

> After all services are configured, do a final security pass.

- [x] JWT verification on all protected routes
- [x] IDOR prevention (ownership validation on projects, campaigns, integrations)
- [x] CMS credentials encrypted with AES-256-GCM
- [x] Rate limiting: public (10/5min per IP), user (50/5min per user)
- [x] Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- [x] CORS handling in middleware
- [ ] Update `ALLOWED_ORIGIN` from `*` to `https://autopilotrank.com`
- [x] Review CSP policy in `shared/config/security.ts` - rationale documented inline; `unsafe-inline` required by Astro islands; `unsafe-eval` candidates for removal post-launch testing
- [ ] Generate production `CMS_ENCRYPTION_KEY` (`openssl rand -base64 32`) and store in Secret Manager
- [ ] Generate production `CRON_SECRET` (`openssl rand -hex 32`) and store in Secret Manager
- [ ] Verify no test/development secrets in production env

---

## 12. SEO & Content

### Sitemaps

- [x] Sitemap generation configured (static, blog, pSEO)
- [ ] Verify all sitemaps generate correctly on production domain
- [ ] Submit sitemaps to Google Search Console

### Robots.txt

- [x] Configured: blocks /api/, /dashboard/, AI scrapers (GPTBot, ChatGPT-User)
- [ ] Verify robots.txt accessible at `https://autopilotrank.com/robots.txt`

### Meta Tags & Open Graph

- [x] Verify homepage meta title, description, og:image
- [x] Verify pricing page meta tags
- [ ] Test Open Graph preview (Facebook Sharing Debugger, Twitter Card Validator)
- [x] Verify canonical URLs on all pages

### Legal Pages

- [x] Update Privacy Policy with actual data retention details - rewritten with 8 providers, 90-day retention, AES-256-GCM credential note (en + pt-BR)
- [x] Update Terms of Service with product-specific terms - all 15 sections, AI content ownership, Ontario governing law, credit refund policy (en + pt-BR)
- [x] Update `PUBLIC_LAST_UPDATED_DATE` on legal pages - set to `February 2026` in `.env.client`
- [ ] Verify cookie consent if applicable

---

## 13. Environment Variables (Full Checklist)

> Final sweep. Every secret should already be in Google Secret Manager from earlier sections.
> Every public var should be in Cloudflare Pages env vars.

### `.env.client` (Public - Cloudflare Pages env vars)

- [ ] `PUBLIC_SUPABASE_URL` - production Supabase URL
- [ ] `PUBLIC_SUPABASE_ANON_KEY` - production anon key
- [ ] `PUBLIC_APP_NAME=AutopilotRank`
- [ ] `PUBLIC_BASE_URL=https://autopilotrank.com`
- [ ] `PUBLIC_PRIMARY_DOMAIN=autopilotrank.com`
- [ ] `PUBLIC_APP_DOMAIN=autopilotrank.com`
- [ ] `PUBLIC_STRIPE_PUBLISHABLE_KEY` - **live** key (not test)
- [ ] `PUBLIC_GOOGLE_CLIENT_ID` - production OAuth app
- [ ] `PUBLIC_BASELIME_KEY`
- [ ] `PUBLIC_AMPLITUDE_API_KEY`
- [ ] `PUBLIC_GA_MEASUREMENT_ID`
- [ ] `PUBLIC_ADMIN_EMAIL=admin@autopilotrank.com`
- [ ] `PUBLIC_SUPPORT_EMAIL=support@autopilotrank.com`
- [ ] `PUBLIC_PRIVACY_EMAIL=privacy@autopilotrank.com`
- [ ] `ALLOWED_ORIGIN=https://autopilotrank.com`

### `.env.api` (Secrets - Google Secret Manager)

- [ ] `ENV=production`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY` - **live** key
- [ ] `STRIPE_WEBHOOK_SECRET` - **live** webhook
- [ ] `BREVO_API_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM_ADDRESS=noreply@autopilotrank.com`
- [ ] `OPENROUTER_API_KEY`
- [ ] `REPLICATE_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `CMS_ENCRYPTION_KEY` - AES-256-GCM key (base64, 32+ chars)
- [ ] `GOOGLE_OAUTH_CLIENT_SECRET`
- [ ] `CRON_SECRET` - secure random string
- [ ] `BASELIME_API_KEY`
- [ ] `AMPLITUDE_API_KEY`

### GitHub Actions Secrets

- [ ] `CLOUDFLARE_API_TOKEN` - create in Cloudflare Dashboard > **My Profile > API Tokens**
- [ ] `CLOUDFLARE_ACCOUNT_ID` - from Cloudflare Dashboard overview page
- [ ] GCP service account key JSON (for pulling secrets from Google Secret Manager during CI/CD)
- [ ] Verify deployment pipeline pulls secrets and injects into Cloudflare env vars

---

## 14. Milestone 7 - Remaining Dev Work

### Emails

- [x] Welcome email template (quick start guide) - template + `/api/auth/welcome` endpoint wired to email confirm & OAuth callback
- [x] Article generation complete notification - `emailService.sendArticleCompleteNotification()` called in `article-generation.service.ts`
- [x] Low credits alert (80% threshold) - `emailService.sendLowCreditAlert()` called in `articles/generate.ts` at 20% remaining threshold

### Onboarding

- [x] In-app onboarding flow: connect CMS -> enter keywords -> generate first article - full wizard implemented in `client/components/onboarding/`

### Landing Page & Content

- [x] Final landing page polish (competitor comparison, testimonials) - `ComparisonSection.tsx` updated with Outrank/Jasper/SurferSEO; `SocialProofSection.tsx` has 4 named "Beta Tester" testimonials
- [x] Features page with product screenshots/GIFs - `FeaturesPageClient.tsx` fully rebuilt with 7 feature sections and screenshot placeholder slots
- [x] Write 2-3 launch blog posts - added `wordpress-seo-automation-2026.mdx` and `seo-content-at-scale-agency-guide.mdx` (10 total posts)
- [x] Update help/FAQ for product features - humanizer FAQ added; CMS and AI model answers updated

---

## 15. Testing

> After all services configured and dev work complete.

### Automated Tests

- [x] 2,731 unit tests passing (0 failures as of 2026-02-18)
- [x] Run `yarn verify` - passes clean (tsc + lint + i18n) ✓ 2026-02-18
- [x] Run `yarn test:unit` - all pass ✓ 2026-02-18
- [ ] Run `yarn test:e2e` - all pass against production-like env

### Critical User Flows (Manual Testing)

- [ ] Signup with email/password -> verify email -> access dashboard
- [ ] Signup with Google OAuth -> access dashboard
- [ ] Free tier: generate 3 trial articles -> upgrade prompt shown
- [ ] Starter checkout: select plan -> Stripe checkout -> subscription active
- [ ] Create project -> create campaign -> add keywords -> generate articles
- [ ] Article review: approve -> publish to WordPress
- [ ] Campaign scheduling: set schedule -> verify cron triggers generation
- [ ] Credit purchase: buy credit pack -> credits appear in balance
- [ ] Settings: connect WordPress integration -> test connection -> succeeds

### Edge Cases

- [ ] Generation failure -> credits refunded automatically
- [ ] Insufficient credits -> generation blocked, auto-pause schedule
- [ ] Invalid CMS credentials -> graceful error shown
- [ ] Concurrent generation requests handled correctly
- [ ] Rate limiting triggers correctly (public + authenticated)

---

## 16. CI/CD Pipeline & Cron Worker

### GitHub Actions

- [x] Deploy pipeline configured (`.github/workflows/deploy.yml`)
- [x] Pipeline: tsc -> eslint -> unit tests -> build -> deploy -> health check
- [ ] Verify pipeline runs successfully against `main` branch
- [ ] Ensure all GitHub Actions secrets/variables set for production environment
- [ ] Test health check step works against production URL
- [ ] Confirm rollback procedure: Cloudflare Pages deployment history allows instant rollback

### Cron Worker (Separate from Pages)

- [ ] Create separate Cloudflare Worker for cron jobs
- [ ] Configure cron trigger: `*/5 * * * *` (every 5 minutes)
- [ ] Worker calls `POST /api/cron/generate-scheduled-articles` with `X-Cron-Secret` header
- [ ] Set `CRON_SECRET` env var (matching between Worker and Pages)
- [ ] Test cron execution with a scheduled campaign

---

## 17. Pre-Launch (Final 48 Hours)

- [ ] Merge `feature/integrations` branch to `main`
- [ ] All env vars locked in production (Cloudflare + Google Secret Manager)
- [ ] Dependencies frozen (`yarn.lock` committed)
- [ ] Run full test suite one final time: `yarn verify` + `yarn test:unit`
- [ ] Deploy to production via Wrangler: `yarn deploy`
- [ ] Verify `https://autopilotrank.com` loads correctly
- [ ] Verify `https://autopilotrank.com/api/health` returns healthy
- [ ] Stripe webhook test event delivered successfully
- [ ] Send test email via Brevo
- [ ] Generate one test article via production
- [ ] Confirm monitoring dashboards receiving data (Baselime, Amplitude, GA4)

---

## 18. Launch Day

- [ ] Announce on social media
- [ ] Post to Reddit (r/SEO, r/content_marketing, r/Entrepreneur)
- [ ] Post to Indie Hackers
- [ ] Prepare Product Hunt listing (if applicable)
- [ ] Monitor error rates for first 24 hours (target: <0.1%)
- [ ] Monitor Stripe webhook delivery (no failures)
- [ ] Monitor email delivery (no bounces)
- [ ] Watch for CSP violations in browser console
- [ ] Check API latency (p99 < 1000ms)

---

## 19. Known Issues & Workarounds

| Issue                                     | Status         | Notes                                               |
| ----------------------------------------- | -------------- | --------------------------------------------------- |
| Stripe schedule race condition on upgrade | Fixed (Feb 9)  | Release schedule before upgrade                     |
| Double credit granting on renewal         | Fixed (Feb 9)  | Removed direct reset from schedule handler          |
| Multi-instance rate limiting              | In-memory only | Upgrade to Cloudflare KV if scaling past 1 instance |
| Cron via Cloudflare Pages                 | Not supported  | Must deploy separate Worker (see Section 16)        |
| Azure OAuth                               | Not tested     | Disabled by default, defer to post-launch           |
| Webflow adapter                           | Framework only | Implementation deferred                             |
