/**
 * Opportunity Analysis Service
 * AI-powered pipeline that detects SEO opportunities from GSC snapshot data.
 *
 * Flow:
 * 1. Rule-based detection (fast, CPU-light)
 * 2. AI enrichment via OpenRouter (titles + descriptions)
 * 3. Priority scoring
 * 4. Merge with existing opportunities (deduplicate)
 */

import type {
  IOpportunity,
  IOpportunityMetrics,
  OpportunityType,
  OpportunityCategory,
  OpportunityImpact,
  IGscSnapshot,
  IGscSnapshotData,
  IGscQueryRow,
  IGscQueryPagePair,
} from '@shared/types/opportunity.types';
import {
  OPPORTUNITY_THRESHOLDS,
  PRIORITY_WEIGHTS,
  TYPE_PRIORITY_BONUS,
  ANALYSIS_PROMPT,
  getExpectedCtrForPosition,
} from '@shared/config/opportunity.config';
import { OpenRouterService } from '@server/services/openrouter.service';
import { openaiEmbeddingsService } from '@server/services/openai-embeddings.service';

// =============================================================================
// Internal Types
// =============================================================================

/** Raw opportunity detected by rule-based logic, before AI enrichment */
interface IRawOpportunity {
  type: OpportunityType;
  query: string | null;
  page_url: string | null;
  metrics: IOpportunityMetrics;
}

/** AI enrichment result for a single opportunity */
interface IAiEnrichment {
  index: number;
  title: string;
  description: string;
  category: OpportunityCategory;
  estimated_impact: OpportunityImpact;
}

/** Query with embedding for clustering */
interface IQueryWithEmbedding {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  embedding: number[];
}

/** Cluster of similar queries */
interface IQueryCluster {
  hubQuery: string;
  relatedQueries: string[];
  totalImpressions: number;
  avgPosition: number;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Analyzes GSC snapshot data to detect and prioritize SEO opportunities.
 * Uses a two-stage pipeline: rule-based detection + AI enrichment.
 */
export class OpportunityAnalysisService {
  constructor(private readonly openRouterService: OpenRouterService) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Main entry point. Analyzes a GSC snapshot and returns new/updated opportunities.
   *
   * @param snapshot - The GSC data snapshot to analyze
   * @param existingOpportunities - Current opportunities for deduplication
   * @param projectId - The project these opportunities belong to
   * @param userId - The user who owns the project
   * @param previousSnapshot - Optional previous snapshot for declining position detection
   * @returns Array of opportunities ready for DB upsert
   */
  async analyzeSnapshot(
    snapshot: IGscSnapshot,
    existingOpportunities: IOpportunity[],
    projectId: string,
    userId: string,
    previousSnapshot?: IGscSnapshot
  ): Promise<{ newOpportunities: IOpportunity[]; updatedOpportunities: IOpportunity[] }> {
    console.log('[OpportunityAnalysis] Starting analysis for project:', projectId);

    // Step 1: Rule-based detection
    const rawOpportunities = this.detectOpportunities(snapshot.data, previousSnapshot?.data);
    console.log('[OpportunityAnalysis] Detected', rawOpportunities.length, 'raw opportunities');

    // Step 2: Topic cluster detection (uses embeddings)
    try {
      const clusterOpportunities = await this.detectTopicClusters(snapshot.data);
      console.log('[OpportunityAnalysis] Detected', clusterOpportunities.length, 'topic clusters');
      rawOpportunities.push(...clusterOpportunities);
    } catch (error) {
      console.error('[OpportunityAnalysis] Topic cluster detection failed:', error);
      // Continue without clusters - don't fail the whole analysis
    }

    if (rawOpportunities.length === 0) {
      console.log('[OpportunityAnalysis] No opportunities detected');
      return { newOpportunities: [], updatedOpportunities: [] };
    }

    // Step 3: AI enrichment (titles, descriptions, categories)
    const enrichments = await this.enrichWithAI(rawOpportunities);
    console.log('[OpportunityAnalysis] AI enriched', enrichments.length, 'opportunities');

    // Step 4: Build full opportunity objects with priority scores
    const now = new Date().toISOString();
    const fullOpportunities: IOpportunity[] = rawOpportunities.map((raw, index) => {
      const enrichment = enrichments.find(e => e.index === index);
      const priorityScore = this.calculatePriority(raw.type, raw.metrics);

      return {
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: userId,
        snapshot_id: snapshot.id,
        type: raw.type,
        category: enrichment?.category ?? this.inferCategory(raw.type),
        title: enrichment?.title ?? this.fallbackTitle(raw.type, raw.query),
        description: enrichment?.description ?? this.fallbackDescription(raw.type, raw.query),
        query: raw.query,
        page_url: raw.page_url,
        metrics: raw.metrics,
        priority_score: priorityScore,
        estimated_impact: enrichment?.estimated_impact ?? this.inferImpact(priorityScore),
        status: 'open' as const,
        action_type: null,
        action_ref_id: null,
        created_at: now,
        updated_at: now,
      };
    });

    // Step 5: Merge with existing (deduplicate by query + type)
    const { newOpportunities, updatedOpportunities } = this.mergeWithExisting(
      fullOpportunities,
      existingOpportunities
    );

    console.log(
      '[OpportunityAnalysis] Result:',
      newOpportunities.length,
      'new,',
      updatedOpportunities.length,
      'updated'
    );

    return { newOpportunities, updatedOpportunities };
  }

