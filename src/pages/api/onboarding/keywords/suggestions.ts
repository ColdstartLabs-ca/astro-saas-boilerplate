/**
 * Onboarding Keyword Suggestions API Route
 * GET /api/onboarding/keywords/suggestions?projectId=xxx
 *
 * Uses connected GSC query data to generate starter campaign keywords via OpenRouter.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { gscService } from '@server/services/gsc.service';
import { OpenRouterService } from '@server/services/openrouter.service';
import { serverEnv } from '@shared/config/env';
import type { IGscConnection } from '@shared/types/opportunity.types';
import type { IOnboardingKeywordSuggestionsResponse } from '@shared/types/onboarding.types';
import { onboardingKeywordSuggestionsQuerySchema } from '@shared/validation/onboarding.schema';
import { withAuth, jsonResponse, errorResponse } from '../../_utils';

const LOOKBACK_DAYS = 90;
const LOOKBACK_DAYS_EXTENDED = 480;
const MAX_CONTEXT_QUERIES = 80;
const MAX_SUGGESTIONS = 40;
const MAX_KEYWORD_LENGTH = 200;
const HIGH_ROW_LIMIT = 5000;
const URL_SEGMENT_STOPWORDS = new Set([
  'blog',
  'category',
  'categories',
  'tag',
  'tags',
  'author',
  'page',
  'posts',
  'post',
  'articles',
  'article',
  'news',
  'sitemap',
]);

interface IRawGscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface IAggregatedQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface IAiKeywordResponse {
  keywords?: unknown;
  suggestions?: unknown;
  data?: {
    keywords?: unknown;
    suggestions?: unknown;
  };
}

interface IProjectKeywordContext {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  description: string | null;
  language: string | null;
  country: string | null;
  sitemap_url: string | null;
  blog_url: string | null;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, ' ').trim();
}

function extractHost(domain: string | null): string {
  if (!domain) return '';

  try {
    const normalized = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
    return new URL(normalized).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return domain.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./, '');
  }
}

function dedupeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const raw of keywords) {
    const cleaned = sanitizeKeyword(raw);
    if (!cleaned || cleaned.length > MAX_KEYWORD_LENGTH) continue;

    const normalized = cleaned.toLowerCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    deduped.push(cleaned);
  }

  return deduped.slice(0, MAX_SUGGESTIONS);
}

function aggregateQueries(rows: IRawGscRow[]): IAggregatedQuery[] {
  const byQuery = new Map<string, { clicks: number; impressions: number; weightedPosition: number }>();

  for (const row of rows) {
    const query = (row.keys?.[0] ?? '').trim();
    if (!query) continue;

    const existing = byQuery.get(query) ?? { clicks: 0, impressions: 0, weightedPosition: 0 };
    const nextClicks = existing.clicks + row.clicks;
    const nextImpressions = existing.impressions + row.impressions;
    const nextWeightedPosition = existing.weightedPosition + row.position * row.impressions;

    byQuery.set(query, {
      clicks: nextClicks,
      impressions: nextImpressions,
      weightedPosition: nextWeightedPosition,
    });
  }

  return Array.from(byQuery.entries())
    .map(([query, value]) => ({
      query,
      clicks: value.clicks,
      impressions: value.impressions,
      ctr: value.impressions > 0 ? value.clicks / value.impressions : 0,
      position: value.impressions > 0 ? value.weightedPosition / value.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

function extractAiKeywordCandidates(payload: IAiKeywordResponse): unknown {
  if (Array.isArray(payload.keywords)) return payload.keywords;
  if (Array.isArray(payload.suggestions)) return payload.suggestions;
  if (payload.data) {
    if (Array.isArray(payload.data.keywords)) return payload.data.keywords;
    if (Array.isArray(payload.data.suggestions)) return payload.data.suggestions;
  }
  return [];
}

function parseAiKeywords(content: string): string[] {
  const rawCandidates = [content.trim(), content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '')];

  for (const raw of rawCandidates) {
    try {
      const parsed = JSON.parse(raw) as IAiKeywordResponse;
      const candidates = extractAiKeywordCandidates(parsed);
      if (!Array.isArray(candidates)) continue;

      const strings = candidates.map(item => String(item ?? '')).filter(Boolean);
      return dedupeKeywords(strings);
    } catch {
      // Try next parse strategy
    }
  }

  return [];
}

function buildFallbackKeywords(queries: IAggregatedQuery[]): string[] {
  return dedupeKeywords(queries.slice(0, MAX_SUGGESTIONS).map(row => row.query));
}

function buildSuggestionPrompt(context: IAggregatedQuery[]): string {
  return [
    'Generate SEO target keywords for a content campaign.',
    'Use the Google Search Console query metrics below.',
    'Return only valid JSON: {"keywords":["..."]}.',
    'Rules:',
    '- Return 25 to 40 keywords.',
    '- Include a mix of: proven queries, close variants, and long-tail expansions.',
    '- Keep each keyword concise and natural language.',
    '- Avoid duplicates and avoid pure brand navigation queries.',
    '',
    JSON.stringify(
      context.map(row => ({
        query: row.query,
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: Number(row.ctr.toFixed(4)),
        position: Number(row.position.toFixed(2)),
      }))
    ),
  ].join('\n');
}

function buildMetadataSeedKeywords(project: IProjectKeywordContext): string[] {
  const host = extractHost(project.domain);
  const hostTokens = host
    .split('.')
    .filter(Boolean)
    .filter(token => token.length > 2 && !['com', 'net', 'org', 'io', 'co', 'ai', 'app'].includes(token));

  const domainPhrase = hostTokens.join(' ').trim();
  const base = dedupeKeywords(
    [
      project.name,
      project.industry,
      domainPhrase,
      `${project.industry ?? ''} tips`,
      `${project.industry ?? ''} guide`,
      `${project.industry ?? ''} best practices`,
      `${project.industry ?? ''} strategy`,
      `${project.name ?? ''} alternatives`,
      `${project.name ?? ''} pricing`,
      `${project.name ?? ''} review`,
    ]
      .map(item => sanitizeKeyword(item ?? ''))
      .filter(Boolean)
  );

  return base;
}

function buildMetadataSuggestionPrompt(
  project: IProjectKeywordContext,
  seedKeywords: string[]
): string {
  const host = extractHost(project.domain);
  return [
    'Generate SEO target keywords for a content campaign using website metadata.',
    'Return only valid JSON: {"keywords":["..."]}.',
    'Rules:',
    '- Return 25 to 40 keywords.',
    '- Include commercial + informational + long-tail variants.',
    '- Keep keywords natural and concise.',
    '- Avoid duplicates.',
    '',
    `Website URL: ${project.domain ?? ''}`,
    `Website Host: ${host}`,
    `Project Name: ${project.name ?? ''}`,
    `Industry: ${project.industry ?? ''}`,
    `Description: ${project.description ?? ''}`,
    `Language: ${project.language ?? ''}`,
    `Country: ${project.country ?? ''}`,
    `Sitemap URL: ${project.sitemap_url ?? ''}`,
    `Blog URL: ${project.blog_url ?? ''}`,
    `Seed Keywords: ${JSON.stringify(seedKeywords)}`,
  ].join('\n');
}

async function suggestFromProjectMetadata(params: {
  project: IProjectKeywordContext;
  openRouter: OpenRouterService;
  preferredModel: string;
  emptyReason: 'no_gsc_connection' | 'no_selected_site' | 'no_query_data';
}): Promise<IOnboardingKeywordSuggestionsResponse> {
  const { project, openRouter, preferredModel, emptyReason } = params;
  const metadataFallbackKeywords = buildMetadataSeedKeywords(project);

  if (!openRouter.isConfigured()) {
    if (metadataFallbackKeywords.length > 0) {
      return {
        keywords: metadataFallbackKeywords,
        source: 'metadata_fallback',
        reason: 'ai_not_configured',
        model: null,
      };
    }
    return {
      keywords: [],
      source: 'none',
      reason: emptyReason,
      model: null,
    };
  }

  try {
    const aiResult = await openRouter.chatCompletionWithRetry({
      model: preferredModel,
      messages: [
        {
          role: 'system',
          content:
            'You are an SEO strategist. Output strictly valid JSON and follow the user format exactly.',
        },
        {
          role: 'user',
          content: buildMetadataSuggestionPrompt(project, metadataFallbackKeywords),
        },
      ],
      maxTokens: 1400,
      temperature: 0.35,
      responseFormat: { type: 'json_object' },
    });

    const aiKeywords = parseAiKeywords(aiResult.content);
    if (aiKeywords.length > 0) {
      return {
        keywords: aiKeywords,
        source: 'openrouter_metadata',
        reason: 'ok',
        model: aiResult.model,
      };
    }
  } catch (error) {
    console.error('[OnboardingKeywordSuggestions] metadata AI suggestion failed:', error);
  }

  if (metadataFallbackKeywords.length > 0) {
    return {
      keywords: metadataFallbackKeywords,
      source: 'metadata_fallback',
      reason: 'ai_failed',
      model: preferredModel,
    };
  }

  return {
    keywords: [],
    source: 'none',
    reason: emptyReason,
    model: preferredModel,
  };
}

function extractKeywordsFromPageUrl(pageUrl: string): string[] {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return [];
  }

  const segments = url.pathname
    .split('/')
    .map(segment => decodeURIComponent(segment).trim())
    .filter(Boolean)
    .slice(-3);

  const candidates: string[] = [];
  for (const segment of segments) {
    const cleaned = segment
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (!cleaned) continue;
    if (URL_SEGMENT_STOPWORDS.has(cleaned)) continue;
    if (/^\d+$/.test(cleaned)) continue;

    const wordCount = cleaned.split(' ').length;
    if (wordCount > 8) continue;
    if (cleaned.length > MAX_KEYWORD_LENGTH) continue;

    candidates.push(cleaned);
  }

  return dedupeKeywords(candidates);
}

function aggregatePageRowsToKeywordContext(rows: IRawGscRow[]): IAggregatedQuery[] {
  const byQuery = new Map<string, { clicks: number; impressions: number; weightedPosition: number }>();

  for (const row of rows) {
    const pageUrl = (row.keys?.[0] ?? '').trim();
    if (!pageUrl) continue;

    const candidates = extractKeywordsFromPageUrl(pageUrl);
    if (candidates.length === 0) continue;

    const perCandidateImpressions = row.impressions / candidates.length;
    const perCandidateClicks = row.clicks / candidates.length;

    for (const candidate of candidates) {
      const existing = byQuery.get(candidate) ?? { clicks: 0, impressions: 0, weightedPosition: 0 };
      const nextClicks = existing.clicks + perCandidateClicks;
      const nextImpressions = existing.impressions + perCandidateImpressions;
      const nextWeightedPosition = existing.weightedPosition + row.position * perCandidateImpressions;

      byQuery.set(candidate, {
        clicks: nextClicks,
        impressions: nextImpressions,
        weightedPosition: nextWeightedPosition,
      });
    }
  }

  return Array.from(byQuery.entries())
    .map(([query, value]) => ({
      query,
      clicks: Math.round(value.clicks),
      impressions: Math.round(value.impressions),
      ctr: value.impressions > 0 ? value.clicks / value.impressions : 0,
      position: value.impressions > 0 ? value.weightedPosition / value.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, MAX_SUGGESTIONS);
}

async function fetchKeywordContext(
  accessToken: string,
  siteUrl: string
): Promise<IAggregatedQuery[]> {
  const attempts: Array<{
    lookbackDays: number;
    dimensions: Array<'query' | 'page'> | ['query'];
  }> = [
    { lookbackDays: LOOKBACK_DAYS, dimensions: ['query'] },
    { lookbackDays: LOOKBACK_DAYS_EXTENDED, dimensions: ['query'] },
    { lookbackDays: LOOKBACK_DAYS_EXTENDED, dimensions: ['query', 'page'] },
  ];

  for (const attempt of attempts) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - attempt.lookbackDays);

    const analytics = await gscService.getSearchAnalytics(
      accessToken,
      siteUrl,
      formatDate(startDate),
      formatDate(endDate),
      {
        dimensions: attempt.dimensions,
        rowLimit: HIGH_ROW_LIMIT,
        searchType: 'web',
      }
    );

    const rows = (analytics.rows as IRawGscRow[] | undefined) ?? [];
    console.log(
      `[OnboardingKeywordSuggestions] analytics attempt lookback=${attempt.lookbackDays}d dims=${attempt.dimensions.join('+')} rows=${rows.length}`
    );

    if (rows.length > 0) {
      return aggregateQueries(rows);
    }
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - LOOKBACK_DAYS_EXTENDED);

  const pageAnalytics = await gscService.getSearchAnalytics(
    accessToken,
    siteUrl,
    formatDate(startDate),
    formatDate(endDate),
    {
      dimensions: ['page'],
      rowLimit: HIGH_ROW_LIMIT,
      searchType: 'web',
    }
  );

  const pageRows = (pageAnalytics.rows as IRawGscRow[] | undefined) ?? [];
  console.log(
    `[OnboardingKeywordSuggestions] analytics attempt lookback=${LOOKBACK_DAYS_EXTENDED}d dims=page rows=${pageRows.length}`
  );

  if (pageRows.length === 0) {
    return [];
  }

  const pageDerivedContext = aggregatePageRowsToKeywordContext(pageRows);
  console.log(
    `[OnboardingKeywordSuggestions] page-derived keyword context size=${pageDerivedContext.length}`
  );

  return pageDerivedContext;
}

export const GET = withAuth(async (userId, { url }) => {
  const params = onboardingKeywordSuggestionsQuerySchema.parse({
    projectId: url.searchParams.get('projectId'),
  });

  // Verify project ownership
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, name, domain, industry, description, language, country, sitemap_url, blog_url')
    .eq('id', params.projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return errorResponse('NOT_FOUND', 'Project not found or access denied', 404);
  }

  const projectContext = project as IProjectKeywordContext;
  const openRouter = new OpenRouterService();
  const preferredModel = serverEnv.OPENROUTER_DEFAULT_MODEL || serverEnv.OPENROUTER_TEXT_MODEL;

  // Find the latest active connection for this project
  const { data: connection, error: connectionError } = await supabaseAdmin
    .from('gsc_connections')
    .select('*')
    .eq('project_id', params.projectId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connectionError) {
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch GSC connection', 500);
  }

  if (!connection) {
    const response = await suggestFromProjectMetadata({
      project: projectContext,
      openRouter,
      preferredModel,
      emptyReason: 'no_gsc_connection',
    });
    return jsonResponse(response);
  }

  const gscConnection = connection as IGscConnection;

  if (!gscConnection.site_url) {
    const response = await suggestFromProjectMetadata({
      project: projectContext,
      openRouter,
      preferredModel,
      emptyReason: 'no_selected_site',
    });
    return jsonResponse(response);
  }

  const accessToken = await gscService.getValidAccessToken(gscConnection);
  const aggregatedQueries = await fetchKeywordContext(accessToken, gscConnection.site_url);

  if (aggregatedQueries.length === 0) {
    const response = await suggestFromProjectMetadata({
      project: projectContext,
      openRouter,
      preferredModel,
      emptyReason: 'no_query_data',
    });
    return jsonResponse(response);
  }

  const fallbackKeywords = buildFallbackKeywords(aggregatedQueries);

  if (!openRouter.isConfigured()) {
    const response: IOnboardingKeywordSuggestionsResponse = {
      keywords: fallbackKeywords,
      source: 'gsc_fallback',
      reason: 'ai_not_configured',
      model: null,
    };
    return jsonResponse(response);
  }

  try {
    const aiResult = await openRouter.chatCompletionWithRetry({
      model: preferredModel,
      messages: [
        {
          role: 'system',
          content:
            'You are an SEO strategist. Output strictly valid JSON and follow the user format exactly.',
        },
        {
          role: 'user',
          content: buildSuggestionPrompt(aggregatedQueries.slice(0, MAX_CONTEXT_QUERIES)),
        },
      ],
      maxTokens: 1400,
      temperature: 0.25,
      responseFormat: { type: 'json_object' },
    });

    const aiKeywords = parseAiKeywords(aiResult.content);
    const keywords = aiKeywords.length > 0 ? aiKeywords : fallbackKeywords;

    const response: IOnboardingKeywordSuggestionsResponse = {
      keywords,
      source: aiKeywords.length > 0 ? 'openrouter_gsc' : 'gsc_fallback',
      reason: aiKeywords.length > 0 ? 'ok' : 'ai_failed',
      model: aiKeywords.length > 0 ? aiResult.model : preferredModel,
    };

    return jsonResponse(response);
  } catch (error) {
    console.error('[OnboardingKeywordSuggestions] AI suggestion failed:', error);

    const response: IOnboardingKeywordSuggestionsResponse = {
      keywords: fallbackKeywords,
      source: 'gsc_fallback',
      reason: 'ai_failed',
      model: preferredModel,
    };

    return jsonResponse(response);
  }
});
