# Facebook OAuth Setup (Supabase)

> **STATUS: PARTIALLY IMPLEMENTED - NOT INTEGRATED**
>
> This provider has code implementation (`useFacebookSignIn.ts`, `FacebookSignInButton.tsx`) but is **NOT integrated** into the authentication flow. To enable Facebook OAuth, follow the steps below and then integrate it into `SocialLoginButton.tsx`.

## Implementation Overview

**Current State:**

- Hook exists: `/client/hooks/useFacebookSignIn.ts`
- Component exists: `/client/components/form/FacebookSignInButton.tsx`
- Environment variable: `PUBLIC_FACEBOOK_CLIENT_ID` (in `.env.client.example`)
- **Missing**: `PUBLIC_ENABLE_FACEBOOK_OAUTH` toggle and integration into `SocialLoginButton`

## Step 1: Create a Facebook App

1. Navigate to the [Facebook Developers](https://developers.facebook.com/) site and log in.
2. Click on **My Apps** at the top right, then select **Create App**.
3. Choose the appropriate app type, fill in the required details, and click **Create App**.

## Step 2: Configure Facebook Login

1. In your new app's dashboard, go to **Add Products to Your App** and click **Set Up** under **Facebook Login**.
2. Skip the Quickstart guide. In the left sidebar, click **Settings** under **Facebook Login**.
3. In the **Valid OAuth Redirect URIs** field, enter your Supabase project's callback URL:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   Replace `<project-ref>` with your Supabase project reference.
4. Click **Save Changes**.

## Step 3: Set Permissions

1. Navigate to **App Review** > **Permissions and Features**.
2. Ensure that **public_profile** and **email** permissions are set to **Ready for testing**. If not, click **Request Advanced Access** for each.

## Step 4: Retrieve App Credentials

1. In the left sidebar, click **Settings** > **Basic**.
2. Note your **App ID** and **App Secret**.

## Step 5: Configure Supabase

1. Log in to your [Supabase Dashboard](https://app.supabase.com/).
2. Select your project, then navigate to **Authentication** > **Providers**.
3. Enable **Facebook** and enter your **App ID** and **App Secret**.
4. Click **Save**.

## Step 6: Enable in Application

To fully integrate Facebook OAuth, you need to:

1. **Add environment variable toggle** to `shared/config/env.ts`:

   ```typescript
   ENABLE_FACEBOOK_OAUTH: z.string().default('false'),
   ```

2. **Add to `.env.client`**:

   ```
   PUBLIC_ENABLE_FACEBOOK_OAUTH=true
   PUBLIC_FACEBOOK_CLIENT_ID=your-facebook-app-id
   ```

3. **Update `SocialLoginButton.tsx`** to include Facebook:

   ```typescript
   import { FacebookSignInButton } from '@client/components/form/FacebookSignInButton';

   export const SocialLoginButton: React.FC = () => {
     const isGoogleEnabled = clientEnv.ENABLE_GOOGLE_OAUTH === 'true';
     const isAzureEnabled = clientEnv.ENABLE_AZURE_OAUTH === 'true';
     const isFacebookEnabled = clientEnv.ENABLE_FACEBOOK_OAUTH === 'true';

     if (!isGoogleEnabled && !isAzureEnabled && !isFacebookEnabled) {
       return null;
     }

     return (
       <div className="flex flex-col gap-3 mt-6">
         {/* ... divider ... */}
         {isGoogleEnabled && <GoogleSignInButton />}
         {isAzureEnabled && <AzureSignInButton />}
         {isFacebookEnabled && <FacebookSignInButton />}
       </div>
     );
   };
   ```

## Video Tutorial

[Supabase Authentication: Setting up Facebook Auth](https://www.youtube.com/watch?v=5qF9aMk7eAQ)
