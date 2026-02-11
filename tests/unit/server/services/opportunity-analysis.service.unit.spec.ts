import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Hoisted so it's available in vi.mock factory
const { mockChatCompletionWithRetry } = vi.hoisted(() => ({
  mockChatCompletionWithRetry: vi.fn(),
}));

vi.mock('@server/services/openrouter.service', () => {
  return {
    OpenRouterService: class MockOpenRouterService {
      chatCompletionWithRetry = mockChatCompletionWithRetry;
    },
  };
});

// Mock env (needed by OpenRouterService constructor)
vi.mock('@shared/config/env', () => ({
  serverEnv: {
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_VL_MODEL: 'test-model',
    OPENROUTER_TEXT_MODEL: 'test-text-model',
    BASE_URL: 'https://test.example.com',
    APP_NAME: 'TestApp',
  },
  clientEnv: {
    BASE_URL: 'https://test.example.com',
    GOOGLE_CLIENT_ID: 'test-client-id',
  },
}));

import { OpportunityAnalysisService } from '@server/services/opportunity-analysis.service';
import { OpenRouterService } from '@server/services/openrouter.service';
import type {
  IGscSnapshot,
  IGscSnapshotData,
  IOpportunity,
  IOpportunityMetrics,
} from '@shared/types/opportunity.types';

// =============================================================================
// Test Data Factories
// =============================================================================

function makeSnapshotData(overrides: Partial<IGscSnapshotData> = {}): IGscSnapshotData {
  return {
    queries: [],
    pages: [],
    totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    ...overrides,
  };
}

function makeSnapshot(data: IGscSnapshotData): IGscSnapshot {
  return {
    id: 'snap-001',
    connection_id: 'conn-001',
    project_id: 'proj-001',
    user_id: 'user-001',
    date_range_start: '2025-01-01',
    date_range_end: '2025-01-28',
    data,
    query_count: data.queries.length,
    created_at: '2025-01-28T00:00:00Z',
  };
}

