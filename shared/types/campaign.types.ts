/**
 * Campaign Management Types
 * AutopilotRank - Campaign CRUD and bulk article generation
 */

/**
 * Schedule frequency options for drip-feed article generation
 */
export type ScheduleFrequency =
  | '3x_daily'
  | '2x_daily'
  | 'daily'
  | 'every_other_day'
  | '3x_weekly'
  | '2x_weekly'
  | 'weekly'
  | 'every_2_weeks';

/**
 * Campaign status enum representing the lifecycle of a campaign
 */
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';

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
 * Article writing style options
 */
export type ArticleStyle = 'informative' | 'how-to' | 'listicle' | 'opinion' | 'tutorial';

/**
 * Image generation style options
 */
export type ImageStyle = 'brand_text' | 'watercolor' | 'cinematic' | 'illustration' | 'sketch';

/**
 * Reasons why a scheduled campaign might be auto-paused
 */
export type SchedulePauseReason =
  | 'insufficient_credits'
  | 'no_pending_keywords'
  | 'generation_failed'
  | 'user_paused';

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
  image_preset: string | null;
  generation_run_id: string | null;
  created_at: string;
  updated_at: string;
  // Scheduling fields
  schedule_frequency: ScheduleFrequency | null;
  schedule_batch_size: number;
  next_run_at: string | null;
  last_run_at: string | null;
  schedule_timezone: string;
  schedule_hour: number;
  // Outrank feature parity fields
  article_style: ArticleStyle | null;
  internal_links_count: number;
  global_instructions: string | null;
  auto_publish: boolean;
  include_youtube: boolean;
  include_cta: boolean;
  include_infographics: boolean;
  include_emojis: boolean;
  image_style: ImageStyle | null;
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
  /** Image generation preset key (optional, no images if not specified) */
  imagePreset?: string;
  // Scheduling fields
  /** How often to generate articles (optional) */
  scheduleFrequency?: ScheduleFrequency;
  /** Number of articles per scheduled run (optional, 1-50) */
  scheduleBatchSize?: number;
  /** IANA timezone for scheduling (optional, default UTC) */
  scheduleTimezone?: string;
  /** Preferred hour in user timezone (optional, 0-23, default 9) */
  scheduleHour?: number;
  // Outrank feature parity fields
  /** Article writing style */
  articleStyle?: ArticleStyle | null;
  /** Number of internal links to include in articles */
  internalLinksCount?: number;
  /** Global instructions for content generation */
  globalInstructions?: string | null;
  /** Whether to auto-publish generated articles */
  autoPublish?: boolean;
  /** Whether to include YouTube video recommendations */
  includeYoutube?: boolean;
  /** Whether to include call-to-action elements */
  includeCta?: boolean;
  /** Whether to include infographics */
  includeInfographics?: boolean;
  /** Whether to include emojis in content */
  includeEmojis?: boolean;
  /** Image generation style */
  imageStyle?: ImageStyle | null;
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
  /** Image generation preset key */
  imagePreset?: string;
  // Scheduling fields
  /** How often to generate articles */
  scheduleFrequency?: ScheduleFrequency | null;
  /** Number of articles per scheduled run (1-50) */
  scheduleBatchSize?: number;
  /** IANA timezone for scheduling */
  scheduleTimezone?: string;
  /** Preferred hour in user timezone (0-23) */
  scheduleHour?: number;
  /** Next scheduled run time (for scheduling) */
  nextRunAt?: string | null;
  // Outrank feature parity fields
  /** Article writing style */
  articleStyle?: ArticleStyle | null;
  /** Number of internal links to include in articles */
  internalLinksCount?: number;
  /** Global instructions for content generation */
  globalInstructions?: string | null;
  /** Whether to auto-publish generated articles */
  autoPublish?: boolean;
  /** Whether to include YouTube video recommendations */
  includeYoutube?: boolean;
  /** Whether to include call-to-action elements */
  includeCta?: boolean;
  /** Whether to include infographics */
  includeInfographics?: boolean;
  /** Whether to include emojis in content */
  includeEmojis?: boolean;
  /** Image generation style */
  imageStyle?: ImageStyle | null;
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
 * A keyword that is already covered by existing published content
 */
