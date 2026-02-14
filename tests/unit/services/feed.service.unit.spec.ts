import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  feedService,
  InvalidFeedTokenError,
  UserNotFoundError,
} from '@server/services/feed.service';

// Mock dayjs and its plugin BEFORE importing the service
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn((date?: string | Date) => {
    const d = date ? new Date(date) : new Date();
    return {
      toDate: () => d,
      toRFC822: () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = days[d.getUTCDay()];
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = months[d.getUTCMonth()];
        const year = d.getUTCFullYear();
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        const seconds = String(d.getUTCSeconds()).padStart(2, '0');
        return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
      },
    };
  });
  (mockDayjs as unknown as { extend: ReturnType<typeof vi.fn> }).extend = vi.fn();
  return { default: mockDayjs };
});

// Mock supabaseAdmin
vi.mock('@server/supabase/supabaseAdmin', () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockMaybeSingle = vi.fn();
  const mockUpdate = vi.fn();
  const mockNot = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();

  const buildChain = () => ({
    select: mockSelect,
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    update: mockUpdate,
    not: mockNot,
    order: mockOrder,
    limit: mockLimit,
  });

  mockSelect.mockReturnValue(buildChain());
  mockEq.mockReturnValue(buildChain());
  mockNot.mockReturnValue(buildChain());
  mockOrder.mockReturnValue(buildChain());
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue(buildChain());

  return {
    supabaseAdmin: {
      from: mockFrom,
    },
  };
});

// Mock clientEnv
vi.mock('@shared/config/env', () => ({
  clientEnv: {
    APP_NAME: 'AutopilotRank',
    BASE_URL: 'https://autopilotrank.com',
  },
}));

