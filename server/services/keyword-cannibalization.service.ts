/**
 * Keyword Cannibalization Service
 *
 * Detects when new keywords overlap with:
 * 1. User's existing published blog pages (LLM + sitemap_pages) — Layer 1
 * 2. Other campaign keywords in the same project (embeddings + pgvector) — Layer 2
 *
 * Also provides GSC fallback suggestions when all keywords are covered.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { OpenRouterService } from './openrouter.service';
import { openaiEmbeddingsService } from './openai-embeddings.service';
import { gscService } from './gsc.service';
import { serverEnv } from '@shared/config/env';
import type { IKeywordCoverage, ICannibalizationWarning } from '@shared/types/campaign.types';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_THRESHOLD = 0.85;
const MAX_SIMILAR_PER_KEYWORD = 3;
const EMBEDDING_BATCH_SIZE = 100;
const SITEMAP_CHUNK_SIZE = 200; // max sitemap pages per LLM call
const GSC_DAYS_LOOKBACK = 28;
const GSC_MIN_IMPRESSIONS = 10;
const GSC_MAX_SUGGESTIONS = 10;

// =============================================================================
// Internal Types
// =============================================================================

interface ICannibalizationCheckResult {
  alreadyCovered: IKeywordCoverage[];
  uncovered: string[];
  warnings: ICannibalizationWarning[];
  suggestedKeywords?: string[];
  checked: boolean;
  skipReason?: string;
}

interface ISitemapCoverageResult {
  covered: IKeywordCoverage[];
  uncovered: string[];
}

interface ILLMCoverageResponse {
  covered: Array<{
    keyword: string;
    coveredByUrl: string;
    coveredByTitle: string | null;
    reason: string;
  }>;
  uncovered: string[];
}

// =============================================================================
// KeywordCannibalizationService
// =============================================================================

export class KeywordCannibalizationService {
  private readonly openRouter = new OpenRouterService();

  private normalizeKeyword(kw: string): string {
    return kw.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Full cannibalization check — Layer 1 (LLM sitemap) + Layer 2 (embeddings) + GSC fallback
   * Called at keyword addition time.
   */
  async checkCannibalization(
    projectId: string,
    campaignId: string,
    newKeywords: string[],
    userId: string
  ): Promise<ICannibalizationCheckResult> {
    if (newKeywords.length === 0) {
      return { alreadyCovered: [], uncovered: [], warnings: [], checked: true };
    }

    // ----- Layer 1: LLM Sitemap Analysis -----
    let sitemapResult: ISitemapCoverageResult = { covered: [], uncovered: newKeywords };
    try {
      sitemapResult = await this.checkSitemapCoverage(projectId, newKeywords);
    } catch (err) {
      console.warn('[KeywordCannibalizationService] Sitemap coverage check failed:', err);
      // fail-open: treat all as uncovered
    }

    const { covered: alreadyCovered, uncovered } = sitemapResult;

    // ----- Layer 2: Cross-Campaign Embedding Check -----
    const warnings: ICannibalizationWarning[] = [];
    if (uncovered.length > 0 && openaiEmbeddingsService.isConfigured()) {
      try {
        const embeddingWarnings = await this.checkCrossCampaignOverlap(
          projectId,
          campaignId,
          uncovered
        );
        warnings.push(...embeddingWarnings);
      } catch (err) {
        console.warn('[KeywordCannibalizationService] Cross-campaign check failed:', err);
      }
    }

    // ----- GSC Fallback (only when ALL keywords were covered) -----
    let suggestedKeywords: string[] | undefined;
    if (alreadyCovered.length === newKeywords.length && uncovered.length === 0) {
      try {
        suggestedKeywords = await this.fetchGscSuggestions(projectId, userId);
      } catch (err) {
        console.warn('[KeywordCannibalizationService] GSC suggestions failed:', err);
      }
    }

    return { alreadyCovered, uncovered, warnings, suggestedKeywords, checked: true };
  }

  /**
   * Simplified sitemap-only check — used at plan time (no embeddings, no GSC)
   */
  async checkSitemapCoverage(
    projectId: string,
    keywords: string[]
  ): Promise<ISitemapCoverageResult> {
    if (keywords.length === 0) {
      return { covered: [], uncovered: [] };
    }

    // Fetch sitemap pages for this project
    const { data: sitemapPages, error } = await supabaseAdmin
      .from('sitemap_pages')
      .select('url, title')
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to fetch sitemap pages: ${error.message}`);
    }

    if (!sitemapPages || sitemapPages.length === 0) {
      // No sitemap data — can't check, treat all as uncovered
      return { covered: [], uncovered: keywords };
    }

    // Chunk sitemap pages to stay within LLM context limits
    const allCovered: IKeywordCoverage[] = [];
    let remainingKeywords = [...keywords];

    for (let i = 0; i < sitemapPages.length; i += SITEMAP_CHUNK_SIZE) {
      if (remainingKeywords.length === 0) break;

      const chunk = sitemapPages.slice(i, i + SITEMAP_CHUNK_SIZE);
      try {
        const result = await this.analyzeSitemapChunk(chunk, remainingKeywords);
        allCovered.push(...result.covered);
        // Remove covered keywords from remaining (no need to re-check in next chunk)
        const coveredSet = new Set(result.covered.map(c => this.normalizeKeyword(c.keyword)));
        remainingKeywords = remainingKeywords.filter(
          kw => !coveredSet.has(this.normalizeKeyword(kw))
        );
      } catch (err) {
        console.warn('[KeywordCannibalizationService] LLM chunk analysis failed:', err);
        // fail-open: keep remaining keywords as uncovered
      }
    }

    return { covered: allCovered, uncovered: remainingKeywords };
  }

  /**
   * Call OpenRouter LLM to analyze a chunk of sitemap pages against keywords
   */
  private async analyzeSitemapChunk(
    pages: Array<{ url: string; title: string | null }>,
    keywords: string[]
  ): Promise<ISitemapCoverageResult> {
    const model = serverEnv.OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini';

    const sitemapText = pages
      .map(p => `- URL: ${p.url}${p.title ? ` | Title: ${p.title}` : ''}`)
      .join('\n');

    const keywordText = keywords.map(k => `- "${k}"`).join('\n');

    const systemPrompt = `You are a keyword cannibalization analyst for SEO. Given a list of existing published blog pages (URL + title) and a list of new target keywords, determine which keywords are already covered by existing content.

A keyword is "covered" if an existing page targets the same search intent — even if the wording differs. For example, "best coffee makers" is covered by a page titled "Top Rated Coffee Machines Guide".

Respond ONLY with valid JSON matching this exact shape:
{
  "covered": [
    { "keyword": "...", "coveredByUrl": "...", "coveredByTitle": "..." or null, "reason": "..." }
  ],
  "uncovered": ["keyword1", "keyword2"]
}

Every input keyword must appear in exactly one of: covered or uncovered.`;

    const userPrompt = `Existing pages:\n${sitemapText}\n\nNew keywords:\n${keywordText}`;

    const result = await this.openRouter.chatCompletionWithRetry({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
      maxTokens: 2000,
      temperature: 0,
    });

    let parsed: ILLMCoverageResponse;
    try {
      parsed = JSON.parse(result.content) as ILLMCoverageResponse;
    } catch {
      console.warn(
        '[KeywordCannibalizationService] Failed to parse LLM response, treating all as uncovered'
      );
      return { covered: [], uncovered: keywords };
    }

    return {
      covered: (parsed.covered ?? []).map(c => ({
        keyword: c.keyword,
        coveredByUrl: c.coveredByUrl,
        coveredByTitle: c.coveredByTitle ?? null,
        reason: c.reason,
      })),
      uncovered: parsed.uncovered ?? keywords,
    };
  }

  /**
   * Layer 2: Cross-campaign embedding check using pgvector RPC
   */
  private async checkCrossCampaignOverlap(
    projectId: string,
    campaignId: string,
    keywords: string[]
  ): Promise<ICannibalizationWarning[]> {
    const warnings: ICannibalizationWarning[] = [];

    // Generate embeddings in batches
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < keywords.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = keywords.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchEmbeddings = await openaiEmbeddingsService.generateBatchEmbeddings(batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    // Within-batch pairwise check
    for (let i = 0; i < keywords.length; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        const similarity = openaiEmbeddingsService.calculateCosineSimilarity(
          allEmbeddings[i],
          allEmbeddings[j]
        );
        if (similarity >= DEFAULT_THRESHOLD) {
          warnings.push({
            newKeyword: keywords[i],
            existingKeyword: keywords[j],
            existingCampaignName: '(current batch)',
            existingCampaignId: campaignId,
            similarity,
            similarityPercent: Math.round(similarity * 100),
          });
        }
      }
    }

    // Cross-campaign RPC check per keyword
    for (let i = 0; i < keywords.length; i++) {
      const embedding = allEmbeddings[i];
      const vectorStr = `[${embedding.join(',')}]`;

      try {
        const { data: similar, error } = await supabaseAdmin.rpc(
          'find_similar_keywords_in_project',
          {
            p_project_id: projectId,
            p_exclude_campaign_id: campaignId,
            p_embedding: vectorStr,
            p_threshold: DEFAULT_THRESHOLD,
            p_limit: MAX_SIMILAR_PER_KEYWORD,
          }
        );

        if (error) {
          console.warn(
            '[KeywordCannibalizationService] RPC error for keyword:',
            keywords[i],
            error
          );
          continue;
        }

        for (const match of similar ?? []) {
          warnings.push({
            newKeyword: keywords[i],
            existingKeyword: match.keyword,
            existingCampaignName: match.campaign_name,
            existingCampaignId: match.campaign_id,
            similarity: match.similarity,
            similarityPercent: Math.round(match.similarity * 100),
          });
        }
      } catch (err) {
        console.warn('[KeywordCannibalizationService] RPC call failed:', err);
      }
    }

    return warnings;
  }

  /**
   * Fetch GSC keyword suggestions as fallback when all keywords are covered.
   * Returns content gap queries (impressions but no published page).
   */
  private async fetchGscSuggestions(
    projectId: string,
    _userId: string
  ): Promise<string[]> {
    // Look up active GSC connection for this project
    const { data: connection } = await supabaseAdmin
      .from('gsc_connections')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .single();

    if (!connection || !connection.site_url) {
      return [];
    }

    const accessToken = await gscService.getValidAccessToken(connection);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - GSC_DAYS_LOOKBACK);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const analytics = await gscService.getSearchAnalytics(
      accessToken,
      connection.site_url,
      formatDate(startDate),
      formatDate(endDate),
      {
        dimensions: ['query'],
        rowLimit: 100,
      }
    );

    if (!analytics.rows) return [];

    // Fetch existing keywords in the project to avoid suggesting already-tracked keywords
    const { data: existingKeywords } = await supabaseAdmin
      .from('keywords')
      .select('keyword_normalized, campaign_id, campaigns!inner(project_id)')
      .eq('campaigns.project_id', projectId);

    const existingNormalized = new Set(
      (existingKeywords ?? []).map(k => this.normalizeKeyword(k.keyword_normalized))
    );

    // Filter: impressions >= threshold and not already a tracked keyword
    const suggestions = analytics.rows
      .filter(row => {
        const query = row.keys[0];
        if (!query) return false;
        if (row.impressions < GSC_MIN_IMPRESSIONS) return false;
        if (existingNormalized.has(this.normalizeKeyword(query))) return false;
        return true;
      })
      .map(row => row.keys[0])
      .slice(0, GSC_MAX_SUGGESTIONS);

    return suggestions;
  }

  /**
   * Fire-and-forget: store keyword embeddings on inserted keyword rows.
   * Called after keyword insertion — failures are non-fatal.
   */
  async storeKeywordEmbeddings(keywordTexts: string[], campaignId: string): Promise<void> {
    if (!openaiEmbeddingsService.isConfigured() || keywordTexts.length === 0) {
      return;
    }

    const allEmbeddings: number[][] = [];
    for (let i = 0; i < keywordTexts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = keywordTexts.slice(i, i + EMBEDDING_BATCH_SIZE);
      try {
        const embeddings = await openaiEmbeddingsService.generateBatchEmbeddings(batch);
        allEmbeddings.push(...embeddings);
      } catch (err) {
        console.warn(
          '[KeywordCannibalizationService] Failed to generate embeddings for batch:',
          err
        );
        // Push empty arrays as placeholders so indexes align
        allEmbeddings.push(...batch.map(() => [] as number[]));
      }
    }

    for (let i = 0; i < keywordTexts.length; i++) {
      const embedding = allEmbeddings[i];
      if (!embedding || embedding.length === 0) continue;

      const vectorStr = `[${embedding.join(',')}]`;
      const normalized = this.normalizeKeyword(keywordTexts[i]);

      supabaseAdmin
        .from('keywords')
        .update({ keyword_embedding: vectorStr })
        .eq('campaign_id', campaignId)
        .eq('keyword_normalized', normalized)
        .then(({ error }) => {
          if (error) {
            console.warn(
              '[KeywordCannibalizationService] Failed to store embedding:',
              normalized,
              error
            );
          }
        });
    }
  }
}

// Export singleton instance
export const keywordCannibalizationService = new KeywordCannibalizationService();