  // ===========================================================================
  // Rule-Based Detection
  // ===========================================================================

  /**
   * Detect opportunities from GSC snapshot data using configurable thresholds.
   * Runs entirely on CPU — no external calls.
   *
   * @param data - Current snapshot data
   * @param previousData - Optional previous snapshot data for declining position detection
   */
  private detectOpportunities(
    data: IGscSnapshotData,
    previousData?: IGscSnapshotData
  ): IRawOpportunity[] {
    const opportunities: IRawOpportunity[] = [];
    const { queries } = data;

    if (!queries || queries.length === 0) {
      return opportunities;
    }

    // Build lookup map from previous snapshot for declining position detection
    const previousPositionMap = this.buildPreviousPositionMap(previousData);

    for (const row of queries) {
      // Content Gap: impressions but no page — highest specificity (no page + no clicks)
      // Must be checked before low_ctr to avoid false classification
      if (this.isContentGap(row)) {
        opportunities.push({
          type: 'content_gap',
          query: row.query,
          page_url: null,
          metrics: this.extractMetrics(row),
        });
        continue; // Each query gets one primary classification
      }

      // Low Hanging Fruit: position 8-20 with decent impressions
      if (this.isLowHangingFruit(row)) {
        opportunities.push({
          type: 'low_hanging_fruit',
          query: row.query,
          page_url: row.page ?? null,
          metrics: this.extractMetrics(row),
        });
        continue;
      }

      // Low CTR: CTR significantly below expected for position
      if (this.isLowCtr(row)) {
        opportunities.push({
          type: 'low_ctr',
          query: row.query,
          page_url: row.page ?? null,
          metrics: {
            ...this.extractMetrics(row),
            avgCtrForPosition: getExpectedCtrForPosition(row.position),
          },
        });
        continue;
      }

      // Thin Content: ranking but very low impressions
      if (this.isThinContent(row)) {
        opportunities.push({
          type: 'thin_content',
          query: row.query,
          page_url: row.page ?? null,
          metrics: this.extractMetrics(row),
        });
        continue;
      }
    }

    // Declining Position: detect queries that dropped significantly
    // Requires previous snapshot data for comparison
    if (previousData) {
      const decliningOpps = this.detectDecliningPositions(queries, previousPositionMap);
      opportunities.push(...decliningOpps);
    }

    // Cannibalization: detect multiple pages ranking for the same query
    // Requires queryPagePairs data from the snapshot
    const cannibalizationOpps = this.detectCannibalization(data);
    opportunities.push(...cannibalizationOpps);

    return opportunities;
  }

  /**
   * Build a lookup map of query -> position from previous snapshot data.
   * Used for declining position detection.
   */
  private buildPreviousPositionMap(previousData?: IGscSnapshotData): Map<string, number> {
    const map = new Map<string, number>();

    if (!previousData?.queries) {
      return map;
    }

    for (const row of previousData.queries) {
      map.set(row.query, row.position);
    }

    return map;
  }

