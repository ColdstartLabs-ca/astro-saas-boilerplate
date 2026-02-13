/**
 * GSC OAuth Callback Route (PUBLIC - no auth required)
 * GET /api/gsc/callback - Handle Google OAuth redirect
 *
 * This is a public route that receives the OAuth callback from Google.
 * It exchanges the authorization code for tokens and stores the connection.
 */

import type { APIRoute } from 'astro';
import { gscService } from '@server/services/gsc.service';
import { gscCallbackSchema } from '@shared/validation/gsc.schema';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { clientEnv, serverEnv } from '@shared/config/env';
import { verifyOAuthState } from '@shared/utils/crypto';

/**
 * GET /api/gsc/callback
 * Handles the OAuth callback from Google after user grants access.
 * Stores the connection and redirects to the dashboard.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const baseUrl = request.headers.get('origin') || clientEnv.BASE_URL;
  const dashboardUrl = `${baseUrl}/dashboard/opportunities`;

  try {
    // Parse query parameters
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // Validate query params
    const params = gscCallbackSchema.parse({ code, state });

    // Verify signed state token
    const stateResult = await verifyOAuthState(params.state, serverEnv.CRON_SECRET);

    if (!stateResult.valid || !stateResult.data) {
      console.error('[GscCallback] Invalid state token:', stateResult.error);
      return Response.redirect(`${dashboardUrl}?error=connection_failed`, 302);
    }

    // Parse state data: "userId:projectId"
    const stateParts = stateResult.data.split(':');
    if (stateParts.length !== 2) {
      console.error('[GscCallback] Invalid state data format:', stateResult.data);
      return Response.redirect(`${dashboardUrl}?error=connection_failed`, 302);
    }
    const [userId, projectId] = stateParts;

    // Verify the project exists and belongs to the user from state
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      console.error(
        '[GscCallback] Project not found or ownership mismatch:',
        projectId,
        projectError?.message
      );
      return Response.redirect(`${dashboardUrl}?error=connection_failed`, 302);
    }

    // Exchange authorization code for tokens
    const tokens = await gscService.exchangeCode(params.code);

    // Get the user's Google email
    const googleEmail = await gscService.getGoogleUserEmail(tokens.access_token);

    // Calculate token expiration time
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Store the connection in the database
    const { error: insertError } = await supabaseAdmin.from('gsc_connections').upsert(
      {
        user_id: userId,
        project_id: projectId,
        google_email: googleEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        token_expires_at: tokenExpiresAt,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,project_id',
      }
    );

    if (insertError) {
      console.error('[GscCallback] Failed to store connection:', insertError.message);
      return Response.redirect(`${dashboardUrl}?error=connection_failed`, 302);
    }

    console.log('[GscCallback] Connection stored for project:', projectId, 'email:', googleEmail);

    // Redirect to dashboard with success indicator
    return Response.redirect(`${dashboardUrl}?connected=true`, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GscCallback] OAuth callback failed:', message);
    return Response.redirect(`${dashboardUrl}?error=connection_failed`, 302);
  }
};
