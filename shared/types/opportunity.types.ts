/**
 * Opportunity & GSC Integration Types
 * AutopilotRank - Google Search Console powered SEO insights
 */

// =============================================================================
// Enums / Union Types
// =============================================================================

/** Opportunity types matching database CHECK constraint */
export type OpportunityType =
  | 'content_gap'
  | 'low_hanging_fruit'
  | 'topic_cluster'
  | 'low_ctr'
  | 'declining_position'
  | 'thin_content'
  | 'cannibalization';

/** Article content strategies based on opportunity type */
export type ArticleStrategy = 'new_content' | 'optimize_existing' | 'topic_hub';

/** Opportunity category */
export type OpportunityCategory = 'content' | 'technical';

/** Opportunity status lifecycle */
export type OpportunityStatus = 'open' | 'in_progress' | 'completed' | 'dismissed';

/** Performance status for tracking ranking changes after action */
export type PerformanceStatus = 'pending' | 'improved' | 'stable' | 'declined' | 'not_found';

/** Opportunity estimated impact */
export type OpportunityImpact = 'high' | 'medium' | 'low';

/** Action types for opportunities */
export type OpportunityActionType = 'create_article' | 'optimize_page' | 'fix_issue';

/** GSC connection status */
export type GscConnectionStatus = 'active' | 'disconnected' | 'error';

// =============================================================================
// GSC Connection
// =============================================================================

/** GSC connection record matching database schema */
export interface IGscConnection {
  id: string;
  user_id: string;
  project_id: string;
  google_email: string;
  site_url: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  last_synced_at: string | null;
  status: GscConnectionStatus;
  created_at: string;
  updated_at: string;
}

/** Safe GSC connection data (no tokens) for client-side use */
export interface IGscConnectionSafe {
  id: string;
  project_id: string;
  google_email: string;
  site_url: string | null;
  last_synced_at: string | null;
  status: GscConnectionStatus;
  auto_analyze: boolean;
  analyze_frequency: 'daily' | 'weekly' | 'biweekly';
  next_analyze_at: string | null;
  last_analyzed_at: string | null;
  created_at: string;
}

// =============================================================================
// GSC Snapshot
// =============================================================================

/** GSC snapshot record matching database schema */
export interface IGscSnapshot {
  id: string;
  connection_id: string;
  project_id: string;
  user_id: string;
  date_range_start: string;
  date_range_end: string;
  data: IGscSnapshotData;
  query_count: number;
  created_at: string;
}

/** Structure of aggregated GSC data stored in snapshot */
export interface IGscSnapshotData {
  queries: IGscQueryRow[];
  pages: IGscPageRow[];
  totals: IGscMetrics;
  /** Raw query+page pairs for detailed analysis (e.g., cannibalization detection) */
  queryPagePairs?: IGscQueryPagePair[];
}

/** Single query+page pair row from GSC search analytics (raw, pre-aggregation) */
export interface IGscQueryPagePair {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Single query row from GSC search analytics */
export interface IGscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page?: string;
}

/** Single page row from GSC search analytics */
export interface IGscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/** Common GSC metrics */
export interface IGscMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// =============================================================================
// Opportunities
// =============================================================================

/** Opportunity record matching database schema */
export interface IOpportunity {
  id: string;
  project_id: string;
  user_id: string;
  snapshot_id: string | null;
  type: OpportunityType;
  category: OpportunityCategory;
  title: string;
  description: string;
  query: string | null;
  page_url: string | null;
  metrics: IOpportunityMetrics;
  priority_score: number;
  estimated_impact: OpportunityImpact;
  status: OpportunityStatus;
  action_type: OpportunityActionType | null;
  action_ref_id: string | null;
  /** Performance status tracking ranking changes after action taken */
  performance_status: PerformanceStatus | null;
  /** Last time the opportunity was checked for performance */
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Metrics stored in the opportunity JSONB field */
export interface IOpportunityMetrics {
  position?: number;
  ctr?: number;
  impressions?: number;
  clicks?: number;
  previousPosition?: number;
  positionChange?: number;
  avgCtrForPosition?: number;
  competingPages?: string[];
  /** Related queries for topic cluster opportunities */
  relatedQueries?: string[];
  /** Total impressions across all queries in the cluster */
  totalClusterImpressions?: number;
}

/**
 * GSC context passed to article generation prompts.
 * This enables GSC-aware article generation based on opportunity type.
 */
export interface IGscArticleContext {
  /** ID of the opportunity this context was derived from */
  opportunityId: string;
  /** The opportunity type (determines article strategy) */
  opportunityType: OpportunityType;
  /** The target search query */
  query: string;
  /** GSC metrics for the query */
  metrics: IOpportunityMetrics;
  /** The content strategy to use for article generation */
  articleStrategy: ArticleStrategy;
  /** Related queries for topic clusters (optional) */
  relatedQueries?: string[];
  /** The existing page URL if applicable (optional) */
  pageUrl?: string;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/** Input for triggering opportunity analysis */
export interface IAnalyzeOpportunitiesInput {
  projectId: string;
}

/** Response from opportunity analysis */
export interface IAnalyzeOpportunitiesResponse {
  opportunities: IOpportunity[];
  newCount: number;
  updatedCount: number;
}

/** Input for updating an opportunity */
export interface IUpdateOpportunityInput {
  status?: OpportunityStatus;
  action_type?: OpportunityActionType;
}

/** Response for opportunity list */
export interface IOpportunityListResponse {
  opportunities: IOpportunity[];
  total: number;
}

/** Response for single opportunity */
export interface IOpportunityResponse {
  opportunity: IOpportunity;
}

/** Response for creating article from opportunity */
export interface ICreateArticleFromOpportunityResponse {
  campaignId: string;
  opportunityId: string;
}

/** Response for GSC connection list */
export interface IGscConnectionListResponse {
  connections: IGscConnectionSafe[];
}

/** Response for initiating GSC OAuth */
export interface IGscConnectResponse {
  authUrl: string;
}

/** Response for GSC sites list */
export interface IGscSitesResponse {
  sites: IGscSite[];
}

/** GSC verified site */
export interface IGscSite {
  siteUrl: string;
  permissionLevel: string;
}

// =============================================================================
// Performance Checks
// =============================================================================

/** Performance check record for tracking ranking changes after opportunity action */
export interface IOpportunityPerformanceCheck {
  id: string;
  opportunity_id: string;
  article_id: string | null;
  check_date: string;
  position_before: number | null;
  position_after: number | null;
  ctr_before: number | null;
  ctr_after: number | null;
  impressions_before: number | null;
  impressions_after: number | null;
  clicks_before: number | null;
  clicks_after: number | null;
  status: 'improved' | 'stable' | 'declined' | 'not_found';
  created_at: string;
}

// =============================================================================
// Error Classes
// =============================================================================

/** Error thrown when an opportunity is not found */
export class OpportunityNotFoundError extends Error {
  public readonly opportunityId: string;

  constructor(opportunityId: string) {
    super(`Opportunity not found: ${opportunityId}`);
    this.name = 'OpportunityNotFoundError';
    this.opportunityId = opportunityId;
  }
}

/** Error thrown when GSC connection is not found or invalid */
export class GscConnectionError extends Error {
  public readonly projectId: string;

  constructor(projectId: string, message?: string) {
    super(message || `No active GSC connection for project: ${projectId}`);
    this.name = 'GscConnectionError';
    this.projectId = projectId;
  }
}