  /**
   * Detect queries that have dropped significantly in ranking position.
   *
   * Criteria:
   * - Query exists in both current and previous snapshots
   * - Position drop >= positionDropThreshold (default: 5)
   * - Impressions >= 50 (meaningful volume)
   *
   * @param currentQueries - Queries from current snapshot
   * @param previousPositionMap - Map of query -> position from previous snapshot
   * @returns Array of declining_position opportunities
   */
  private detectDecliningPositions(
    currentQueries: IGscQueryRow[],
    previousPositionMap: Map<string, number>
  ): IRawOpportunity[] {
    const opportunities: IRawOpportunity[] = [];
    const { positionDropThreshold } = OPPORTUNITY_THRESHOLDS.DECLINING_POSITION;
    const minImpressions = 50;

    for (const row of currentQueries) {
      const previousPosition = previousPositionMap.get(row.query);

      // Skip queries that are brand new (not in previous snapshot)
      if (previousPosition === undefined) {
        continue;
      }

      // Skip queries without meaningful volume
      if (row.impressions < minImpressions) {
        continue;
      }

      const positionDrop = row.position - previousPosition;

      // Position increased (number got bigger) means ranking dropped
      // We only flag if the drop is >= threshold
      if (positionDrop >= positionDropThreshold) {
        opportunities.push({
          type: 'declining_position',
          query: row.query,
          page_url: row.page ?? null,
          metrics: {
            ...this.extractMetrics(row),
            previousPosition,
            positionChange: positionDrop,
          },
        });
      }
    }

    return opportunities;
  }

  /**
   * Detect keyword cannibalization - when multiple pages rank for the same query.
   *
   * Criteria:
   * - Query has 2+ different pages ranking
   * - All competing pages must have position <= maxPosition (default: 20)
   * - Query must have >= minImpressions (default: 30) total impressions
   * - Creates opportunity with type 'cannibalization'
   * - Category is 'technical' (requires page consolidation, not new content)
   *
   * @param data - GSC snapshot data containing queryPagePairs
   * @returns Array of cannibalization opportunities
   */
  private detectCannibalization(data: IGscSnapshotData): IRawOpportunity[] {
    const opportunities: IRawOpportunity[] = [];
    const { minPages, minImpressions, maxPosition } = OPPORTUNITY_THRESHOLDS.CANNIBALIZATION;

    // Need queryPagePairs data for this analysis
    const queryPagePairs = data.queryPagePairs;
    if (!queryPagePairs || queryPagePairs.length === 0) {
      return opportunities;
    }

    // Group pairs by query
    const queryToPagesMap = new Map<string, IGscQueryPagePair[]>();

    for (const pair of queryPagePairs) {
      const existing = queryToPagesMap.get(pair.query) ?? [];
      existing.push(pair);
      queryToPagesMap.set(pair.query, existing);
    }

    // Find queries with multiple pages
    for (const [query, pairs] of queryToPagesMap) {
      // Filter to pages within position threshold
      const pagesWithinThreshold = pairs.filter(p => p.position <= maxPosition);

      // Need at least minPages different pages
      if (pagesWithinThreshold.length < minPages) {
        continue;
      }

      // Get unique page URLs
      const uniquePages = [...new Set(pagesWithinThreshold.map(p => p.page))];

      if (uniquePages.length < minPages) {
        continue;
      }

      // Calculate total impressions for the query
      const totalImpressions = pairs.reduce((sum, p) => sum + p.impressions, 0);

      // Query must have meaningful volume
      if (totalImpressions < minImpressions) {
        continue;
      }

      // Find the highest-ranking page (lowest position number)
      const bestRankingPair = pagesWithinThreshold.reduce((best, current) =>
        current.position < best.position ? current : best
      );

      // Create opportunity
      opportunities.push({
        type: 'cannibalization',
        query,
        page_url: bestRankingPair.page, // Use the highest-ranking page
        metrics: {
          position: bestRankingPair.position,
          ctr: bestRankingPair.ctr,
          impressions: totalImpressions,
          clicks: pairs.reduce((sum, p) => sum + p.clicks, 0),
          competingPages: uniquePages,
        },
      });
    }

    return opportunities;
  }

  private isLowHangingFruit(row: IGscQueryRow): boolean {
    const { minPosition, maxPosition, minImpressions } = OPPORTUNITY_THRESHOLDS.LOW_HANGING_FRUIT;
    return (
      row.position >= minPosition &&
      row.position <= maxPosition &&
      row.impressions >= minImpressions
    );
  }

  private isLowCtr(row: IGscQueryRow): boolean {
    const expectedCtr = getExpectedCtrForPosition(row.position);
    const threshold = expectedCtr * OPPORTUNITY_THRESHOLDS.LOW_CTR.ctrPercentOfAvg;
    // Only flag if there are enough impressions to be meaningful
    return row.ctr < threshold && row.impressions >= 50;
  }

