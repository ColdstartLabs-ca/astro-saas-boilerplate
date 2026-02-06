/**
 * Campaign Management Types
 * AutopilotRank - Campaign CRUD and bulk article generation
 */

/**
 * Campaign status enum representing the lifecycle of a campaign
 */
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

/**
 * Keyword status enum representing the processing state of a keyword
 */
export type KeywordStatus = 'pending' | 'queued' | 'generating' | 'generated' | 'failed';

/**
 * Keyword difficulty enum for SEO classification
 */
export type KeywordDifficulty = 'easy' | 'medium' | 'hard' | 'unknown';

/**
 * Writing tone options for content generation
 */
export type CampaignTone = 'professional' | 'casual' | 'witty' | 'academic';

/**
 * Full campaign interface matching the database schema
 */
export interface ICampaign {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  status: CampaignStatus;
  ai_model: string;
  tone: CampaignTone;
  target_word_count: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Full keyword interface matching the database schema
 */
export interface IKeyword {
  id: string;
  campaign_id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: KeywordDifficulty;
  status: KeywordStatus;
  priority: number;
  created_at: string;
  updated_at: string;
}

/**
 * Campaign with aggregated statistics for list views
 */
export interface ICampaignWithStats extends ICampaign {
  /** Total number of keywords in the campaign */
  keyword_count: number;
  /** Total number of articles generated */
  article_count: number;
  /** Number of keywords with 'generated' status */
  completed_count: number;
}

/**
 * Input for creating a new campaign
 */
export interface ICreateCampaignInput {
  /** Campaign name (required, 1-100 chars) */
  name: string;
  /** ID of the project this campaign belongs to */
  projectId: string;
  /** Array of target keywords (1-500, each 1-200 chars) */
  keywords: string[];
  /** OpenRouter model ID (optional, uses default if not specified) */
  model?: string;
  /** Writing tone (optional, uses default if not specified) */
  tone?: CampaignTone;
  /** Target word count (optional, 800-3000, default 1500) */
  targetWordCount?: number;
}

/**
 * Input for updating an existing campaign
 */
export interface IUpdateCampaignInput {
  /** Campaign name */
  name?: string;
  /** Campaign status */
  status?: CampaignStatus;
  /** OpenRouter model ID */
  model?: string;
  /** Writing tone */
  tone?: CampaignTone;
  /** Target word count */
  targetWordCount?: number;
}

/**
 * Input for adding keywords to an existing campaign
 */
export interface IAddKeywordsInput {
  /** Campaign ID */
  campaignId: string;
  /** Array of keywords to add (1-500, each 1-200 chars) */
  keywords: string[];
}

/**
 * Input for starting campaign bulk generation
 */
export interface IStartCampaignInput {
  /** Campaign ID */
  campaignId: string;
}

/**
 * Response for adding keywords operation
 */
export interface IAddKeywordsResponse {
  /** Number of new keywords added */
  added: number;
  /** Number of duplicate keywords skipped */
  duplicates: number;
}

/**
 * Response for starting campaign generation
 */
export interface IStartCampaignResponse {
  /** Number of keywords queued for generation */
  queued: number;
  /** Total credits required for generation */
  creditsRequired: number;
}

/**
 * API response for single campaign
 */
export interface ICampaignResponse {
  campaign: ICampaign;
}

/**
 * API response for single campaign with stats
 */
export interface ICampaignWithStatsResponse {
  campaign: ICampaignWithStats;
}

/**
 * API response for campaign list
 */
export interface ICampaignListResponse {
  campaigns: ICampaignWithStats[];
}

/**
 * API response for campaign detail with keywords and article stats
 */
export interface ICampaignDetailResponse {
  campaign: ICampaign;
  keywords: IKeyword[];
  articleStats: ICampaignArticleStats;
}

/**
 * Article statistics for a campaign
 */
export interface ICampaignArticleStats {
  /** Number of queued articles */
  queued: number;
  /** Number of articles currently generating */
  generating: number;
  /** Number of draft articles awaiting review */
  draft: number;
  /** Number of published articles */
  published: number;
  /** Total articles across all statuses */
  total: number;
}

/**
 * API response for keywords list
 */
export interface IKeywordsResponse {
  keywords: IKeyword[];
}

/**
 * Error thrown when user has insufficient credits for campaign generation
 */
export class InsufficientCreditsError extends Error {
  public readonly required: number;
  public readonly available: number;

  constructor(required: number, available: number) {
    super(`Insufficient credits. You need ${required} credits but have ${available} available.`);
    this.name = 'InsufficientCreditsError';
    this.required = required;
    this.available = available;
  }
}

/**
 * Error thrown when campaign is not found or user lacks access
 */
export class CampaignNotFoundError extends Error {
  public readonly campaignId: string;

  constructor(campaignId: string) {
    super(`Campaign not found: ${campaignId}`);
    this.name = 'CampaignNotFoundError';
    this.campaignId = campaignId;
  }
}

/**
 * Error thrown when attempting to start a campaign with no pending keywords
 */
export class NoPendingKeywordsError extends Error {
  constructor() {
    super('Cannot start campaign: no pending keywords found.');
    this.name = 'NoPendingKeywordsError';
  }
}