describe('FeedService', () => {
  const mockUserId = '01234567-89ab-cdef-0123-456789abcdef';
  const mockFeedToken = '12345678-1234-1234-1234-123456789012';
  const mockProjectId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('validateFeedToken', () => {
    it('should validate a correct feed token', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: mockUserId, feed_token: mockFeedToken },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        feedService.validateFeedToken(mockUserId, mockFeedToken)
      ).resolves.not.toThrow();
    });

    it('should reject invalid token', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: mockUserId, feed_token: 'different-token' },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        feedService.validateFeedToken(mockUserId, mockFeedToken)
      ).rejects.toThrow(InvalidFeedTokenError);
    });

    it('should reject empty token', async () => {
      await expect(feedService.validateFeedToken(mockUserId, '')).rejects.toThrow(
        InvalidFeedTokenError
      );
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(
        feedService.validateFeedToken(mockUserId, mockFeedToken)
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should reject when user has no feed_token', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: mockUserId, feed_token: null },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        feedService.validateFeedToken(mockUserId, mockFeedToken)
      ).rejects.toThrow(InvalidFeedTokenError);
    });
  });

  describe('getPublishedArticles', () => {
    it('should fetch published articles for a user', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article',
          content: '<p>Content</p>',
          primary_keyword: 'test keyword',
          published_url: 'https://example.com/article',
          published_at: '2024-01-01T00:00:00Z',
          meta_description: 'Test description',
        },
      ];

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: mockArticles,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const articles = await feedService.getPublishedArticles(mockUserId);

      expect(articles).toHaveLength(1);
      expect(articles[0]).toMatchObject({
        id: 'article-1',
        title: 'Test Article',
        primaryKeyword: 'test keyword',
      });
    });

    it('should include project filter in query when projectId is provided', async () => {
      // This test verifies the service accepts a projectId parameter
      // The actual filtering is handled by Supabase query builder
      // Integration tests verify the full query behavior
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      // Track if eq was called with project_id
      const eqCalls: Array<{ field: string; value: string }> = [];

      // Create a mock that returns a chainable object and a thenable
      const createChainable = (): Record<string, unknown> => {
        const chain: Record<string, unknown> = {
          eq: vi.fn((field: string, value: string) => {
            eqCalls.push({ field, value });
            return createChainable();
          }),
          not: vi.fn(() => createChainable()),
          order: vi.fn(() => createChainable()),
          limit: vi.fn(() => {
            // Return an object that is both chainable AND thenable
            const chainable = createChainable();
            (chainable as unknown as Promise<{ data: unknown[]; error: null }>).then = (
              resolve: (value: { data: unknown[]; error: null }) => void
            ) => {
              // Simulate promise resolution
              return Promise.resolve({ data: [], error: null }).then(resolve);
            };
            return chainable;
          }),
        };
        return chain;
      };

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue(createChainable()),
      });

      const articles = await feedService.getPublishedArticles(mockUserId, mockProjectId);

      // Verify articles were returned (empty because mock returns empty)
      expect(articles).toEqual([]);
      // Verify that project_id filter was included
      expect(eqCalls.some(call => call.field === 'project_id' && call.value === mockProjectId)).toBe(true);
    });

    it('should return empty array when no articles', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const articles = await feedService.getPublishedArticles(mockUserId);

      expect(articles).toEqual([]);
    });
  });

  describe('generateRSSXML', () => {
    it('should generate valid RSS 2.0 XML', () => {
      const articles = [
        {
          id: 'article-1',
          title: 'Test Article',
          content: '<p>Test content</p>',
          primaryKeyword: 'test',
          publishedUrl: 'https://example.com/article',
          publishedAt: '2024-01-01T00:00:00Z',
          metaDescription: 'Test description',
        },
      ];

      const channelInfo = {
        title: 'AutopilotRank - Published Articles',
        description: 'Your AI-generated SEO articles',
        link: 'https://autopilotrank.com',
        language: 'en-us',
        lastBuildDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      };

      const xml = feedService.generateRSSXML(articles, channelInfo);

      // Check XML structure
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain('xmlns:content="http://purl.org/rss/1.0/modules/content/"');
      expect(xml).toContain('<channel>');
      expect(xml).toContain('<title>AutopilotRank - Published Articles</title>');
      expect(xml).toContain('<link>https://autopilotrank.com</link>');
      expect(xml).toContain('<item>');
      expect(xml).toContain('<title>Test Article</title>');
      expect(xml).toContain('<content:encoded>');
      expect(xml).toContain('<category>test</category>');
      expect(xml).toContain('</rss>');
    });

    it('should escape special XML characters in title', () => {
      const articles = [
        {
          id: 'article-1',
          title: 'Test & Article <with> "special" chars',
          content: '<p>Content</p>',
          primaryKeyword: 'test',
          publishedUrl: 'https://example.com/article',
          publishedAt: '2024-01-01T00:00:00Z',
          metaDescription: 'Test description',
        },
      ];

      const channelInfo = {
        title: 'Feed',
        description: 'Description',
        link: 'https://example.com',
        language: 'en-us',
        lastBuildDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      };

      const xml = feedService.generateRSSXML(articles, channelInfo);

      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&quot;');
    });

    it('should handle empty articles list', () => {
      const channelInfo = {
        title: 'Feed',
        description: 'Description',
        link: 'https://example.com',
        language: 'en-us',
        lastBuildDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      };

      const xml = feedService.generateRSSXML([], channelInfo);

      expect(xml).toContain('<channel>');
      expect(xml).not.toContain('<item>');
    });

    it('should wrap content in CDATA', () => {
      const articles = [
        {
          id: 'article-1',
          title: 'Test',
          content: '<p>HTML content</p>',
          primaryKeyword: 'test',
          publishedUrl: 'https://example.com',
          publishedAt: '2024-01-01T00:00:00Z',
          metaDescription: 'Test',
        },
      ];

      const channelInfo = {
        title: 'Feed',
        description: 'Description',
        link: 'https://example.com',
        language: 'en-us',
        lastBuildDate: 'Mon, 01 Jan 2024 00:00:00 GMT',
      };

      const xml = feedService.generateRSSXML(articles, channelInfo);

      expect(xml).toContain('<content:encoded><![CDATA[<p>HTML content</p>]]></content:encoded>');
    });
  });

  describe('generateFeed', () => {
    it('should generate complete RSS feed', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      // Mock token validation
      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: mockUserId, feed_token: mockFeedToken },
                error: null,
              }),
            }),
          }),
        })
        // Mock article fetch
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                not: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'article-1',
                          title: 'Test Article',
                          content: '<p>Content</p>',
                          primary_keyword: 'test',
                          published_url: 'https://example.com/article',
                          published_at: '2024-01-01T00:00:00Z',
                          meta_description: 'Test description',
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        });

      const xml = await feedService.generateFeed({
        userId: mockUserId,
        feedToken: mockFeedToken,
      });

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain('<title>Test Article</title>');
    });

    it('should reject invalid token', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: mockUserId, feed_token: 'different-token' },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        feedService.generateFeed({
          userId: mockUserId,
          feedToken: mockFeedToken,
        })
      ).rejects.toThrow(InvalidFeedTokenError);
    });
  });

  describe('regenerateFeedToken', () => {
    it('should generate and save new feed token', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const newToken = await feedService.regenerateFeedToken(mockUserId);

      // Should be a valid UUID
      expect(newToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });
  });

  describe('getFeedToken', () => {
    it('should return feed token for user', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { feed_token: mockFeedToken },
              error: null,
            }),
          }),
        }),
      });

      const token = await feedService.getFeedToken(mockUserId);

      expect(token).toBe(mockFeedToken);
    });

    it('should return null when user has no feed token', async () => {
      const { supabaseAdmin } = await import('@server/supabase/supabaseAdmin');

      (supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const token = await feedService.getFeedToken(mockUserId);

      expect(token).toBeNull();
    });
  });
});