  private isContentGap(row: IGscQueryRow): boolean {
    return (
      row.impressions >= OPPORTUNITY_THRESHOLDS.CONTENT_GAP.minImpressions &&
      row.clicks === 0 &&
      !row.page
    );
  }

  private isThinContent(row: IGscQueryRow): boolean {
    return (
      row.impressions <= OPPORTUNITY_THRESHOLDS.THIN_CONTENT.maxImpressions &&
      row.position <= 20 &&
      !!row.page
    );
  }

  private extractMetrics(row: IGscQueryRow): IOpportunityMetrics {
    return {
      position: row.position,
      ctr: row.ctr,
      impressions: row.impressions,
      clicks: row.clicks,
    };
  }

  // ===========================================================================
  // Topic Cluster Detection
  // ===========================================================================

  /**
   * Detect topic clusters from GSC snapshot data using semantic embeddings.
   *
   * Algorithm:
   * 1. Filter queries with impressions > minQueryImpressions
   * 2. Generate embeddings for all queries
   * 3. Agglomerative clustering: group queries with pairwise cosine similarity > threshold
   * 4. Filter clusters with fewer than minClusterSize queries
   * 5. For each cluster, select highest-impression query as hub
   *
   * @param data - GSC snapshot data
   * @returns Array of raw topic_cluster opportunities
   */
  async detectTopicClusters(data: IGscSnapshotData): Promise<IRawOpportunity[]> {
    const { queries } = data;
    const config = OPPORTUNITY_THRESHOLDS.TOPIC_CLUSTER;

    if (!queries || queries.length < config.minClusterSize) {
      return [];
    }

    // Check if embeddings service is available
    if (!openaiEmbeddingsService.isConfigured()) {
      console.log('[OpportunityAnalysis] Embeddings service not configured, skipping cluster detection');
      return [];
    }

    // Step 1: Filter queries with sufficient impressions
    const candidateQueries = queries.filter(q => q.impressions >= config.minQueryImpressions);

    if (candidateQueries.length < config.minClusterSize) {
      return [];
    }

    console.log(
      `[OpportunityAnalysis] Generating embeddings for ${candidateQueries.length} candidate queries`
    );

    // Step 2: Generate embeddings for all candidate queries
    let queriesWithEmbeddings: IQueryWithEmbedding[];
    try {
      queriesWithEmbeddings = await this.generateQueryEmbeddings(candidateQueries);
    } catch (error) {
      console.error('[OpportunityAnalysis] Failed to generate embeddings:', error);
      return [];
    }

    // Step 3: Perform agglomerative clustering
    const clusters = this.clusterQueries(queriesWithEmbeddings, config.similarityThreshold);

    // Step 4: Filter clusters by size and total impressions
    const validClusters = clusters.filter(cluster => {
      const hasMinSize = cluster.relatedQueries.length + 1 >= config.minClusterSize;
      const hasMinImpressions = cluster.totalImpressions >= config.minTotalImpressions;
      return hasMinSize && hasMinImpressions;
    });

    // Step 5: Limit to maxClusters
    const limitedClusters = validClusters
      .sort((a, b) => b.totalImpressions - a.totalImpressions)
      .slice(0, config.maxClusters);

    console.log(
      `[OpportunityAnalysis] Found ${limitedClusters.length} valid topic clusters (of ${clusters.length} total)`
    );

    // Convert clusters to raw opportunities
    return limitedClusters.map(cluster => ({
      type: 'topic_cluster' as OpportunityType,
      query: cluster.hubQuery,
      page_url: null,
      metrics: {
        position: cluster.avgPosition,
        impressions: cluster.totalImpressions,
        totalClusterImpressions: cluster.totalImpressions,
        relatedQueries: cluster.relatedQueries,
      } as IOpportunityMetrics,
    }));
  }

  /**
   * Generate embeddings for a list of queries.
   * Batches requests to stay within API limits.
   */
  private async generateQueryEmbeddings(queries: IGscQueryRow[]): Promise<IQueryWithEmbedding[]> {
    const results: IQueryWithEmbedding[] = [];

    // Process in batches of 20 to avoid rate limits
    const batchSize = 20;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);

