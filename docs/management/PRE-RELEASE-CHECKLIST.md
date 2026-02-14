# Pre-Release Checklist

> Last Updated: 2026-02-13
> Launch Target: Early March 2026

---

## 1. Domain & Cloudflare

> Everything starts here. No production URL = nothing else works.
> Full deployment guide: [`docs/guides/cloudflare-deployment.md`](../guides/cloudflare-deployment.md)

### Transfer DNS from Namecheap to Cloudflare
- [ ] Create Cloudflare account at [dash.cloudflare.com](https://dash.cloudflare.com/)
- [ ] In Cloudflare: **Add a Site** > enter `autopilotrank.com` > select Free plan
- [ ] Cloudflare will scan existing DNS records - review and confirm they're correct
- [ ] Note the two Cloudflare nameservers assigned (e.g., `ada.ns.cloudflare.com`, `lee.ns.cloudflare.com`)
- [ ] In Namecheap: go to **Domain List > autopilotrank.com > Nameservers**
- [ ] Change from "Namecheap BasicDNS" to **"Custom DNS"**
- [ ] Enter both Cloudflare nameservers and save
- [ ] Wait for propagation (can take up to 48 hours, usually 1-2 hours)
- [ ] Cloudflare Dashboard will show "Active" once nameservers are verified

### Cloudflare SSL & Security Settings
- [ ] **SSL/TLS** > set encryption mode to **Full (strict)**
- [ ] Enable **Always Use HTTPS**
- [ ] Enable **Automatic HTTPS Rewrites**
- [ ] Set **Minimum TLS Version** to 1.2
- [ ] Verify SSL certificate is issued and active (green padlock on site)

### Cloudflare Email Routing
- [ ] In Cloudflare Dashboard > **Email > Email Routing** > enable for `autopilotrank.com`
- [ ] Add MX records (Cloudflare will prompt to add them automatically)
- [ ] Create routing rule: `support@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [ ] Create routing rule: `admin@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [ ] Create routing rule: `privacy@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [ ] Create routing rule: `legal@autopilotrank.com` -> `admin@coldstartlabs.ca`
- [ ] Create routing rule: `noreply@autopilotrank.com` -> `admin@coldstartlabs.ca` (or catch-all)
- [ ] Verify destination email `admin@coldstartlabs.ca` (Cloudflare sends verification email)
- [ ] Test: send email to `support@autopilotrank.com` and confirm delivery to `admin@coldstartlabs.ca`

### Cloudflare DNS Records
- [ ] `A` or `CNAME` record for `@` pointing to Pages project (auto-configured when adding custom domain)
- [ ] `CNAME` record for `www` -> `autopilotrank.com` (or use Page Rule to redirect)
- [ ] SPF record: `TXT @ "v=spf1 include:sendinblue.com ~all"` (for Brevo email)
- [ ] DKIM record: add TXT record from Brevo's domain authentication page
- [ ] DMARC record: `TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:admin@autopilotrank.com"`
- [ ] Verify DNS propagation: `dig autopilotrank.com NS` shows Cloudflare nameservers
- [ ] Verify email DNS: check SPF + DKIM + DMARC with [MXToolbox](https://mxtoolbox.com/)

### Pages Project (Deploy via Wrangler)
- [x] Cloudflare Pages project created
- [ ] Login to Wrangler CLI: `npx wrangler login`
- [ ] Add custom domain: Cloudflare Dashboard > **Pages > autopilotrank > Custom domains** > add `autopilotrank.com`
- [ ] First deploy: `yarn deploy` (builds + deploys via Wrangler)
- [ ] Verify deployment at `https://autopilotrank.com`

---

## 2. Google Cloud Project

> Single GCP project serves OAuth, Search Console API, and Secret Manager.

- [ ] Create Google Cloud project (e.g., `autopilotrank`) at [console.cloud.google.com](https://console.cloud.google.com/)
- [ ] Enable **Google Identity Services** API (for OAuth)
- [ ] Enable **Search Console API** (for GSC integration)
- [ ] Enable **Secret Manager API** (for production secrets)
- [ ] Install `gcloud` CLI and authenticate: `gcloud auth login`

---

## 3. Google Secret Manager

> All production secrets live here. Set up the vault before populating it with service keys.

- [ ] In GCP Console > **Secret Manager**: create secrets for each `.env.api` value (see Section 13 for full list)
- [ ] Create a CI/CD service account in GCP > **IAM & Admin > Service Accounts**
- [ ] Grant the service account `secretmanager.secretAccessor` role
- [ ] Export service account key JSON (for GitHub Actions)
- [ ] Verify secrets accessible: `gcloud secrets versions access latest --secret=STRIPE_SECRET_KEY`

---

## 4. Supabase (Database)

> Database is the foundation. Auth, billing, content - everything reads/writes here.

- [x] Project linked (`xuuwrabuavfplyyolngf`)
- [x] All migrations applied (76 migrations)
- [x] RLS policies enabled on core tables (projects, campaigns, articles, keywords, profiles, subscriptions, credit_transactions)
- [x] PostgreSQL v17 running
- [ ] Review `dispute_events` table - enable RLS or drop if unused
- [ ] Confirm `provider_usage` table intentionally has no RLS (admin-only)
- [ ] Verify daily backups are enabled in Supabase Dashboard
- [ ] Test database restore procedure
- [ ] Verify all RPC functions work (`get_user_credits`, `deduct_credits`, `add_credits`, `create_articles_with_credits`, `clawback_credits`)

---

## 5. Authentication

> Depends on: domain (for origins), GCP project (for OAuth), Supabase (for auth backend).
> Full setup guide: [`docs/guides/google-oauth-setup.md`](../guides/google-oauth-setup.md)

### Google OAuth Consent Screen
- [ ] In GCP project > **APIs & Services > OAuth consent screen**
- [ ] Select **External** user type
- [ ] Fill in app info: name=`AutopilotRank`, support email, authorized domains=`autopilotrank.com`, `supabase.co`
- [ ] Add scopes: `openid`, `email`, `profile`
- [ ] Add test users for pre-launch testing
- [ ] **Before launch:** Click **"Publish App"** to move from Testing to Production mode

### Google OAuth Credentials
- [ ] Create OAuth client ID (**APIs & Services > Credentials > Create > OAuth client ID**)
- [ ] Application type: `Web application`
- [ ] Add **Authorized JavaScript Origins**:
  - `http://localhost` (no port - required for GIS)
  - `http://localhost:4321` (dev server)
  - `https://autopilotrank.com`
  - `https://www.autopilotrank.com`
- [ ] Add **Authorized Redirect URIs**:
  - `https://xuuwrabuavfplyyolngf.supabase.co/auth/v1/callback` (Supabase fallback flow)
- [ ] Copy **Client ID** and **Client Secret**

### Supabase Google Provider
- [ ] In Supabase Dashboard > **Authentication > Providers > Google**: toggle ON
- [ ] Paste Client ID and Client Secret
- [ ] Add Client ID to the **"Client IDs"** field (required for `signInWithIdToken`)
- [ ] In **Authentication > URL Configuration**: set Site URL to `https://autopilotrank.com`
- [ ] Add redirect URLs: `http://localhost:4321/**`, `https://autopilotrank.com/**`

### Supabase Email Templates
- [x] Native Supabase email/password auth configured
- [ ] Customize Supabase email templates (confirmation, password reset) with AutopilotRank branding
- [ ] Set email sender in Supabase Dashboard (SMTP or built-in)

### Azure OAuth (optional - disabled by default)
- [x] `PUBLIC_ENABLE_AZURE_OAUTH=false` (current default)

### Verify Auth
- [ ] Test GIS popup flow on localhost
- [ ] Test GIS popup flow on production domain
- [ ] Test fallback redirect flow works if GIS blocked
- [ ] Test email/password signup + email verification

---

## 6. Email Providers

> Depends on: domain DNS (for SPF/DKIM records in Cloudflare), Cloudflare email routing already set up.

### Brevo (Primary)
- [ ] Create Brevo account and get API key
- [ ] Register and verify sender domain (`autopilotrank.com`) in Brevo
- [ ] Copy SPF and DKIM values from Brevo into Cloudflare DNS (see Section 1)
- [ ] Test email delivery to Gmail, Outlook, Yahoo

### Resend (Fallback)
- [ ] Create Resend account and get API key
- [ ] Verify domain in Resend

### Store Secrets
- [ ] Add `BREVO_API_KEY` to Google Secret Manager
- [ ] Add `RESEND_API_KEY` to Google Secret Manager
- [ ] Set `EMAIL_FROM_ADDRESS=noreply@autopilotrank.com`
- [ ] Set `SUPPORT_EMAIL=support@autopilotrank.com`
- [ ] Ensure `ALLOW_TRANSACTIONAL_EMAILS_IN_DEV=false` in production

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
- [ ] Review CSP policy in `shared/config/security.ts` - tighten if possible
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
- [ ] Verify homepage meta title, description, og:image
- [ ] Verify pricing page meta tags
- [ ] Test Open Graph preview (Facebook Sharing Debugger, Twitter Card Validator)
- [ ] Verify canonical URLs on all pages

### Legal Pages
- [ ] Update Privacy Policy with actual data retention details
- [ ] Update Terms of Service with product-specific terms
- [ ] Update `PUBLIC_LAST_UPDATED_DATE` on legal pages
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
- [ ] Welcome email template (quick start guide)
- [ ] Article generation complete notification
- [ ] Low credits alert (80% threshold)

### Onboarding
- [ ] In-app onboarding flow: connect CMS -> enter keywords -> generate first article

### Landing Page & Content
- [ ] Final landing page polish (competitor comparison, testimonials)
- [ ] Features page with product screenshots/GIFs
- [ ] Write 2-3 launch blog posts
- [ ] Update help/FAQ for product features

---

## 15. Testing

> After all services configured and dev work complete.

### Automated Tests
- [x] 616+ unit tests passing
- [x] 82 scheduling unit tests passing
- [ ] Run `yarn verify` - passes clean (tsc + lint + i18n)
- [ ] Run `yarn test:unit` - all pass
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

| Issue | Status | Notes |
|-------|--------|-------|
| Stripe schedule race condition on upgrade | Fixed (Feb 9) | Release schedule before upgrade |
| Double credit granting on renewal | Fixed (Feb 9) | Removed direct reset from schedule handler |
| Multi-instance rate limiting | In-memory only | Upgrade to Cloudflare KV if scaling past 1 instance |
| Cron via Cloudflare Pages | Not supported | Must deploy separate Worker (see Section 16) |
| Azure OAuth | Not tested | Disabled by default, defer to post-launch |
| Webflow adapter | Framework only | Implementation deferred |
