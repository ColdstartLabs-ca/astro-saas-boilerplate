/**
 * GSC Connection Sites API Route
 * GET /api/gsc/connections/:id/sites - List verified GSC sites for a connection
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { gscService } from '@server/services/gsc.service';
import type { IGscConnection } from '@shared/types/opportunity.types';
import { withAuth, jsonResponse, errorResponse } from '../../../_utils';

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

function pickBestSite(
  projectDomain: string | null,
  sites: Array<{ siteUrl: string; permissionLevel: string }>
): string | null {
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
 * GET /api/gsc/connections/:id/sites
 * Fetch verified Google Search Console sites for the given connection.
 * Handles token refresh if needed.
 */
export const GET = withAuth(async (userId, { params }) => {
  const connectionId = params.id as string;
  if (!connectionId) {
    return errorResponse('VALIDATION_ERROR', 'Connection ID is required', 400);
  }

  // Fetch connection with ownership check
  const { data: connection, error: fetchError } = await supabaseAdmin
    .from('gsc_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !connection) {
    return errorResponse('NOT_FOUND', 'Connection not found', 404);
  }

  if (connection.status !== 'active') {
    return errorResponse('VALIDATION_ERROR', 'Connection is not active', 400);
  }

  // Get a valid access token (refreshes if expired)
  const accessToken = await gscService.getValidAccessToken(connection as IGscConnection);

  // Fetch sites from GSC API
  const sites = await gscService.getSites(accessToken);

  let selectedSiteUrl = connection.site_url as string | null;
  const hasSelectedSite =
    typeof selectedSiteUrl === 'string' && selectedSiteUrl.trim().length > 0;
  let projectDomain: string | null = null;
  if (!hasSelectedSite) {
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('domain')
      .eq('id', connection.project_id)
      .eq('user_id', userId)
      .maybeSingle();
    projectDomain = (project?.domain as string | null) ?? null;
  }

  const recommendedSiteUrl =
    !hasSelectedSite ? pickBestSite(projectDomain, sites) : null;

  if (!hasSelectedSite && recommendedSiteUrl) {
    const { error: updateError } = await supabaseAdmin
      .from('gsc_connections')
      .update({
        site_url: recommendedSiteUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (!updateError) {
      selectedSiteUrl = recommendedSiteUrl;
    } else {
      console.error('[GscSites] Failed to auto-select recommended property:', updateError.message);
    }
  }

  return jsonResponse({
    sites,
    recommendedSiteUrl,
    selectedSiteUrl,
  });
});
