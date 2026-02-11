/**
 * Unit tests for Delivery Service
 *
 * Tests for delivery orchestration service including:
 * - shouldAutoDeliver method
 * - getArticleDeliveries method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock server dependencies
vi.mock('@server/supabase/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

import { DeliveryService } from '@server/integrations/delivery.service';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

describe('DeliveryService', () => {
  let service: DeliveryService;

  beforeEach(() => {
    service = new DeliveryService();
    vi.clearAllMocks();
  });

  describe('shouldAutoDeliver', () => {
    it('should return true when campaign has auto_publish enabled', async () => {
      const mockFrom = vi.mocked(supabaseAdmin.from);

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'campaign-123',
                settings: { auto_publish: true },
              },
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await service.shouldAutoDeliver('campaign-123');

      expect(result).toBe(true);
    });

    it('should return false when campaign has auto_publish disabled', async () => {
      const mockFrom = vi.mocked(supabaseAdmin.from);

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'campaign-123',
                settings: { auto_publish: false },
              },
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await service.shouldAutoDeliver('campaign-123');

      expect(result).toBe(false);
    });

    it('should return false when campaign settings are missing', async () => {
      const mockFrom = vi.mocked(supabaseAdmin.from);

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'campaign-123',
                settings: {},
              },
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await service.shouldAutoDeliver('campaign-123');

      expect(result).toBe(false);
    });

    it('should return false when campaign is not found', async () => {
      const mockFrom = vi.mocked(supabaseAdmin.from);

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as never);

      const result = await service.shouldAutoDeliver('campaign-123');

      expect(result).toBe(false);
    });
  });

  describe('getArticleDeliveries', () => {
    it('should return delivery records for an article', async () => {
      const mockFrom = vi.mocked(supabaseAdmin.from);

      const mockDeliveries = [
        {
          id: 'delivery-1',
          article_id: 'article-123',
          integration_id: 'wp-integration-1',
          campaign_id: 'campaign-123',
          status: 'delivered',
          external_id: 'wp-post-123',
          external_url: 'https://example.com/test-article',
          error: null,
          attempt_count: 1,
          delivered_at: '2024-01-01T01:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockDeliveries,
              error: null,
            }),
          }),
        }),
      } as never);

      const deliveries = await service.getArticleDeliveries('article-123');

      expect(deliveries).toHaveLength(1);
      expect(deliveries[0].status).toBe('delivered');
      expect(deliveries[0].external_url).toBe('https://example.com/test-article');
    });

    it('should return empty array when no deliveries exist', async () => {
      const mockFrom = vi.mocked(supabaseAdmin.from);

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      } as never);

      const deliveries = await service.getArticleDeliveries('article-123');

      expect(deliveries).toHaveLength(0);
    });

    it('should throw error when database query fails', async () => {
      const mockFrom = vi.mocked(supabaseAdmin.from);

      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          }),
        }),
      } as never);

      await expect(service.getArticleDeliveries('article-123')).rejects.toThrow(
        'Failed to fetch deliveries'
      );
    });
  });
});
