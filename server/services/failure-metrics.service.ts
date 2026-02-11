/**
 * Failure Metrics Service
 *
 * Provides monitoring and analytics for article generation failures.
 * Implements E13: Add structured failure taxonomy and metrics.
 *
 * This service aggregates failure data by stage, provider, model,
 * and time windows for dashboard display and alerting.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import type {
  IFailureMetrics,
  MetricsTimeWindow,
  FailureStage,
  FailureProvider,
} from '@shared/types/failure.types';
import type { ArticleStatus } from '@shared/types/article.types';

type FailureMetrics = IFailureMetrics;

export class FailureMetricsService {
  private supabase = supabaseAdmin;

  /**
   * Get failure metrics for a specific time window
   *
   * @param timeWindow - Time window to aggregate metrics for
   * @param userId - Optional user ID to filter by (admin only)
   * @param projectId - Optional project ID to filter by
   * @returns Aggregated failure metrics
   */
  async getFailureMetrics(
    timeWindow: MetricsTimeWindow = 'last_24h',
    userId?: string,
    projectId?: string
  ): Promise<IFailureMetrics> {
    const { startDate, endDate } = this.getTimeWindowDates(timeWindow);

    // Build query
    let query = this.supabase
      .from('articles')
      .select('failure_stage, provider, ai_model_used, status, created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('status', ['failed', 'failed_quality']);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: articles, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch failure metrics: ${error.message}`);
    }

    return this.aggregateMetrics(articles || []);
  }

  /**
   * Get failure breakdown by stage
   *
   * @param timeWindow - Time window to analyze
   * @param userId - Optional user ID filter
   * @param projectId - Optional project ID filter
   * @returns Object mapping stage to failure count
   */
  async getFailuresByStage(
    timeWindow: MetricsTimeWindow = 'last_24h',
    userId?: string,
    projectId?: string
  ): Promise<Record<FailureStage, number>> {
    const metrics = await this.getFailureMetrics(timeWindow, userId, projectId);
    return metrics.failuresByStage;
  }

  /**
   * Get failure breakdown by provider
   *
   * @param timeWindow - Time window to analyze
   * @param userId - Optional user ID filter
   * @param projectId - Optional project ID filter
   * @returns Object mapping provider to failure count
   */
  async getFailuresByProvider(
    timeWindow: MetricsTimeWindow = 'last_24h',
    userId?: string,
    projectId?: string
  ): Promise<Record<FailureProvider, number>> {
    const metrics = await this.getFailureMetrics(timeWindow, userId, projectId);
    return metrics.failuresByProvider;
  }

  /**
   * Get failure breakdown by AI model
   *
   * @param timeWindow - Time window to analyze
   * @param userId - Optional user ID filter
   * @param projectId - Optional project ID filter
   * @returns Object mapping model ID to failure count
   */
  async getFailuresByModel(
    timeWindow: MetricsTimeWindow = 'last_24h',
    userId?: string,
    projectId?: string
  ): Promise<Record<string, number>> {
    const metrics = await this.getFailureMetrics(timeWindow, userId, projectId);
    return metrics.failuresByModel;
  }

  /**
   * Get failure rate over time (for trend charts)
   *
   * @param timeWindow - Time window to analyze
   * @param granularity - Time bucket size ('hour', 'day')
   * @param userId - Optional user ID filter
   * @param projectId - Optional project ID filter
   * @returns Array of time-bucketed failure rates
   */
  async getFailureRateOverTime(
    timeWindow: MetricsTimeWindow = 'last_24h',
    granularity: 'hour' | 'day' = 'hour',
    userId?: string,
    projectId?: string
  ): Promise<Array<{ timestamp: string; failureRate: number; failures: number; total: number }>> {
    const { startDate, endDate } = this.getTimeWindowDates(timeWindow);

    // This query needs to use SQL aggregation for efficiency
    // For now, we'll do it in TypeScript - can be optimized with a RPC function

    let query = this.supabase
      .from('articles')
      .select('created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('status', ['queued', 'generating', 'draft', 'failed', 'failed_quality']);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: articles, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch failure rate over time: ${error.message}`);
    }

    // Bucket by time period
    const buckets = new Map<string, { failures: number; total: number }>();

    for (const article of articles || []) {
      const timestamp =
        granularity === 'hour'
          ? this.truncateToHour(article.created_at)
          : this.truncateToDay(article.created_at);

      if (!buckets.has(timestamp)) {
        buckets.set(timestamp, { failures: 0, total: 0 });
      }

      const bucket = buckets.get(timestamp)!;
      bucket.total++;
      if (article.status === 'failed' || article.status === 'failed_quality') {
        bucket.failures++;
      }
    }

    // Convert to array and sort by timestamp
    return Array.from(buckets.entries())
      .map(([timestamp, { failures, total }]) => ({
        timestamp,
        failureRate: total > 0 ? (failures / total) * 100 : 0,
        failures,
        total,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Get retryable failures (candidates for automatic retry)
   *
   * @param timeWindow - Time window to look back
   * @param userId - Optional user ID filter
   * @param projectId - Optional project ID filter
   * @returns Array of articles with retryable failures
   */
  async getRetryableFailures(
    timeWindow: MetricsTimeWindow = 'last_24h',
    userId?: string,
    projectId?: string
  ): Promise<
    Array<{
      id: string;
      primary_keyword: string;
      failure_stage: FailureStage | null;
      provider: string | null;
      attempt_count: number;
      created_at: string;
    }>
  > {
    const { startDate, endDate } = this.getTimeWindowDates(timeWindow);

    let query = this.supabase
      .from('articles')
      .select('id, primary_keyword, failure_stage, provider, attempt_count, created_at')
      .eq('status', 'failed')
      .eq('is_retryable', true)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch retryable failures: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get recent failures with full details for troubleshooting
   *
   * @param limit - Maximum number of failures to return
   * @param userId - Optional user ID filter
   * @param projectId - Optional project ID filter
   * @returns Array of recent failed articles
   */
  async getRecentFailures(
    limit = 50,
    userId?: string,
    projectId?: string
  ): Promise<
    Array<{
      id: string;
      primary_keyword: string;
      status: ArticleStatus;
      failure_stage: FailureStage | null;
      provider: string | null;
      http_status: number | null;
      attempt_count: number;
      is_retryable: boolean;
      generation_error: string | null;
      ai_model_used: string | null;
      created_at: string;
      campaign_id: string | null;
      user_id: string;
    }>
  > {
    let query = this.supabase
      .from('articles')
      .select(
        `
        id,
        primary_keyword,
        status,
        failure_stage,
        provider,
        http_status,
        attempt_count,
        is_retryable,
        generation_error,
        ai_model_used,
        created_at,
        campaign_id,
        user_id
      `
      )
      .in('status', ['failed', 'failed_quality'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch recent failures: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Aggregate raw article data into metrics
   */
  private aggregateMetrics(
    articles: Array<{
      failure_stage: FailureStage | null;
      provider: string | null;
      ai_model_used: string | null;
      status: string;
      created_at: string;
    }>
  ): FailureMetrics {
    const totalFailures = articles.length;

    // Initialize counters
    const failuresByStage: Record<FailureStage, number> = {
      credit_check: 0,
      outline_generation: 0,
      article_generation: 0,
      quality_gate: 0,
      image_generation: 0,
      image_upload: 0,
      metadata_extraction: 0,
      storage: 0,
      unknown: 0,
    };

    const failuresByProvider: Record<FailureProvider, number> = {
      openrouter: 0,
      replicate: 0,
      supabase: 0,
      stripe: 0,
      internal: 0,
      unknown: 0,
    };

    const failuresByModel: Record<string, number> = {};
    let retryableFailures = 0;

    // Aggregate
    for (const article of articles) {
      // Count by stage
      const stage = article.failure_stage || 'unknown';
      failuresByStage[stage]++;

      // Count by provider
      const provider = (article.provider?.toLowerCase() || 'unknown') as FailureProvider;
      if (provider in failuresByProvider) {
        failuresByProvider[provider]++;
      } else {
        failuresByProvider.unknown++;
      }

      // Count by model
      const model = article.ai_model_used || 'unknown';
      failuresByModel[model] = (failuresByModel[model] || 0) + 1;

      // Note: we'd need to fetch is_retryable from the query
      // For now, we'll estimate based on stage
      if (stage === 'article_generation' || stage === 'outline_generation') {
        retryableFailures++;
      }
    }

    // Calculate overall failure rate (approximate - we'd need total article count)
    const failureRate = totalFailures > 0 ? 100 : 0; // Placeholder

    return {
      totalFailures,
      failuresByStage,
      failuresByProvider,
      failuresByModel,
      retryableFailures,
      failureRate,
    };
  }

  /**
   * Get start and end dates for a time window
   */
  private getTimeWindowDates(timeWindow: MetricsTimeWindow): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeWindow) {
      case 'last_hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'last_24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case 'last_7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last_30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Truncate ISO date string to hour precision
   */
  private truncateToHour(isoDate: string): string {
    const date = new Date(isoDate);
    date.setMinutes(0, 0, 0);
    return date.toISOString();
  }

  /**
   * Truncate ISO date string to day precision
   */
  private truncateToDay(isoDate: string): string {
    const date = new Date(isoDate);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
}

// Export singleton instance
export const failureMetricsService = new FailureMetricsService();
