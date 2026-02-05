# Cloudflare Pages Deployment Guide

This guide details how to deploy the AutopilotRank application to Cloudflare Pages using the Astro Cloudflare adapter.

## Prerequisites

1.  **Cloudflare Account**: You need an active account.
2.  **Wrangler CLI**: Installed via `npm install -g wrangler` (or used via `npx`).
3.  **Project Setup**: Ensure you have run `yarn install` and the project is configured.

---

## 1. Local Build & Preview

Before deploying, verify the build locally to ensure the Cloudflare adapter works correctly.

### Step 1: Build

Run the build script to generate the worker and static assets.

```bash
yarn build
```

_Success_: This should create a `dist/` directory with the server and client output.

### Step 2: Preview

Run the local Cloudflare emulation.

```bash
yarn preview
```

_Success_: The app should be accessible at `http://localhost:8788` (or similar).
_Verify_: Visit `http://localhost:8788/api/health` to check the API status.

---

## 2. Deployment Methods

### Option A: Direct Deploy via Wrangler (Fastest for Dev)

Use Wrangler to deploy directly from your machine.

1.  **Login** (if not already logged in):

    ```bash
    npx wrangler login
    ```

2.  **Deploy**:

    ```bash
    yarn deploy
    ```

    _Note_: This runs the deploy script which builds and deploys to Cloudflare.

3.  **Verify**: Wrangler will output a URL (e.g., `https://autopilotrank.pages.dev`).

### Option B: Git Integration (Recommended for Production)

Connect your GitHub repository to Cloudflare Pages for automatic deployments.

1.  **Push Code**: Ensure your changes are pushed to GitHub.
2.  **Cloudflare Dashboard**:
    - Go to **Workers & Pages** > **Create Application** > **Pages** > **Connect to Git**.
    - Select the `autopilotrank.com` repository.
3.  **Build Settings**:
    - **Framework Preset**: None
    - **Build Command**: `yarn build`
    - **Build Output Directory**: `dist/client`
    - **Root Directory**: `/`
    - **Node.js Compatibility**: Enable compatibility flags in **Settings** > **Functions**.

---

## 3. Production Environment Variables

You must configure the following environment variables in Cloudflare Pages Dashboard before deployment.

### Required Variables

Navigate to **Settings** > **Environment Variables** in your Cloudflare Pages project and add:

#### Client-Side Variables (from `.env.client`)

```bash
# Supabase
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App
PUBLIC_APP_NAME=AutopilotRank
PUBLIC_BASE_URL=https://autopilotrank.com

# OAuth (public client IDs)
PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
PUBLIC_ENABLE_GOOGLE_OAUTH=true
PUBLIC_ENABLE_AZURE_OAUTH=false

# Stripe
PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
PUBLIC_STRIPE_PRICE_CREDITS_SMALL=price_xxx
PUBLIC_STRIPE_PRICE_CREDITS_MEDIUM=price_xxx
PUBLIC_STRIPE_PRICE_CREDITS_LARGE=price_xxx

# Analytics
PUBLIC_BASELIME_KEY=your_baselime_key
PUBLIC_AMPLITUDE_API_KEY=your_amplitude_key
PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Contact emails
PUBLIC_ADMIN_EMAIL=admin@autopilotrank.com
PUBLIC_SUPPORT_EMAIL=support@autopilotrank.com
```

#### Server-Side Secrets (from `.env.api`)

```bash
# Supabase
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Baselime
BASELIME_API_KEY=your_baselime_api_key

# Email
BREVO_API_KEY=your-brevo-api-key
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM_ADDRESS=noreply@autopilotrank.com

# AI Provider
OPENROUTER_API_KEY=your-openrouter-api-key

# CORS
ALLOWED_ORIGIN=https://autopilotrank.com
```

### Important Notes

- **Never commit** `.env.client` or `.env.api` files with real secrets to version control
- Set variables for both **Production** and **Preview** environments
- After adding variables, trigger a new deployment for changes to take effect
- Use the `.env.client.example` and `.env.api.example` files as reference

---

## 4. Custom Domain Configuration

### Step 1: Add Custom Domain

1. Go to **Custom domains** in your Cloudflare Pages project
2. Click **Set up a custom domain**
3. Enter `autopilotrank.com`
4. Click **Continue**

### Step 2: Configure DNS

If your domain is already on Cloudflare:

1. DNS records will be automatically configured
2. SSL certificate will be automatically provisioned

If your domain is external:

1. Add a CNAME record pointing to your `*.pages.dev` URL
2. Wait for DNS propagation (up to 48 hours)

### Step 3: SSL/TLS Settings

1. Go to **SSL/TLS** in Cloudflare Dashboard
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

### Step 4: Verify

1. Visit `https://autopilotrank.com`
2. Check SSL certificate (should show valid certificate)
3. Test all critical routes:
   - `/` - Landing page
   - `/pricing` - Pricing page
   - `/help` - Help page
   - `/api/health` - Health check

---

## 5. Post-Deployment Verification Checklist

- [ ] Application loads successfully
- [ ] SSL certificate is valid
- [ ] All environment variables are accessible
- [ ] Database connections work (Supabase)
- [ ] Payment processing works (Stripe)
- [ ] Analytics tracking works (Amplitude + GA4)
- [ ] Error monitoring works (Baselime)
- [ ] Health check endpoint returns 200: `/api/health`
- [ ] Sitemap accessible: `/sitemap.xml`
- [ ] Robots.txt accessible: `/robots.txt`

---

## 6. Troubleshooting

| Issue                                 | Solution                                                                                                                       |
| :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------- |
| **Build fails**                       | Check Node.js version compatibility, ensure all dependencies are installed with `yarn install`                                 |
| **Environment Variables not loading** | Ensure variables are set for the correct environment (Production/Preview). Trigger a new deployment after adding variables.    |
| **API routes failing**                | Check that all server-side secrets are configured. Review function logs in Cloudflare Dashboard.                               |
| **Database connection errors**        | Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly. Check Supabase project URL matches.                                       |
| **Stripe webhooks failing**           | Update webhook endpoint in Stripe Dashboard to `https://autopilotrank.com/api/webhooks/stripe`. Verify webhook secret matches. |
| **Middleware not running**            | Verify `src/middleware/index.ts` exists and is properly configured. Check that it exports the `onRequest` function.            |