      // Generate embeddings in parallel for this batch
      const embeddings = await Promise.all(
        batch.map(async q => {
          try {
            const embedding = await openaiEmbeddingsService.generateEmbedding(q.query);
            return {
              query: q.query,
              impressions: q.impressions,
              clicks: q.clicks,
              ctr: q.ctr,
              position: q.position,
              embedding,
            };
          } catch {
            console.warn(`[OpportunityAnalysis] Failed to embed query: ${q.query}`);
            return null;
          }
        })
      );

      // Add successful embeddings to results
      for (const result of embeddings) {
        if (result) {
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Perform agglomerative clustering on queries based on cosine similarity.
   *
   * Uses a simple greedy approach:
   * 1. Start with each query as its own cluster
   * 2. Merge clusters if any pair has similarity > threshold
   * 3. Repeat until no more merges possible
   *
   * @param queries - Queries with embeddings
   * @param threshold - Minimum cosine similarity to merge
   * @returns Array of query clusters
   */
  private clusterQueries(queries: IQueryWithEmbedding[], threshold: number): IQueryCluster[] {
    if (queries.length === 0) {
      return [];
    }

    // Initialize: each query starts in its own cluster
    const clusters: Array<Set<number>> = queries.map((_, i) => new Set([i]));

    // Pre-compute similarity matrix
    const similarityMatrix = this.computeSimilarityMatrix(queries);

    let merged = true;
    while (merged) {
      merged = false;

      // Find the best pair to merge
      let bestI = -1;
      let bestJ = -1;
      let bestSimilarity = threshold;

      for (let i = 0; i < clusters.length; i++) {
        if (clusters[i].size === 0) continue;

        for (let j = i + 1; j < clusters.length; j++) {
          if (clusters[j].size === 0) continue;

          // Check if any pair between clusters has similarity >= threshold
          const maxSim = this.maxInterClusterSimilarity(
            clusters[i],
            clusters[j],
            similarityMatrix
          );

          if (maxSim >= bestSimilarity) {
            bestSimilarity = maxSim;
            bestI = i;
            bestJ = j;
            merged = true;
          }
        }
      }

      // Merge clusters
      if (merged && bestI >= 0 && bestJ >= 0) {
        // Merge j into i
        for (const idx of clusters[bestJ]) {
          clusters[bestI].add(idx);
        }
        clusters[bestJ].clear();
      }
    }

    // Convert sets to clusters
    const result: IQueryCluster[] = [];
    for (const clusterSet of clusters) {
      if (clusterSet.size < OPPORTUNITY_THRESHOLDS.TOPIC_CLUSTER.minClusterSize) {
        continue;
      }

      // Get all queries in cluster
      const clusterQueries = Array.from(clusterSet).map(i => queries[i]);

      // Select hub query (highest impressions)
      clusterQueries.sort((a, b) => b.impressions - a.impressions);
      const hubQuery = clusterQueries[0];
      const relatedQueries = clusterQueries.slice(1).map(q => q.query);

      // Calculate aggregate metrics
      const totalImpressions = clusterQueries.reduce((sum, q) => sum + q.impressions, 0);
      const avgPosition =
        clusterQueries.reduce((sum, q) => sum + q.position, 0) / clusterQueries.length;

      result.push({
        hubQuery: hubQuery.query,
        relatedQueries,
        totalImpressions,
        avgPosition,
      });
    }

    return result;
  }

  /**
   * Pre-compute pairwise cosine similarity matrix.
   */
  private computeSimilarityMatrix(queries: IQueryWithEmbedding[]): number[][] {
    const n = queries.length;
    const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1; // Self-similarity
      for (let j = i + 1; j < n; j++) {
        const sim = openaiEmbeddingsService.calculateCosineSimilarity(
          queries[i].embedding,
          queries[j].embedding
        );
        matrix[i][j] = sim;
        matrix[j][i] = sim;
      }
    }

    return matrix;
  }

  /**
   * Find maximum similarity between any pair of queries across two clusters.
   */
  private maxInterClusterSimilarity(
    clusterA: Set<number>,
    clusterB: Set<number>,
    similarityMatrix: number[][]
  ): number {
    let maxSim = 0;

    for (const i of clusterA) {
      for (const j of clusterB) {
        if (similarityMatrix[i][j] > maxSim) {
          maxSim = similarityMatrix[i][j];
        }
      }
    }

    return maxSim;
  }

  // ===========================================================================
  // AI Enrichment
  // ===========================================================================

  /**
   * Send summarized opportunity data to OpenRouter for title/description generation.
   * Sends only essential fields to keep payload small and stay within CPU limits.
   */
  private async enrichWithAI(rawOpportunities: IRawOpportunity[]): Promise<IAiEnrichment[]> {
    // Build a compact summary for the AI
    const summary = rawOpportunities.map((opp, index) => ({
      index,
      type: opp.type,
      query: opp.query,
      page_url: opp.page_url,
      metrics: {
        position: Math.round((opp.metrics.position ?? 0) * 10) / 10,
        ctr: Math.round((opp.metrics.ctr ?? 0) * 1000) / 1000,
        impressions: opp.metrics.impressions,
        clicks: opp.metrics.clicks,
      },
    }));

    try {
      const result = await this.openRouterService.chatCompletionWithRetry({
        model: '', // Uses default OPENROUTER_TEXT_MODEL
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          {
            role: 'user',
            content: JSON.stringify(summary),
          },
        ],
        maxTokens: 2000,
        temperature: 0.3,
        responseFormat: { type: 'json_object' },
      });

      const parsed = this.parseAiResponse(result.content, rawOpportunities.length);
      return parsed;
    } catch (error) {
      console.error('[OpportunityAnalysis] AI enrichment failed, using fallbacks:', error);
      // Return empty — fallback titles/descriptions will be used
      return [];
    }
  }

