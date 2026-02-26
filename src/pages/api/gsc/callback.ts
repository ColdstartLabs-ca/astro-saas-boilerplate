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
import type { IGscSite } from '@shared/types/opportunity.types';

function normalizeHost(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase().replace(/\.$/, '');

  if (trimmed.startsWith('sc-domain:')) {
    return trimmed.replace(/^sc-domain:/, '').replace(/^www\./, '');
  }

  try {
    const parsed = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`);
    return parsed.hostname.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
  } catch {
    return null;
  }
}

function permissionScore(permissionLevel: string): number {
  switch (permissionLevel) {
    case 'siteOwner':
      return 30;
    case 'siteFullUser':
      return 20;
    case 'siteRestrictedUser':
      return 10;
    default:
      return 0;
  }
}

function pickBestSite(projectDomain: string | null, sites: IGscSite[]): string | null {
  if (sites.length === 0) return null;

  const projectHost = normalizeHost(projectDomain ?? '');
  if (!projectHost) {
    return sites.length === 1 ? sites[0].siteUrl : null;
  }

  let bestSite: string | null = null;
  let bestScore = -1;

  for (const site of sites) {
    const siteHost = normalizeHost(site.siteUrl);
    if (!siteHost) continue;

    const exactMatch = siteHost === projectHost;
    const relatedMatch =
      projectHost.endsWith(`.${siteHost}`) || siteHost.endsWith(`.${projectHost}`);

    if (!exactMatch && !relatedMatch) continue;

    const isDomainProperty = site.siteUrl.startsWith('sc-domain:');
    const score =
      permissionScore(site.permissionLevel) +
      (exactMatch ? (isDomainProperty ? 120 : 100) : isDomainProperty ? 80 : 60);

    if (score > bestScore) {
      bestScore = score;
      bestSite = site.siteUrl;
    }
  }

  if (bestSite) return bestSite;
  return sites.length === 1 ? sites[0].siteUrl : null;
}

/**
 * GET /api/gsc/callback
 * Handles the OAuth callback from Google after user grants access.
 * Stores the connection and redirects to the dashboard.
 */
export const GET: APIRoute = async ({ url }) => {
  const baseUrl = url.origin || clientEnv.BASE_URL;
  const dashboardUrl = `${baseUrl}/dashboard/opportunities`;

  try {
    // Parse query parameters
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    // Validate query params
    const params = gscCallbackSchema.parse({ code, state });

    // Verify signed state token
    // Use dedicated OAuth state secret (not CRON_SECRET) for security isolation
    const stateSecret = serverEnv.GSC_STATE_SECRET || serverEnv.CRON_SECRET;
    const stateResult = await verifyOAuthState(params.state, stateSecret);

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
      .select('id, user_id, domain')
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
    const tokens = await gscService.exchangeCode(params.code, baseUrl);

    // Get the user's Google email
    const googleEmail = await gscService.getGoogleUserEmail(tokens.access_token);

    // Calculate token expiration time
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Preserve existing refresh token when Google doesn't return a new one.
    let refreshToken = tokens.refresh_token || '';
    if (!refreshToken) {
      const { data: existingConnection } = await supabaseAdmin
        .from('gsc_connections')
        .select('refresh_token')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .maybeSingle();
      refreshToken = existingConnection?.refresh_token || '';
    }

    // Auto-select best matching property, user can adjust manually later.
    let selectedSiteUrl: string | null = null;
    try {
      const sites = await gscService.getSites(tokens.access_token);
      selectedSiteUrl = pickBestSite((project as { domain?: string | null }).domain ?? null, sites);
      if (selectedSiteUrl) {
        console.log('[GscCallback] Auto-selected property:', selectedSiteUrl);
      }
    } catch (sitesError) {
      console.warn(
        '[GscCallback] Failed to fetch/match GSC properties during callback:',
        sitesError instanceof Error ? sitesError.message : sitesError
      );
    }

    // Store the connection in the database
    const { error: insertError } = await supabaseAdmin.from('gsc_connections').upsert(
      {
        user_id: userId,
        project_id: projectId,
        google_email: googleEmail,
        site_url: selectedSiteUrl,
        access_token: tokens.access_token,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        last_synced_at: new Date().toISOString(),
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
