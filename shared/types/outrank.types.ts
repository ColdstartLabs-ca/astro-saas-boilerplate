/**
 * Outrank Feature Parity Types
 * Types for project sub-resources: audiences, competitors, example articles,
 * sitemap pages, and content strategies.
 */

/**
 * Target audience segment for a project
 */
export interface IProjectTargetAudience {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

/**
 * Competitor domain tracked for a project
 */
export interface IProjectCompetitor {
  id: string;
  project_id: string;
  domain: string;
  name: string | null;
  favicon_url: string | null;
  created_at: string;
}

/**
 * Example article for writing style analysis
 */
export interface IProjectExampleArticle {
  id: string;
  project_id: string;
  url: string;
  extracted_content: string | null;
  analyzed_style: IAnalyzedStyle | null;
  created_at: string;
}

/**
 * LLM-analyzed writing style from an example article
 * Populated by PRD 4 (Style Analysis)
 */
export interface IAnalyzedStyle {
  tone: string;
  formality: 'casual' | 'neutral' | 'formal';
  vocabularyLevel: 'simple' | 'intermediate' | 'advanced';
  sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  paragraphLength: 'short' | 'medium' | 'long';
  useOfHeadings: boolean;
  useOfLists: boolean;
  useOfExamples: boolean;
  narrativeStyle: string;
  summary: string;
}

/**
 * Page from a project's sitemap
 */
export interface ISitemapPage {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  last_modified: string | null;
  created_at: string;
}

/**
 * Content strategy status
 */
export type ContentStrategyStatus = 'pending' | 'generating' | 'ready' | 'failed';

/**
 * AI-generated content strategy
 */
export interface IContentStrategy {
  id: string;
  project_id: string;
  user_id: string;
  status: ContentStrategyStatus;
  strategy_data: IStrategyData | null;
  generation_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Strategy data structure (AI-generated)
 * Populated by PRD 5 (Content Strategy Generation)
 */
export interface IStrategyData {
  clusters: Array<{
    name: string;
    keywords: string[];
    priority: 'high' | 'medium' | 'low';
    estimatedArticles: number;
  }>;
  contentGaps: string[];
  publishingSchedule: {
    frequency: string;
    totalArticles: number;
    estimatedWeeks: number;
  };
  topicMap: Record<string, string[]>;
}

// =========================================================================
// API Input Types
// =========================================================================

/**
 * Input for adding target audiences to a project
 */
export interface IAddAudiencesInput {
  audiences: string[];
}

/**
 * Input for adding a single competitor to a project
 */
export interface IAddCompetitorInput {
  domain: string;
  name?: string;
}

/**
 * Input for adding competitors to a project (batch)
 */
export interface IAddCompetitorsInput {
  competitors: IAddCompetitorInput[];
}

/**
 * Input for adding example article URLs to a project
 */
export interface IAddExampleArticlesInput {
  urls: string[];
}

// =========================================================================
// API Response Types
// =========================================================================

/**
 * Response for batch add operations (audiences, competitors, example articles)
 */
export interface IBatchAddResponse {
  added: number;
  duplicates: number;
}

/**
 * Response for audience list
 */
export interface IAudiencesResponse {
  audiences: IProjectTargetAudience[];
}

/**
 * Response for competitor list
 */
export interface ICompetitorsResponse {
  competitors: IProjectCompetitor[];
}

/**
 * Response for example articles list
 */
export interface IExampleArticlesResponse {
  exampleArticles: IProjectExampleArticle[];
}

/**
 * Response for sitemap pages list
 */
export interface ISitemapPagesResponse {
  pages: ISitemapPage[];
  total: number;
}

/**
 * Response for content strategy
 */
export interface IContentStrategyResponse {
  contentStrategy: IContentStrategy;
}
