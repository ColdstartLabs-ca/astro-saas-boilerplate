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
} from '@shared/types/opportunity.types';
import {
  OPPORTUNITY_THRESHOLDS,
  PRIORITY_WEIGHTS,
  TYPE_PRIORITY_BONUS,
  ANALYSIS_PROMPT,
  getExpectedCtrForPosition,
} from '@shared/config/opportunity.config';
import { OpenRouterService } from '@server/services/openrouter.service';

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
   * @returns Array of opportunities ready for DB upsert
   */
  async analyzeSnapshot(
    snapshot: IGscSnapshot,
    existingOpportunities: IOpportunity[],
    projectId: string,
    userId: string
  ): Promise<{ newOpportunities: IOpportunity[]; updatedOpportunities: IOpportunity[] }> {
    console.log('[OpportunityAnalysis] Starting analysis for project:', projectId);

    // Step 1: Rule-based detection
    const rawOpportunities = this.detectOpportunities(snapshot.data);
    console.log('[OpportunityAnalysis] Detected', rawOpportunities.length, 'raw opportunities');

    if (rawOpportunities.length === 0) {
      console.log('[OpportunityAnalysis] No opportunities detected');
      return { newOpportunities: [], updatedOpportunities: [] };
    }

    // Step 2: AI enrichment (titles, descriptions, categories)
    const enrichments = await this.enrichWithAI(rawOpportunities);
    console.log('[OpportunityAnalysis] AI enriched', enrichments.length, 'opportunities');

    // Step 3: Build full opportunity objects with priority scores
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

    // Step 4: Merge with existing (deduplicate by query + type)
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
   */
  private detectOpportunities(data: IGscSnapshotData): IRawOpportunity[] {
    const opportunities: IRawOpportunity[] = [];
    const { queries } = data;

    if (!queries || queries.length === 0) {
      return opportunities;
    }

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

    // Declining Position: only if previousPosition data is available in metrics
    // (This would come from comparing two snapshots — future enhancement)

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