function makeExistingOpportunity(overrides: Partial<IOpportunity> = {}): IOpportunity {
  return {
    id: 'opp-existing-001',
    project_id: 'proj-001',
    user_id: 'user-001',
    snapshot_id: 'snap-000',
    type: 'low_hanging_fruit',
    category: 'content',
    title: 'Existing opportunity',
    description: 'An existing opportunity',
    query: 'test query',
    page_url: 'https://example.com/test',
    metrics: { position: 12, ctr: 0.02, impressions: 200, clicks: 4 },
    priority_score: 60,
    estimated_impact: 'medium',
    status: 'open',
    action_type: null,
    action_ref_id: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('OpportunityAnalysisService', () => {
  let service: OpportunityAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    const openRouterInstance = new OpenRouterService();
    service = new OpportunityAnalysisService(openRouterInstance);

    // Default AI response: empty (tests use fallbacks unless overridden)
    mockChatCompletionWithRetry.mockResolvedValue({
      content: '[]',
      model: 'test-model',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      finishReason: 'stop',
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Low Hanging Fruit Detection
  // ===========================================================================

  describe('low_hanging_fruit detection', () => {
    it('should identify queries at position 8-20 with 100+ impressions', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'best seo tools',
            clicks: 5,
            impressions: 200,
            ctr: 0.025,
            position: 12,
            page: 'https://example.com/seo-tools',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      expect(result.newOpportunities).toHaveLength(1);
      expect(result.newOpportunities[0].type).toBe('low_hanging_fruit');
      expect(result.newOpportunities[0].query).toBe('best seo tools');
    });

    it('should NOT flag queries at position < 8', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'already ranking',
            clicks: 50,
            impressions: 500,
            ctr: 0.1,
            position: 5,
            page: 'https://example.com/page',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const lowHanging = result.newOpportunities.filter(o => o.type === 'low_hanging_fruit');
      expect(lowHanging).toHaveLength(0);
    });

    it('should NOT flag queries at position > 20', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'deep page',
            clicks: 0,
            impressions: 200,
            ctr: 0,
            position: 25,
            page: 'https://example.com/page',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const lowHanging = result.newOpportunities.filter(o => o.type === 'low_hanging_fruit');
      expect(lowHanging).toHaveLength(0);
    });

    it('should NOT flag queries with fewer than 100 impressions', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'niche query',
            clicks: 1,
            impressions: 50,
            ctr: 0.02,
            position: 15,
            page: 'https://example.com/page',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const lowHanging = result.newOpportunities.filter(o => o.type === 'low_hanging_fruit');
      expect(lowHanging).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Low CTR Detection
  // ===========================================================================

  describe('low_ctr detection', () => {
    it('should detect queries with CTR significantly below expected for position range', async () => {
      // Position 5 has expected CTR of ~0.06, threshold at 50% = 0.03
      // CTR of 0.01 is well below threshold
      const data = makeSnapshotData({
        queries: [
          {
            query: 'low ctr query',
            clicks: 1,
            impressions: 100,
            ctr: 0.01,
            position: 5,
            page: 'https://example.com/page',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const lowCtr = result.newOpportunities.filter(o => o.type === 'low_ctr');
      expect(lowCtr).toHaveLength(1);
      expect(lowCtr[0].metrics.avgCtrForPosition).toBeDefined();
    });

    it('should NOT flag queries with reasonable CTR', async () => {
      // Position 5 expected CTR ~0.06, this has 0.05 which is above threshold
      const data = makeSnapshotData({
        queries: [
          {
            query: 'normal ctr',
            clicks: 5,
            impressions: 100,
            ctr: 0.05,
            position: 5,
            page: 'https://example.com/page',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const lowCtr = result.newOpportunities.filter(o => o.type === 'low_ctr');
      expect(lowCtr).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Content Gap Detection
  // ===========================================================================

  describe('content_gap detection', () => {
    it('should detect queries with impressions but no page and no clicks', async () => {
      const data = makeSnapshotData({
        queries: [{ query: 'uncovered topic', clicks: 0, impressions: 100, ctr: 0, position: 30 }],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const gaps = result.newOpportunities.filter(o => o.type === 'content_gap');
      expect(gaps).toHaveLength(1);
      expect(gaps[0].page_url).toBeNull();
    });

    it('should NOT flag queries that have a page associated', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'has page',
            clicks: 0,
            impressions: 100,
            ctr: 0,
            position: 30,
            page: 'https://example.com/existing',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const gaps = result.newOpportunities.filter(o => o.type === 'content_gap');
      expect(gaps).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Thin Content Detection
  // ===========================================================================

  describe('thin_content detection', () => {
    it('should detect pages with very low impressions despite ranking', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'thin topic',
            clicks: 0,
            impressions: 5,
            ctr: 0,
            position: 15,
            page: 'https://example.com/thin',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const thin = result.newOpportunities.filter(o => o.type === 'thin_content');
      expect(thin).toHaveLength(1);
    });

    it('should NOT flag queries without a page as thin content', async () => {
      const data = makeSnapshotData({
        queries: [{ query: 'no page thin', clicks: 0, impressions: 5, ctr: 0, position: 15 }],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const thin = result.newOpportunities.filter(o => o.type === 'thin_content');
      expect(thin).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Priority Scoring
  // ===========================================================================

  describe('calculatePriority', () => {
    it('should return a score between 0 and 100', () => {
      const metrics: IOpportunityMetrics = {
        position: 12,
        ctr: 0.02,
        impressions: 300,
        clicks: 6,
      };

      const score = service.calculatePriority('low_hanging_fruit', metrics);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher priority to low_hanging_fruit than thin_content', () => {
      const metrics: IOpportunityMetrics = {
        position: 12,
        ctr: 0.02,
        impressions: 200,
        clicks: 4,
      };

      const lowHangingScore = service.calculatePriority('low_hanging_fruit', metrics);
      const thinScore = service.calculatePriority('thin_content', metrics);

      expect(lowHangingScore).toBeGreaterThan(thinScore);
    });

    it('should give higher priority to queries with more impressions', () => {
      const lowImpressions: IOpportunityMetrics = {
        position: 12,
        ctr: 0.02,
        impressions: 50,
        clicks: 1,
      };
      const highImpressions: IOpportunityMetrics = {
        position: 12,
        ctr: 0.02,
        impressions: 10000,
        clicks: 200,
      };

      const lowScore = service.calculatePriority('low_hanging_fruit', lowImpressions);
      const highScore = service.calculatePriority('low_hanging_fruit', highImpressions);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should give higher priority to queries closer to position 1', () => {
      const pos3: IOpportunityMetrics = { position: 3, ctr: 0.1, impressions: 500, clicks: 50 };
      const pos20: IOpportunityMetrics = { position: 20, ctr: 0.01, impressions: 500, clicks: 5 };

      const scorePos3 = service.calculatePriority('low_ctr', pos3);
      const scorePos20 = service.calculatePriority('low_ctr', pos20);

      expect(scorePos3).toBeGreaterThan(scorePos20);
    });
  });

  // ===========================================================================
  // Merge With Existing
  // ===========================================================================

  describe('merge with existing opportunities', () => {
    it('should identify new opportunities that do not exist yet', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'brand new topic',
            clicks: 3,
            impressions: 150,
            ctr: 0.02,
            position: 14,
            page: 'https://example.com/new',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      expect(result.newOpportunities).toHaveLength(1);
      expect(result.updatedOpportunities).toHaveLength(0);
    });

    it('should update existing open opportunities with fresh metrics', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'test query',
            clicks: 10,
            impressions: 300,
            ctr: 0.033,
            position: 10,
            page: 'https://example.com/test',
          },
        ],
      });
      const snapshot = makeSnapshot(data);
      const existing = [makeExistingOpportunity()];

      const result = await service.analyzeSnapshot(snapshot, existing, 'proj-001', 'user-001');

      expect(result.newOpportunities).toHaveLength(0);
      expect(result.updatedOpportunities).toHaveLength(1);
      expect(result.updatedOpportunities[0].id).toBe('opp-existing-001');
      // Metrics should be updated
      expect(result.updatedOpportunities[0].metrics.impressions).toBe(300);
    });

    it('should NOT update opportunities that are already in_progress', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'test query',
            clicks: 10,
            impressions: 300,
            ctr: 0.033,
            position: 10,
            page: 'https://example.com/test',
          },
        ],
      });
      const snapshot = makeSnapshot(data);
      const existing = [makeExistingOpportunity({ status: 'in_progress' })];

      const result = await service.analyzeSnapshot(snapshot, existing, 'proj-001', 'user-001');

      // Should not be in updated (it's in_progress, we don't touch it)
      // And it's not truly "new" either since the key matches
      expect(result.updatedOpportunities).toHaveLength(0);
      expect(result.newOpportunities).toHaveLength(0);
    });

    it('should NOT update dismissed opportunities', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'test query',
            clicks: 10,
            impressions: 300,
            ctr: 0.033,
            position: 10,
            page: 'https://example.com/test',
          },
        ],
      });
      const snapshot = makeSnapshot(data);
      const existing = [makeExistingOpportunity({ status: 'dismissed' })];

      const result = await service.analyzeSnapshot(snapshot, existing, 'proj-001', 'user-001');

      expect(result.updatedOpportunities).toHaveLength(0);
      expect(result.newOpportunities).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Empty / Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should return empty results for empty snapshot data', async () => {
      const data = makeSnapshotData({ queries: [] });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      expect(result.newOpportunities).toHaveLength(0);
      expect(result.updatedOpportunities).toHaveLength(0);
    });

    it('should handle AI enrichment failure gracefully with fallback titles', async () => {
      mockChatCompletionWithRetry.mockRejectedValue(new Error('AI service down'));

      const data = makeSnapshotData({
        queries: [
          {
            query: 'fallback test',
            clicks: 3,
            impressions: 150,
            ctr: 0.02,
            position: 14,
            page: 'https://example.com/fb',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      expect(result.newOpportunities).toHaveLength(1);
      // Should have a fallback title (not empty)
      expect(result.newOpportunities[0].title).toContain('fallback test');
      expect(result.newOpportunities[0].description.length).toBeGreaterThan(0);
    });

    it('should handle multiple opportunity types in one snapshot', async () => {
      const data = makeSnapshotData({
        queries: [
          // Low hanging fruit
          {
            query: 'lhf query',
            clicks: 5,
            impressions: 200,
            ctr: 0.025,
            position: 12,
            page: 'https://example.com/lhf',
          },
          // Content gap (no page, no clicks)
          { query: 'gap query', clicks: 0, impressions: 80, ctr: 0, position: 30 },
          // Thin content
          {
            query: 'thin query',
            clicks: 0,
            impressions: 3,
            ctr: 0,
            position: 10,
            page: 'https://example.com/thin',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const types = result.newOpportunities.map(o => o.type);
      expect(types).toContain('low_hanging_fruit');
      expect(types).toContain('content_gap');
      expect(types).toContain('thin_content');
    });
  });

  // ===========================================================================
  // AI Enrichment
  // ===========================================================================

  describe('AI enrichment', () => {
    it('should use AI-generated titles when available', async () => {
      mockChatCompletionWithRetry.mockResolvedValue({
        content: JSON.stringify([
          {
            index: 0,
            title: 'Optimize your SEO tools ranking',
            description:
              'Your page ranks #12 for "best seo tools". Improve on-page SEO to break into the top 10.',
            category: 'content',
            estimated_impact: 'high',
          },
        ]),
        model: 'test-model',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const data = makeSnapshotData({
        queries: [
          {
            query: 'best seo tools',
            clicks: 5,
            impressions: 200,
            ctr: 0.025,
            position: 12,
            page: 'https://example.com/seo',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      expect(result.newOpportunities[0].title).toBe('Optimize your SEO tools ranking');
      expect(result.newOpportunities[0].estimated_impact).toBe('high');
    });

    it('should handle AI returning wrapped JSON format', async () => {
      mockChatCompletionWithRetry.mockResolvedValue({
        content: JSON.stringify({
          opportunities: [
            {
              index: 0,
              title: 'Wrapped format title',
              description: 'Description from wrapped format',
              category: 'technical',
              estimated_impact: 'medium',
            },
          ],
        }),
        model: 'test-model',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        finishReason: 'stop',
      });

      const data = makeSnapshotData({
        queries: [
          {
            query: 'wrapped query',
            clicks: 5,
            impressions: 200,
            ctr: 0.025,
            position: 12,
            page: 'https://example.com/page',
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      expect(result.newOpportunities[0].title).toBe('Wrapped format title');
      expect(result.newOpportunities[0].category).toBe('technical');
    });
  });
});
