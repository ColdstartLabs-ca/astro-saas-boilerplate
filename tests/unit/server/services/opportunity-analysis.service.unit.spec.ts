import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Hoisted so it's available in vi.mock factory
const { mockChatCompletionWithRetry } = vi.hoisted(() => ({
  mockChatCompletionWithRetry: vi.fn(),
}));

// Hoisted mock functions for embeddings service
const { mockGenerateEmbedding, mockCalculateCosineSimilarity, mockIsConfigured } = vi.hoisted(
  () => ({
    mockGenerateEmbedding: vi.fn(),
    mockCalculateCosineSimilarity: vi.fn(),
    mockIsConfigured: vi.fn().mockReturnValue(false),
  })
);

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

// Mock OpenAI embeddings service (needed for topic cluster detection)
vi.mock('@server/services/openai-embeddings.service', () => ({
  openaiEmbeddingsService: {
    isConfigured: mockIsConfigured,
    generateEmbedding: mockGenerateEmbedding,
    calculateCosineSimilarity: mockCalculateCosineSimilarity,
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
  // Declining Position Detection
  // ===========================================================================

  describe('declining_position detection', () => {
    it('should detect declining position when drop >= 5', async () => {
      // Previous: position 5, Current: position 12 (drop of 7)
      const previousData = makeSnapshotData({
        queries: [
          {
            query: 'declining query',
            clicks: 10,
            impressions: 200,
            ctr: 0.05,
            position: 5,
            page: 'https://example.com/page',
          },
        ],
      });
      const currentData = makeSnapshotData({
        queries: [
          {
            query: 'declining query',
            clicks: 5,
            impressions: 150,
            ctr: 0.033,
            position: 12,
            page: 'https://example.com/page',
          },
        ],
      });
      const previousSnapshot = makeSnapshot(previousData);
      previousSnapshot.id = 'snap-prev-001';
      const currentSnapshot = makeSnapshot(currentData);

      const result = await service.analyzeSnapshot(
        currentSnapshot,
        [],
        'proj-001',
        'user-001',
        previousSnapshot
      );

      const declining = result.newOpportunities.filter(o => o.type === 'declining_position');
      expect(declining).toHaveLength(1);
      expect(declining[0].query).toBe('declining query');
    });

    it('should NOT flag queries with position drop < 5', async () => {
      // Previous: position 5, Current: position 8 (drop of 3 - below threshold)
      const previousData = makeSnapshotData({
        queries: [
          {
            query: 'small drop',
            clicks: 10,
            impressions: 200,
            ctr: 0.05,
            position: 5,
            page: 'https://example.com/page',
          },
        ],
      });
      const currentData = makeSnapshotData({
        queries: [
          {
            query: 'small drop',
            clicks: 8,
            impressions: 180,
            ctr: 0.044,
            position: 8,
            page: 'https://example.com/page',
          },
        ],
      });
      const previousSnapshot = makeSnapshot(previousData);
      previousSnapshot.id = 'snap-prev-001';
      const currentSnapshot = makeSnapshot(currentData);

      const result = await service.analyzeSnapshot(
        currentSnapshot,
        [],
        'proj-001',
        'user-001',
        previousSnapshot
      );

      const declining = result.newOpportunities.filter(o => o.type === 'declining_position');
      expect(declining).toHaveLength(0);
    });

    it('should store previousPosition and positionChange in metrics', async () => {
      const previousData = makeSnapshotData({
        queries: [
          {
            query: 'tracked decline',
            clicks: 15,
            impressions: 300,
            ctr: 0.05,
            position: 3,
            page: 'https://example.com/page',
          },
        ],
      });
      const currentData = makeSnapshotData({
        queries: [
          {
            query: 'tracked decline',
            clicks: 8,
            impressions: 250,
            ctr: 0.032,
            position: 15,
            page: 'https://example.com/page',
          },
        ],
      });
      const previousSnapshot = makeSnapshot(previousData);
      previousSnapshot.id = 'snap-prev-001';
      const currentSnapshot = makeSnapshot(currentData);

      const result = await service.analyzeSnapshot(
        currentSnapshot,
        [],
        'proj-001',
        'user-001',
        previousSnapshot
      );

      const declining = result.newOpportunities.filter(o => o.type === 'declining_position');
      expect(declining).toHaveLength(1);
      expect(declining[0].metrics.previousPosition).toBe(3);
      expect(declining[0].metrics.positionChange).toBe(12); // 15 - 3 = 12
    });

    it('should skip queries not in previous snapshot', async () => {
      // New query that only exists in current snapshot
      const previousData = makeSnapshotData({
        queries: [],
      });
      const currentData = makeSnapshotData({
        queries: [
          {
            query: 'brand new query',
            clicks: 5,
            impressions: 100,
            ctr: 0.05,
            position: 20,
            page: 'https://example.com/page',
          },
        ],
      });
      const previousSnapshot = makeSnapshot(previousData);
      previousSnapshot.id = 'snap-prev-001';
      const currentSnapshot = makeSnapshot(currentData);

      const result = await service.analyzeSnapshot(
        currentSnapshot,
        [],
        'proj-001',
        'user-001',
        previousSnapshot
      );

      const declining = result.newOpportunities.filter(o => o.type === 'declining_position');
      expect(declining).toHaveLength(0);
    });

    it('should skip declining detection when no previous snapshot available', async () => {
      const currentData = makeSnapshotData({
        queries: [
          {
            query: 'any query',
            clicks: 5,
            impressions: 100,
            ctr: 0.05,
            position: 20,
            page: 'https://example.com/page',
          },
        ],
      });
      const currentSnapshot = makeSnapshot(currentData);

      // No previous snapshot passed
      const result = await service.analyzeSnapshot(
        currentSnapshot,
        [],
        'proj-001',
        'user-001'
        // No previousSnapshot parameter
      );

      const declining = result.newOpportunities.filter(o => o.type === 'declining_position');
      expect(declining).toHaveLength(0);
    });

    it('should require minimum 50 impressions for declining detection', async () => {
      // Query with big position drop but low impressions (49)
      const previousData = makeSnapshotData({
        queries: [
          {
            query: 'low volume decline',
            clicks: 1,
            impressions: 49,
            ctr: 0.02,
            position: 5,
            page: 'https://example.com/page',
          },
        ],
      });
      const currentData = makeSnapshotData({
        queries: [
          {
            query: 'low volume decline',
            clicks: 0,
            impressions: 49,
            ctr: 0,
            position: 15,
            page: 'https://example.com/page',
          },
        ],
      });
      const previousSnapshot = makeSnapshot(previousData);
      previousSnapshot.id = 'snap-prev-001';
      const currentSnapshot = makeSnapshot(currentData);

      const result = await service.analyzeSnapshot(
        currentSnapshot,
        [],
        'proj-001',
        'user-001',
        previousSnapshot
      );

      const declining = result.newOpportunities.filter(o => o.type === 'declining_position');
      // Should NOT flag because impressions < 50
      expect(declining).toHaveLength(0);
    });

    it('should detect declining position with exactly 50 impressions', async () => {
      // Query with exactly 50 impressions - should be flagged
      const previousData = makeSnapshotData({
        queries: [
          {
            query: 'exact threshold',
            clicks: 2,
            impressions: 50,
            ctr: 0.04,
            position: 5,
            page: 'https://example.com/page',
          },
        ],
      });
      const currentData = makeSnapshotData({
        queries: [
          {
            query: 'exact threshold',
            clicks: 1,
            impressions: 50,
            ctr: 0.02,
            position: 15,
            page: 'https://example.com/page',
          },
        ],
      });
      const previousSnapshot = makeSnapshot(previousData);
      previousSnapshot.id = 'snap-prev-001';
      const currentSnapshot = makeSnapshot(currentData);

      const result = await service.analyzeSnapshot(
        currentSnapshot,
        [],
        'proj-001',
        'user-001',
        previousSnapshot
      );

      const declining = result.newOpportunities.filter(o => o.type === 'declining_position');
      expect(declining).toHaveLength(1);
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

  // ===========================================================================
  // Cannibalization Detection
  // ===========================================================================

  describe('cannibalization detection', () => {
    it('should detect cannibalization when 2+ pages rank for same query', async () => {
      const data = makeSnapshotData({
        queries: [
          // This aggregated query won't trigger cannibalization by itself
          {
            query: 'duplicate content',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 8,
            page: 'https://example.com/page1', // Just one page in aggregated
          },
        ],
        // But the queryPagePairs show the real picture
        queryPagePairs: [
          {
            query: 'duplicate content',
            page: 'https://example.com/page1',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 8,
          },
          {
            query: 'duplicate content',
            page: 'https://example.com/page2',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 12,
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.filter(o => o.type === 'cannibalization');
      expect(cannibalization).toHaveLength(1);
      expect(cannibalization[0].query).toBe('duplicate content');
    });

    it('should store competing page URLs in metrics', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'competing pages',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 5,
            page: 'https://example.com/page1',
          },
        ],
        queryPagePairs: [
          {
            query: 'competing pages',
            page: 'https://example.com/page1',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 5,
          },
          {
            query: 'competing pages',
            page: 'https://example.com/page2',
            clicks: 3,
            impressions: 30,
            ctr: 0.1,
            position: 15,
          },
          {
            query: 'competing pages',
            page: 'https://example.com/page3',
            clicks: 2,
            impressions: 20,
            ctr: 0.1,
            position: 18,
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.find(o => o.type === 'cannibalization');
      expect(cannibalization).toBeDefined();
      expect(cannibalization?.metrics.competingPages).toBeDefined();
      expect(cannibalization?.metrics.competingPages).toHaveLength(3);
      expect(cannibalization?.metrics.competingPages).toContain('https://example.com/page1');
      expect(cannibalization?.metrics.competingPages).toContain('https://example.com/page2');
      expect(cannibalization?.metrics.competingPages).toContain('https://example.com/page3');
    });

    it('should not flag single-page queries', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'single page query',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 8,
            page: 'https://example.com/page1',
          },
        ],
        queryPagePairs: [
          {
            query: 'single page query',
            page: 'https://example.com/page1',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 8,
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.filter(o => o.type === 'cannibalization');
      expect(cannibalization).toHaveLength(0);
    });

    it('should require minimum 30 impressions', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'low volume cannibalization',
            clicks: 2,
            impressions: 20,
            ctr: 0.1,
            position: 8,
            page: 'https://example.com/page1',
          },
        ],
        queryPagePairs: [
          {
            query: 'low volume cannibalization',
            page: 'https://example.com/page1',
            clicks: 1,
            impressions: 10,
            ctr: 0.1,
            position: 8,
          },
          {
            query: 'low volume cannibalization',
            page: 'https://example.com/page2',
            clicks: 1,
            impressions: 10,
            ctr: 0.1,
            position: 15,
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.filter(o => o.type === 'cannibalization');
      // Total impressions is 20, which is below the 30 minimum
      expect(cannibalization).toHaveLength(0);
    });

    it('should classify cannibalization as technical category', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'cannibalization test',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 8,
            page: 'https://example.com/page1',
          },
        ],
        queryPagePairs: [
          {
            query: 'cannibalization test',
            page: 'https://example.com/page1',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 8,
          },
          {
            query: 'cannibalization test',
            page: 'https://example.com/page2',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 15,
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.find(o => o.type === 'cannibalization');
      expect(cannibalization).toBeDefined();
      expect(cannibalization?.category).toBe('technical');
    });

    it('should use metrics from the highest-ranking page', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'best page wins',
            clicks: 15,
            impressions: 150,
            ctr: 0.1,
            position: 5,
            page: 'https://example.com/best',
          },
        ],
        queryPagePairs: [
          {
            query: 'best page wins',
            page: 'https://example.com/best',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 5,
          },
          {
            query: 'best page wins',
            page: 'https://example.com/worse',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 15,
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.find(o => o.type === 'cannibalization');
      expect(cannibalization).toBeDefined();
      // Should use position 5 (the best/highest-ranking)
      expect(cannibalization?.metrics.position).toBe(5);
      // page_url should be the best-ranking page
      expect(cannibalization?.page_url).toBe('https://example.com/best');
    });

    it('should not flag pages outside position 20 threshold', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'one page too deep',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 8,
            page: 'https://example.com/page1',
          },
        ],
        queryPagePairs: [
          {
            query: 'one page too deep',
            page: 'https://example.com/page1',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 8,
          },
          {
            query: 'one page too deep',
            page: 'https://example.com/page2',
            clicks: 5,
            impressions: 50,
            ctr: 0.1,
            position: 25, // Outside threshold
          },
        ],
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.filter(o => o.type === 'cannibalization');
      // Only 1 page within threshold, so no cannibalization
      expect(cannibalization).toHaveLength(0);
    });

    it('should handle missing queryPagePairs gracefully', async () => {
      const data = makeSnapshotData({
        queries: [
          {
            query: 'no pairs data',
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 8,
            page: 'https://example.com/page1',
          },
        ],
        // No queryPagePairs provided
      });
      const snapshot = makeSnapshot(data);

      const result = await service.analyzeSnapshot(snapshot, [], 'proj-001', 'user-001');

      const cannibalization = result.newOpportunities.filter(o => o.type === 'cannibalization');
      // Should not crash and should not detect cannibalization without pairs data
      expect(cannibalization).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Topic Cluster Detection
  // ===========================================================================

  describe('topic_cluster detection', () => {
    beforeEach(() => {
      // Reset mock implementations
      mockIsConfigured.mockReturnValue(true);
      mockGenerateEmbedding.mockReset();
      mockCalculateCosineSimilarity.mockReset();
    });

    it('should cluster queries with cosine similarity > 0.75', async () => {
      // Create embeddings for 4 similar queries
      // Query A, B, C are similar (high similarity), D is different
      const embeddingA = [1, 0, 0];
      const embeddingB = [0.95, 0.1, 0]; // Similar to A (cosine ~0.99)
      const embeddingC = [0.9, 0.15, 0]; // Similar to A and B
      const embeddingD = [0, 0, 1]; // Orthogonal - very different

      // Setup embeddings
      mockGenerateEmbedding
        .mockResolvedValueOnce(embeddingA) // "coffee beans"
        .mockResolvedValueOnce(embeddingB) // "coffee beans online"
        .mockResolvedValueOnce(embeddingC) // "buy coffee beans"
        .mockResolvedValueOnce(embeddingD); // "tea leaves"

      // Setup similarity calculations
      mockCalculateCosineSimilarity.mockImplementation((a: number[], b: number[]) => {
        // Simple dot product for our test vectors
        const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return magA && magB ? dot / (magA * magB) : 0;
      });

      const data = makeSnapshotData({
        queries: [
          { query: 'coffee beans', clicks: 10, impressions: 500, ctr: 0.02, position: 8 },
          { query: 'coffee beans online', clicks: 8, impressions: 300, ctr: 0.027, position: 10 },
          { query: 'buy coffee beans', clicks: 5, impressions: 200, ctr: 0.025, position: 12 },
          { query: 'tea leaves', clicks: 3, impressions: 100, ctr: 0.03, position: 15 },
        ],
      });

      const result = await service.detectTopicClusters(data);

      // Should find one cluster with 3 queries (coffee-related)
      expect(result.length).toBe(1);
      expect(result[0].type).toBe('topic_cluster');
      expect(result[0].query).toBe('coffee beans'); // Highest impressions = hub
      expect(result[0].metrics.relatedQueries).toContain('coffee beans online');
      expect(result[0].metrics.relatedQueries).toContain('buy coffee beans');
    });

    it('should select highest-impression query as hub', async () => {
      mockGenerateEmbedding.mockResolvedValue([1, 0, 0]);
      mockCalculateCosineSimilarity.mockReturnValue(0.9);

      const data = makeSnapshotData({
        queries: [
          { query: 'low impression', clicks: 2, impressions: 100, ctr: 0.02, position: 10 },
          { query: 'high impression', clicks: 20, impressions: 1000, ctr: 0.02, position: 8 },
          { query: 'medium impression', clicks: 5, impressions: 300, ctr: 0.017, position: 12 },
        ],
      });

      const result = await service.detectTopicClusters(data);

      expect(result.length).toBe(1);
      expect(result[0].query).toBe('high impression');
    });

    it('should store related queries in opportunity metrics', async () => {
      mockGenerateEmbedding.mockResolvedValue([1, 0, 0]);
      mockCalculateCosineSimilarity.mockReturnValue(0.85);

      const data = makeSnapshotData({
        queries: [
          { query: 'hub query', clicks: 10, impressions: 500, ctr: 0.02, position: 8 },
          { query: 'related 1', clicks: 5, impressions: 200, ctr: 0.025, position: 10 },
          { query: 'related 2', clicks: 3, impressions: 150, ctr: 0.02, position: 12 },
        ],
      });

      const result = await service.detectTopicClusters(data);

      expect(result[0].metrics.relatedQueries).toBeDefined();
      expect(result[0].metrics.relatedQueries).toHaveLength(2);
      expect(result[0].metrics.relatedQueries).toContain('related 1');
      expect(result[0].metrics.relatedQueries).toContain('related 2');
    });

    it('should not create cluster with fewer than 3 queries', async () => {
      mockGenerateEmbedding.mockResolvedValue([1, 0, 0]);
      mockCalculateCosineSimilarity.mockReturnValue(0.9);

      const data = makeSnapshotData({
        queries: [
          { query: 'query 1', clicks: 5, impressions: 100, ctr: 0.05, position: 10 },
          { query: 'query 2', clicks: 3, impressions: 80, ctr: 0.0375, position: 12 },
          // Only 2 queries - below minClusterSize of 3
        ],
      });

      const result = await service.detectTopicClusters(data);

      expect(result).toHaveLength(0);
    });

    it('should cap clusters at maxClusters limit', async () => {
      mockGenerateEmbedding.mockResolvedValue([1, 0, 0]);
      mockCalculateCosineSimilarity.mockImplementation((_a: number[], _b: number[]) => {
        // Return moderate similarity to create a single cluster
        return 0.8;
      });

      // Create 15 queries - would result in 1 big cluster
      const queries = [];
      for (let i = 0; i < 15; i++) {
        queries.push({
          query: `query ${i}`,
          clicks: 5 + i,
          impressions: 100 + i * 50,
          ctr: 0.02,
          position: 10 + i,
        });
      }

      const data = makeSnapshotData({ queries });

      const result = await service.detectTopicClusters(data);

      // Should be capped at 10 (maxClusters config)
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should skip cluster detection when embeddings service not configured', async () => {
      mockIsConfigured.mockReturnValue(false);

      const data = makeSnapshotData({
        queries: [
          { query: 'query 1', clicks: 5, impressions: 100, ctr: 0.05, position: 10 },
          { query: 'query 2', clicks: 3, impressions: 80, ctr: 0.0375, position: 12 },
          { query: 'query 3', clicks: 2, impressions: 60, ctr: 0.033, position: 14 },
        ],
      });

      const result = await service.detectTopicClusters(data);

      expect(result).toHaveLength(0);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it('should require minimum impressions per query for clustering', async () => {
      mockGenerateEmbedding.mockResolvedValue([1, 0, 0]);
      mockCalculateCosineSimilarity.mockReturnValue(0.9);

      const data = makeSnapshotData({
        queries: [
          // These queries have < 10 impressions (minQueryImpressions) and should be filtered out
          { query: 'low imp 1', clicks: 0, impressions: 5, ctr: 0, position: 10 },
          { query: 'low imp 2', clicks: 0, impressions: 3, ctr: 0, position: 12 },
          { query: 'low imp 3', clicks: 0, impressions: 8, ctr: 0, position: 14 },
        ],
      });

      const result = await service.detectTopicClusters(data);

      // No queries pass the minQueryImpressions threshold
      expect(result).toHaveLength(0);
    });

    it('should require minimum total impressions for cluster', async () => {
      mockGenerateEmbedding.mockResolvedValue([1, 0, 0]);
      mockCalculateCosineSimilarity.mockReturnValue(0.9);

      const data = makeSnapshotData({
        queries: [
          // Each query has just enough impressions (10), but total is 30 < minTotalImpressions (200)
          { query: 'query 1', clicks: 0, impressions: 10, ctr: 0, position: 10 },
          { query: 'query 2', clicks: 0, impressions: 10, ctr: 0, position: 12 },
          { query: 'query 3', clicks: 0, impressions: 10, ctr: 0, position: 14 },
        ],
      });

      const result = await service.detectTopicClusters(data);

      // Total impressions (30) is below minTotalImpressions (200)
      expect(result).toHaveLength(0);
    });
  });
});