  /**
   * Parse the AI's JSON response, validating structure and bounds.
   */
  private parseAiResponse(content: string, expectedCount: number): IAiEnrichment[] {
    try {
      const parsed = JSON.parse(content);

      // The AI might return { opportunities: [...] } or just [...]
      const items: unknown[] = Array.isArray(parsed) ? parsed : (parsed.opportunities ?? []);

      return items
        .filter((item): item is IAiEnrichment => {
          if (!item || typeof item !== 'object') return false;
          const obj = item as Record<string, unknown>;
          return (
            typeof obj.index === 'number' &&
            obj.index >= 0 &&
            obj.index < expectedCount &&
            typeof obj.title === 'string' &&
            typeof obj.description === 'string'
          );
        })
        .map(item => ({
          index: item.index,
          title: item.title.slice(0, 200),
          description: item.description.slice(0, 500),
          category: this.isValidCategory(item.category) ? item.category : 'content',
          estimated_impact: this.isValidImpact(item.estimated_impact)
            ? item.estimated_impact
            : 'medium',
        }));
    } catch (error) {
      console.error('[OpportunityAnalysis] Failed to parse AI response:', error);
      return [];
    }
  }

  // ===========================================================================
  // Priority Scoring
  // ===========================================================================

  /**
   * Calculate a weighted priority score (0-100) for an opportunity.
   *
   * Components:
   * - impressions: normalized log scale (more impressions = higher priority)
   * - position: closer to top = higher score
   * - ctr_gap: bigger gap from expected = higher priority
   * - type_bonus: per-type base priority from config
   */
  calculatePriority(type: OpportunityType, metrics: IOpportunityMetrics): number {
    const impressions = metrics.impressions ?? 0;
    const position = metrics.position ?? 50;
    const ctr = metrics.ctr ?? 0;

    // Impressions component: log-normalized (0 to 100)
    const impressionsScore = Math.min(100, (Math.log10(Math.max(1, impressions)) / 5) * 100);

    // Position component: closer to 1 = higher score
    const positionScore = Math.max(0, 100 - (position - 1) * 2);

    // CTR gap component: how far below expected
    const expectedCtr = getExpectedCtrForPosition(position);
    const ctrGap = expectedCtr > 0 ? Math.max(0, 1 - ctr / expectedCtr) : 0;
    const ctrGapScore = ctrGap * 100;

    // Type bonus from config
    const typeBonus = TYPE_PRIORITY_BONUS[type] ?? 50;

    // Weighted sum
    const score =
      impressionsScore * PRIORITY_WEIGHTS.impressions +
      positionScore * PRIORITY_WEIGHTS.position +
      ctrGapScore * PRIORITY_WEIGHTS.ctr_gap +
      typeBonus * PRIORITY_WEIGHTS.type_bonus;

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  // ===========================================================================
  // Merge / Deduplication
  // ===========================================================================

  /**
   * Merge new opportunities with existing ones.
   * Deduplicates by query + type. Updates existing if metrics changed.
   * Only updates opportunities that are still "open" — does not touch in_progress/completed/dismissed.
   */
  private mergeWithExisting(
    newOpps: IOpportunity[],
    existing: IOpportunity[]
  ): { newOpportunities: IOpportunity[]; updatedOpportunities: IOpportunity[] } {
    const newOpportunities: IOpportunity[] = [];
    const updatedOpportunities: IOpportunity[] = [];

    // Build lookup from existing: key = "query|type"
    const existingMap = new Map<string, IOpportunity>();
    for (const opp of existing) {
      const key = `${opp.query ?? ''}|${opp.type}`;
      existingMap.set(key, opp);
    }

    for (const newOpp of newOpps) {
      const key = `${newOpp.query ?? ''}|${newOpp.type}`;
      const existingOpp = existingMap.get(key);

      if (!existingOpp) {
        // Truly new opportunity
        newOpportunities.push(newOpp);
      } else if (existingOpp.status === 'open') {
        // Update existing open opportunity with fresh metrics
        updatedOpportunities.push({
          ...existingOpp,
          snapshot_id: newOpp.snapshot_id,
          metrics: newOpp.metrics,
          priority_score: newOpp.priority_score,
          estimated_impact: newOpp.estimated_impact,
          title: newOpp.title,
          description: newOpp.description,
          updated_at: new Date().toISOString(),
        });
      }
      // Skip in_progress/completed/dismissed — don't overwrite user actions
    }

    return { newOpportunities, updatedOpportunities };
  }

  // ===========================================================================
  // Fallbacks & Helpers
  // ===========================================================================

  /** Infer category from opportunity type when AI is unavailable */
  private inferCategory(type: OpportunityType): OpportunityCategory {
    const contentTypes: OpportunityType[] = ['content_gap', 'low_hanging_fruit', 'topic_cluster'];
    return contentTypes.includes(type) ? 'content' : 'technical';
  }

  /** Infer impact level from priority score when AI is unavailable */
  private inferImpact(priorityScore: number): OpportunityImpact {
    if (priorityScore >= 70) return 'high';
    if (priorityScore >= 40) return 'medium';
    return 'low';
  }

  /** Generate a fallback title when AI enrichment fails */
  private fallbackTitle(type: OpportunityType, query: string | null): string {
    const queryText = query ? `"${query}"` : 'your content';
    const titles: Record<OpportunityType, string> = {
      content_gap: `Create article targeting ${queryText}`,
      low_hanging_fruit: `Optimize content for ${queryText}`,
      low_ctr: `Improve CTR for ${queryText}`,
      declining_position: `Refresh declining content for ${queryText}`,
      thin_content: `Expand thin content for ${queryText}`,
      cannibalization: `Fix keyword cannibalization for ${queryText}`,
      topic_cluster: `Build topic cluster around ${queryText}`,
    };
    return titles[type].slice(0, 200);
  }

  /** Generate a fallback description when AI enrichment fails */
  private fallbackDescription(type: OpportunityType, query: string | null): string {
    const queryText = query ? `"${query}"` : 'this topic';
    const descriptions: Record<OpportunityType, string> = {
      content_gap: `There is search demand for ${queryText} but no content on your site addresses it. Create a new article to capture this traffic.`,
      low_hanging_fruit: `Your content for ${queryText} is ranking on the second page. With targeted optimization, you could move it into the top results.`,
      low_ctr: `Your page for ${queryText} gets impressions but few clicks. Improving the title tag and meta description could significantly increase traffic.`,
      declining_position: `Rankings for ${queryText} have dropped significantly. Refreshing the content with updated information may help recover positions.`,
      thin_content: `Your page for ${queryText} ranks but gets very few impressions. Expanding the content with more depth and related subtopics could improve visibility.`,
      cannibalization: `Multiple pages are competing for ${queryText}. Consolidating them into a single authoritative page would improve rankings.`,
      topic_cluster: `There are several related queries around ${queryText} that could be addressed with a content hub strategy.`,
    };
    return descriptions[type];
  }

  private isValidCategory(value: unknown): value is OpportunityCategory {
    return value === 'content' || value === 'technical';
  }

  private isValidImpact(value: unknown): value is OpportunityImpact {
    return value === 'high' || value === 'medium' || value === 'low';
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const opportunityAnalysisService = new OpportunityAnalysisService(new OpenRouterService());
