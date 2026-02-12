/**
 * GSC Service Unit Tests
 * Tests for Google Search Console service methods
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IGscConnection } from '@shared/types/opportunity.types';

// Mock environment variables
vi.mock('@shared/config/env', () => ({
  clientEnv: {
    BASE_URL: 'https://app.example.com',
    GOOGLE_CLIENT_ID: 'test-client-id',
  },
  serverEnv: {
    GOOGLE_OAUTH_CLIENT_SECRET: 'test-client-secret',
    CRON_SECRET: 'test-cron-secret-for-oauth-state',
  },
}));

// Mock Supabase admin client
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
  },
}));

// Import after mocking
import { GscService } from '../gsc.service';

describe('GscService', () => {
  let service: GscService;

  beforeEach(() => {
    service = new GscService();
    vi.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should generate a valid Google OAuth URL with signed state', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';
      const authUrl = await service.getAuthUrl(projectId, userId);

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=test-client-id');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('access_type=offline');
      expect(authUrl).toContain('prompt=consent');

      // Verify state is a signed token (data.timestamp.signature format)
      const stateParam = new URL(authUrl).searchParams.get('state');
      expect(stateParam).not.toBeNull();
      const stateParts = stateParam!.split('.');
      expect(stateParts).toHaveLength(3); // data.timestamp.signature

      // Verify the data portion contains userId:projectId (URL encoded)
      const dataPart = decodeURIComponent(stateParts[0]);
      expect(dataPart).toBe(`${userId}:${projectId}`);
    });

    it('should include webmasters.readonly scope', async () => {
      const authUrl = await service.getAuthUrl('test-project', 'test-user');
      expect(authUrl).toContain('webmasters.readonly');
    });

    it('should include openid and email scopes', async () => {
      const authUrl = await service.getAuthUrl('test-project', 'test-user');
      expect(authUrl).toContain('openid');
      expect(authUrl).toContain('email');
    });

    it('should set redirect_uri to the callback endpoint', async () => {
      const authUrl = await service.getAuthUrl('test-project', 'test-user');
      expect(authUrl).toContain(encodeURIComponent('https://app.example.com/api/gsc/callback'));
    });
  });

  describe('exchangeCode', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockTokenResponse = {
        access_token: 'ya29.mock-access-token',
        refresh_token: '1//mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/webmasters.readonly openid email',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const result = await service.exchangeCode('test-auth-code');

      expect(result.access_token).toBe('ya29.mock-access-token');
      expect(result.refresh_token).toBe('1//mock-refresh-token');
      expect(result.expires_in).toBe(3600);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw on failed token exchange', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(service.exchangeCode('invalid-code')).rejects.toThrow(
        'Token exchange failed: 400'
      );
    });
  });

  describe('getSites', () => {
    it('should return list of GSC sites', async () => {
      const mockSitesResponse = {
        siteEntry: [
          { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
          { siteUrl: 'sc-domain:example.com', permissionLevel: 'siteOwner' },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSitesResponse),
      });

      const sites = await service.getSites('test-access-token');

      expect(sites).toHaveLength(2);
      expect(sites[0].siteUrl).toBe('https://example.com/');
      expect(sites[0].permissionLevel).toBe('siteOwner');
      expect(sites[1].siteUrl).toBe('sc-domain:example.com');
    });

    it('should return empty array when no sites', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const sites = await service.getSites('test-access-token');
      expect(sites).toHaveLength(0);
    });

    it('should throw on API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      });

      await expect(service.getSites('bad-token')).rejects.toThrow('Failed to fetch GSC sites: 403');
    });
  });

  describe('getSearchAnalytics', () => {
    it('should fetch search analytics data', async () => {
      const mockAnalyticsResponse = {
        rows: [
          {
            keys: ['test keyword', 'https://example.com/page'],
            clicks: 100,
            impressions: 1000,
            ctr: 0.1,
            position: 5.2,
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalyticsResponse),
      });

      const result = await service.getSearchAnalytics(
        'test-token',
        'https://example.com/',
        '2025-01-01',
        '2025-01-31'
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows![0].clicks).toBe(100);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('searchAnalytics/query'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw on API error', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(
        service.getSearchAnalytics('token', 'https://example.com/', '2025-01-01', '2025-01-31')
      ).rejects.toThrow('Failed to fetch search analytics: 500');
    });
  });

  describe('getValidAccessToken', () => {
    it('should return existing token when not expired', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      const connection: IGscConnection = {
        id: 'conn-1',
        user_id: 'user-1',
        project_id: 'proj-1',
        google_email: 'test@gmail.com',
        site_url: 'https://example.com',
        access_token: 'valid-token',
        refresh_token: 'refresh-token',
        token_expires_at: futureDate,
        last_synced_at: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const token = await service.getValidAccessToken(connection);
      expect(token).toBe('valid-token');
    });

    it('should refresh token when expired', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      const connection: IGscConnection = {
        id: 'conn-1',
        user_id: 'user-1',
        project_id: 'proj-1',
        google_email: 'test@gmail.com',
        site_url: 'https://example.com',
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        token_expires_at: pastDate,
        last_synced_at: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'webmasters.readonly',
          }),
      });

      const token = await service.getValidAccessToken(connection);
      expect(token).toBe('new-token');
    });
  });

  describe('getGoogleUserEmail', () => {
    it('should fetch user email from Google userinfo', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            email: 'user@gmail.com',
            id: '123456',
            verified_email: true,
          }),
      });

      const email = await service.getGoogleUserEmail('test-token');
      expect(email).toBe('user@gmail.com');
    });

    it('should throw on failed userinfo request', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(service.getGoogleUserEmail('bad-token')).rejects.toThrow(
        'Failed to fetch Google user info: 401'
      );
    });
  });
});
