/**
 * Article Performance Analytics Types
 * Types for GSC-based per-article performance snapshots.
 */

// =============================================================================
// Performance Snapshot
// =============================================================================

/** A single query from GSC associated with an article's page */
export interface ITopQuery {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
}

/** Performance snapshot for a single article, stored daily */
export interface IArticlePerformanceSnapshot {
  id: string;
  article_id: string;
  snapshot_date: string; // ISO date (YYYY-MM-DD)
  date_range_days: number;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number;
  top_queries: ITopQuery[];
  created_at: string;
}

// =============================================================================
// API Request / Response Types
// =============================================================================

/** Request body for POST /api/analytics/sync */
export interface IAnalyticsSyncRequest {
  projectId: string;
  dateRangeDays?: 7 | 28 | 90;
}

/** Response from POST /api/analytics/sync */
export interface IAnalyticsSyncResponse {
  synced: number;
  skipped: number;
  reason?: string;
}

// =============================================================================
// GET /api/analytics/performance Response Types
// =============================================================================

/** A single article row in the performance response */
export interface IArticlePerformanceRow {
  article_id: string;
  title: string | null;
  primary_keyword: string;
  published_url: string;
  published_at: string | null;
  campaign_id: string;
  campaign_name: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number;
  top_queries: ITopQuery[];
  snapshot_date: string;
}

/** Aggregated metrics for a single campaign */
export interface ICampaignPerformanceRow {
  campaign_id: string;
  campaign_name: string;
  article_count: number;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
}

/** Summary totals across all tracked articles */
export interface IPerformanceSummary {
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  articles_tracked: number;
  articles_published: number;
}

/** Full response from GET /api/analytics/performance */
export interface IAnalyticsData {
  articles: IArticlePerformanceRow[];
  campaigns: ICampaignPerformanceRow[];
  summary: IPerformanceSummary;
  lastSyncedAt: string | null;
  hasGscConnection: boolean;
  dateRangeDays: number;
}
