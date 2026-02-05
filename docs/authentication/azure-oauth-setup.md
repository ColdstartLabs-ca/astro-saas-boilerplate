# Azure OAuth Setup (Supabase)

> **STATUS: FULLY IMPLEMENTED**
>
> Azure OAuth is fully implemented with `useAzureSignIn.ts`, `AzureSignInButton.tsx`, and environment toggle `PUBLIC_ENABLE_AZURE_OAUTH`. Follow these steps to enable it for your application.

## Implementation Overview

**Current State:**

- Hook: `/client/hooks/useAzureSignIn.ts`
- Component: `/client/components/form/AzureSignInButton.tsx`
- Environment toggle: `PUBLIC_ENABLE_AZURE_OAUTH` (defaults to `false`)
- Integrated into `SocialLoginButton.tsx`
- Scopes: `email`, `openid`, `profile`, `User.Read`

## Step 1: Register an Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/).
2. Navigate to **Microsoft Entra ID** > **App registrations** > **New registration**.
3. Fill in details:
   - **Name**: Choose a user-friendly name (e.g., `Your App Name OAuth`).
   - **Supported account types**: Select **Accounts in any organizational directory and personal Microsoft accounts**.
   - **Redirect URI**: Add `https://<project-ref>.supabase.co/auth/v1/callback` (production).
4. Register the application.

## Step 2: Add Local Redirect URI

1. Go to **Authentication** > **Platform configurations** > **Add a platform** > **Web**.
2. Add your **local development URI**: `http://localhost:4321/auth/callback` (or your dev port).
3. Click **Configure**.

## Step 3: Obtain Client ID and Secret

1. **Client ID**: Find it in the **Overview** as **Application (client) ID**. Use this as `PUBLIC_AZURE_CLIENT_ID` in your environment.
2. **Client Secret**:
   - Go to **Certificates & secrets** > **Client secrets** > **New client secret**.
   - Copy the **Value** (not Secret ID) after creating it. Use this as the Azure Client Secret in Supabase.

## Step 4: Configure API Permissions

1. Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**.
2. Add the following permissions:
   - `email`
   - `openid`
   - `profile`
   - `User.Read`
3. Click **Grant admin consent** for your organization.

## Step 5: Configure Supabase with Azure Credentials

1. Go to your **Supabase Dashboard** > **Authentication** > **Providers**.
2. Enable **Azure**.
3. Enter the following:
   - **Client ID**: Use `Application (client) ID` from Azure.
   - **Client Secret**: Use the **secret VALUE** from Azure (not the Secret ID).
4. Click **Save**.

## Step 6: Enable in Your Application

1. Add the following to your `.env.client` file:

   ```bash
   PUBLIC_ENABLE_AZURE_OAUTH=true
   PUBLIC_AZURE_CLIENT_ID=your-azure-application-client-id
   ```

2. For GitHub Actions/deployment, add as repository secrets:
   - `AZURE_CLIENT_ID` (for production)

## Environment Variables Reference

| Variable                    | Type   | Description                                  |
| --------------------------- | ------ | -------------------------------------------- |
| `PUBLIC_ENABLE_AZURE_OAUTH` | string | Set to `'true'` to enable Azure OAuth button |
| `PUBLIC_AZURE_CLIENT_ID`    | string | Your Azure Application (client) ID           |

## References

- [Supabase Azure OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [Microsoft Entra ID Documentation](https://learn.microsoft.com/en-us/entra/identity-platform/)
