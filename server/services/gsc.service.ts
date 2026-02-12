/**
 * Google Search Console (GSC) Service
 * Handles OAuth flow, token management, and GSC API interactions.
 */

import { clientEnv, serverEnv } from '@shared/config/env';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type { IGscConnection, IGscSite } from '@shared/types/opportunity.types';

// =============================================================================
// Constants
// =============================================================================

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GSC_SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites';
const GSC_SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly openid email';

// =============================================================================
// Response Types
// =============================================================================

interface IGoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface IGoogleUserInfo {
  email: string;
  id: string;
  verified_email: boolean;
}

interface IGscSitesApiResponse {
  siteEntry?: Array<{
    siteUrl: string;
    permissionLevel: string;
  }>;
}

interface IGscSearchAnalyticsResponse {
  rows?: Array<{
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Google Search Console API client.
 * Manages OAuth flow, token lifecycle, and data fetching from GSC.
 */
export class GscService {
  private get redirectUri(): string {
    return `${clientEnv.BASE_URL}/api/gsc/callback`;
  }

  private get clientId(): string {
    return clientEnv.GOOGLE_CLIENT_ID;
  }

  private get clientSecret(): string {
    return serverEnv.GOOGLE_OAUTH_CLIENT_SECRET;
  }

  // ===========================================================================
  // OAuth Flow
  // ===========================================================================

  /**
   * Generate Google OAuth URL for GSC authorization.
   * State param carries userId:projectId for secure callback verification.
   */
  getAuthUrl(projectId: string, userId: string): string {
    const state = `${userId}:${projectId}`;
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: GSC_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    console.log('[GscService] Generated auth URL for project:', projectId);
    return authUrl;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  async exchangeCode(code: string): Promise<IGoogleTokenResponse> {
    console.log('[GscService] Exchanging authorization code for tokens');

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[GscService] Token exchange failed:', response.status, errorBody);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as IGoogleTokenResponse;
    console.log('[GscService] Token exchange successful');
    return data;
  }

  /**
   * Refresh an expired access token using the refresh token.
   * Updates the connection record in the database.
   */
  async refreshAccessToken(connection: IGscConnection): Promise<string> {
    console.log('[GscService] Refreshing access token for connection:', connection.id);

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[GscService] Token refresh failed:', response.status, errorBody);

      // Mark connection as error if refresh fails
      await supabaseAdmin
        .from('gsc_connections')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', connection.id);

      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = (await response.json()) as IGoogleTokenResponse;

    // Calculate new expiration time
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Update the connection in the database
    const { error: updateError } = await supabaseAdmin
      .from('gsc_connections')
      .update({
        access_token: data.access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('[GscService] Failed to update token in DB:', updateError.message);
      throw new Error('Failed to update refreshed token');
    }

    console.log('[GscService] Access token refreshed successfully');
    return data.access_token;
  }

  // ===========================================================================
  // GSC API
  // ===========================================================================

  /**
   * List verified GSC sites for the authenticated user.
   */
  async getSites(accessToken: string): Promise<IGscSite[]> {
    console.log('[GscService] Fetching GSC sites');

    const response = await fetch(GSC_SITES_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[GscService] Failed to fetch sites:', response.status, errorBody);
      throw new Error(`Failed to fetch GSC sites: ${response.status}`);
    }

    const data = (await response.json()) as IGscSitesApiResponse;

    const sites: IGscSite[] = (data.siteEntry || []).map(entry => ({
      siteUrl: entry.siteUrl,
      permissionLevel: entry.permissionLevel,
    }));

    console.log('[GscService] Found', sites.length, 'sites');
    return sites;
  }

  /**
   * Fetch search analytics data from GSC.
   * Returns query + page level data with clicks, impressions, CTR, and position.
   */
  async getSearchAnalytics(
    accessToken: string,
    siteUrl: string,
    startDate: string,
    endDate: string
  ): Promise<IGscSearchAnalyticsResponse> {
    console.log('[GscService] Fetching search analytics for:', siteUrl);

    const encodedSiteUrl = encodeURIComponent(siteUrl);
    const url = `${GSC_SITES_URL}/${encodedSiteUrl}/searchAnalytics/query`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ['query', 'page'],
        rowLimit: 1000,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[GscService] Search analytics failed:', response.status, errorBody);
      throw new Error(`Failed to fetch search analytics: ${response.status}`);
    }

    const data = (await response.json()) as IGscSearchAnalyticsResponse;
    console.log('[GscService] Search analytics returned', data.rows?.length || 0, 'rows');
    return data;
  }

  // ===========================================================================
  // Token Management
  // ===========================================================================

  /**
   * Get a valid access token for a connection.
   * Checks if the current token is expired and refreshes if needed.
   */
  async getValidAccessToken(connection: IGscConnection): Promise<string> {
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();

    // Add 60-second buffer to avoid edge cases
    const isExpired = expiresAt.getTime() - 60_000 < now.getTime();

    if (isExpired) {
      console.log('[GscService] Token expired, refreshing for connection:', connection.id);
      return this.refreshAccessToken(connection);
    }

    return connection.access_token;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Fetch the Google user's email address from the userinfo endpoint.
   */
  async getGoogleUserEmail(accessToken: string): Promise<string> {
    console.log('[GscService] Fetching Google user email');

    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[GscService] Failed to fetch user info:', response.status, errorBody);
      throw new Error(`Failed to fetch Google user info: ${response.status}`);
    }

    const data = (await response.json()) as IGoogleUserInfo;
    console.log('[GscService] User email:', data.email);
    return data.email;
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const gscService = new GscService();