export interface IKeywordCoverage {
  /** The keyword that was filtered out */
  keyword: string;
  /** URL of the existing page that covers this keyword */
  coveredByUrl: string;
  /** Title of the existing page (may be null if sitemap had no title) */
  coveredByTitle: string | null;
  /** LLM reasoning for why this keyword is already covered */
  reason: string;
}

/**
 * A cross-campaign keyword cannibalization warning (non-blocking)
 */
export interface ICannibalizationWarning {
  /** The newly-added keyword that has potential overlap */
  newKeyword: string;
  /** The existing keyword it overlaps with */
  existingKeyword: string;
  /** Name of the campaign containing the existing keyword */
  existingCampaignName: string;
  /** ID of the campaign containing the existing keyword */
  existingCampaignId: string;
  /** Cosine similarity score (0-1) */
  similarity: number;
  /** Human-readable similarity percentage (0-100) */
  similarityPercent: number;
}

/**
 * Response for adding keywords operation
 */
export interface IAddKeywordsResponse {
  /** Number of new keywords added */
  added: number;
  /** Number of duplicate keywords skipped */
  duplicates: number;
  /** Keywords filtered out because they're already covered by published content */
  alreadyCovered?: IKeywordCoverage[];
  /** Cross-campaign overlap warnings (non-blocking — keywords still added) */
  cannibalizationWarnings?: ICannibalizationWarning[];
  /** Alternative keywords from GSC (only present when all keywords were covered) */
  suggestedKeywords?: string[];
  /** Whether the cannibalization check ran (false if services unavailable) */
  cannibalizationChecked?: boolean;
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
  creditStats: ICampaignCreditStats;
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
 * Credit usage statistics for a campaign
 */
export interface ICampaignCreditStats {
  /** Total credits used for successfully generated articles */
  creditsUsed: number;
  /** Credits refunded for failed article generations */
  creditsRefunded: number;
  /** Number of successfully generated articles */
  successfulCount: number;
  /** Number of failed article generations */
  failedCount: number;
  /** Cost per article in credits (1 base + optional image cost) */
  costPerArticle: number;
  /** Estimated credits needed to complete remaining keywords */
  estimatedCreditsRemaining: number;
  /** Total credits required for the campaign (used + remaining) */
  totalCreditsRequired: number;
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

/**
 * Error thrown for schedule-related validation failures (invalid state, missing config)
 */
export class ScheduleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleValidationError';
  }
}

/**
 * Error thrown when attempting to start a campaign that is not in a startable state.
 * Only 'draft' and 'paused' campaigns can be started.
 */
export class CampaignAlreadyActiveError extends Error {
  public readonly currentStatus: string;

  constructor(currentStatus: string) {
    super(
      `Cannot start campaign: campaign is already in '${currentStatus}' state. Only 'draft' or 'paused' campaigns can be started.`
    );
    this.name = 'CampaignAlreadyActiveError';
    this.currentStatus = currentStatus;
  }
}

/**
 * Result data from a campaign generation run (stored for idempotency)
 */
export interface ICampaignGenerationRunResult {
  queued: number;
  creditsRequired: number;
}

/**
 * Result from claiming a campaign generation with idempotency key
 */
export interface IClaimCampaignGenerationResult {
  /** True if this is a new request, false if idempotency key was already used */
  isNew: boolean;
  /** The generation run ID (only for new requests) */
  generationRunId?: string;
  /** Status of existing run (only for cached requests) */
  existingStatus?: 'completed' | 'processing' | 'failed' | 'already_running' | 'unknown';
  /** Cached response data (only for completed runs) */
  cachedResponse?: ICampaignGenerationRunResult;
}

/**
 * Schedule configuration for a campaign
 */
export interface IScheduleConfig {
  /** How often to generate articles */
  frequency: ScheduleFrequency;
  /** Number of articles per scheduled run (1-50) */
  batchSize: number;
  /** IANA timezone for scheduling */
  timezone: string;
  /** Preferred hour in user timezone (0-23) */
  hour: number;
}

/**
 * SEO velocity advisory level
 */
export type SeoVelocityLevel = 'safe' | 'moderate' | 'high' | 'aggressive';

/**
 * SEO velocity advisory information
 */
export interface ISeoVelocityAdvisory {
  /** Advisory level */
  level: SeoVelocityLevel;
  /** Human-readable message */
  message: string;
  /** Whether this should block the operation */
  blocksOperation: boolean;
}
