/**
 * Opportunity Performance Service
 * Tracks ranking changes after opportunity actions are taken.
 *
 * Flow:
 * 1. Find opportunities due for performance check (14+ days old, in_progress, create_article action)
 * 2. Get current GSC metrics for the opportunity's query
 * 3. Compare against original metrics stored in opportunity.metrics
 * 4. Determine performance status: improved, stable, declined, not_found
 * 5. Insert performance check record
 * 6. Auto-complete opportunity if improved by >5 positions
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { gscService } from '@server/services/gsc.service';
import dayjs from 'dayjs';
import type {
  IOpportunity,
  IOpportunityPerformanceCheck,
  IGscConnection,
  PerformanceStatus,
} from '@shared/types/opportunity.types';

// =============================================================================
// Types
// =============================================================================

export interface IPerformanceCheckResult {
  opportunityId: string;
  success: boolean;
  status: PerformanceStatus | null;
  positionBefore: number | null;
  positionAfter: number | null;
  error?: string;
}

export interface IOpportunityForCheck extends Pick<IOpportunity, 'id' | 'project_id' | 'user_id' | 'query' | 'metrics' | 'action_ref_id' | 'created_at'> {
  action_type: string | null;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Manages performance tracking for opportunities after action has been taken.
 */
export class OpportunityPerformanceService {
  /**
   * Minimum days after opportunity creation before checking performance.
   * Gives articles time to be indexed by Google.
   */
  private readonly MIN_DAYS_BEFORE_CHECK = 14;

  /**
   * Minimum days between performance checks for the same opportunity.
   * Avoids over-checking.
   */
  private readonly MIN_DAYS_BETWEEN_CHECKS = 7;

  /**
   * Maximum number of opportunities to process per cron run.
   * Prevents timeout on Cloudflare Workers (10ms CPU limit).
   */
  private readonly MAX_OPPORTUNITIES_PER_RUN = 20;

  /**
   * Position change threshold for "improved" status.
   */
  private readonly IMPROVED_THRESHOLD = 3;

  /**
   * Position change threshold for auto-completing opportunity.
   */
  private readonly AUTO_COMPLETE_THRESHOLD = 5;

  /**
   * Get opportunities that are due for a performance check.
   *
   * Criteria:
   * - status = 'in_progress'
   * - action_type = 'create_article'
   * - created_at >= 14 days ago (time for indexing)
   * - NOT checked in the last 7 days (avoid over-checking)
   *
   * @param limit Maximum opportunities to return
   * @returns Array of opportunities due for check
   */
  async getOpportunitiesDueForCheck(
    limit = this.MAX_OPPORTUNITIES_PER_RUN
  ): Promise<IOpportunityForCheck[]> {
    const minCreatedDate = dayjs().subtract(this.MIN_DAYS_BEFORE_CHECK, 'day').toISOString();
    const minCheckedDate = dayjs().subtract(this.MIN_DAYS_BETWEEN_CHECKS, 'day').toISOString();

    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .select('id, project_id, user_id, query, metrics, action_type, action_ref_id, created_at')
      .eq('status', 'in_progress')
      .eq('action_type', 'create_article')
      .lte('created_at', minCreatedDate)
      .or(`last_checked_at.is.null,last_checked_at.lte.${minCheckedDate}`)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[OpportunityPerformance] Failed to fetch due opportunities:', error.message);
      throw new Error(`Failed to fetch opportunities due for check: ${error.message}`);
    }

    console.log(`[OpportunityPerformance] Found ${data?.length ?? 0} opportunities due for check`);
    return (data ?? []) as IOpportunityForCheck[];
  }

  /**
   * Check performance for a single opportunity.
   *
   * Steps:
   * 1. Get the linked campaign via action_ref_id
   * 2. Find generated articles in that campaign
   * 3. Get the project's active GSC connection
   * 4. Fetch current GSC metrics for the opportunity's query (last 7 days)
   * 5. Compare against original metrics
   * 6. Determine status and insert performance check record
   * 7. Update opportunity's performance_status and last_checked_at
   * 8. Auto-complete if improved by >5 positions
   *
   * @param opportunity The opportunity to check
   * @returns Performance check result
   */
  async checkPerformance(opportunity: IOpportunityForCheck): Promise<IPerformanceCheckResult> {
    const result: IPerformanceCheckResult = {
      opportunityId: opportunity.id,
      success: false,
      status: null,
      positionBefore: null,
      positionAfter: null,
    };

    try {
      console.log(`[OpportunityPerformance] Checking performance for ${opportunity.id}`);

      // Must have a query to check
      if (!opportunity.query) {
        throw new Error('Opportunity has no query to check');
      }

      // Must have an action_ref_id (campaign ID)
      if (!opportunity.action_ref_id) {
        throw new Error('Opportunity has no linked campaign');
      }

      // 1. Find generated articles in the campaign
      const { data: articles, error: articlesError } = await supabaseAdmin
        .from('articles')
        .select('id, primary_keyword')
        .eq('campaign_id', opportunity.action_ref_id)
        .in('status', ['draft', 'qa_passed', 'approved', 'reviewed', 'published']);

      if (articlesError) {
        throw new Error(`Failed to fetch articles: ${articlesError.message}`);
      }

      if (!articles || articles.length === 0) {
        throw new Error('No generated articles found in campaign');
      }

      // Find article that matches the opportunity's query (or use first one)
      const matchingArticle =
        articles.find(a =>
          a.primary_keyword.toLowerCase().includes(opportunity.query!.toLowerCase())
        ) ?? articles[0];

      // 2. Get the project's active GSC connection
      const { data: connection, error: connError } = await supabaseAdmin
        .from('gsc_connections')
        .select('*')
        .eq('project_id', opportunity.project_id)
        .eq('status', 'active')
        .not('site_url', 'is', null)
        .maybeSingle();

      if (connError || !connection) {
        // Return 'no_gsc' status instead of throwing - allows graceful handling in UI
        const status: PerformanceStatus = 'no_gsc';

        // Update opportunity's performance_status
        await supabaseAdmin
          .from('opportunities')
          .update({
            performance_status: status,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', opportunity.id);

        result.success = true;
        result.status = status;
        result.error = 'No active GSC connection for project';

        console.log(`[OpportunityPerformance] No GSC connection for ${opportunity.id}, status set to no_gsc`);
        return result;
      }

      const gscConnection = connection as IGscConnection;

      // 3. Get valid access token
      const accessToken = await gscService.getValidAccessToken(gscConnection);

      // 4. Fetch current GSC metrics for the query (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const analyticsResponse = await gscService.getSearchAnalytics(
        accessToken,
        gscConnection.site_url!,
        formatDate(startDate),
        formatDate(endDate)
      );

      // 5. Find the query in the response
      const queryData = analyticsResponse.rows?.find(row => {
        const query = row.keys[0] ?? '';
        return query.toLowerCase() === opportunity.query!.toLowerCase();
      });

      // 6. Determine status
      const originalMetrics = opportunity.metrics;
      const positionBefore = originalMetrics.position ?? null;
      const ctrBefore = originalMetrics.ctr ?? null;
      const impressionsBefore = originalMetrics.impressions ?? null;
      const clicksBefore = originalMetrics.clicks ?? null;

      let status: PerformanceStatus;
      let positionAfter: number | null = null;
      let ctrAfter: number | null = null;
      let impressionsAfter: number | null = null;
      let clicksAfter: number | null = null;

      if (!queryData) {
        // No data found for the query
        status = 'not_found';
      } else {
        positionAfter = queryData.position;
        ctrAfter = queryData.ctr;
        impressionsAfter = queryData.impressions;
        clicksAfter = queryData.clicks;

        // Calculate position change
        // Note: lower position number = better ranking
        if (positionBefore !== null && positionAfter !== null) {
          const positionChange = positionBefore - positionAfter; // Positive = improved

          if (positionChange >= this.IMPROVED_THRESHOLD) {
            status = 'improved';
          } else if (positionChange <= -this.IMPROVED_THRESHOLD) {
            status = 'declined';
          } else {
            status = 'stable';
          }
        } else {
          // Has data now but no baseline
          status = 'stable';
        }
      }

      // 7. Insert performance check record
      const { error: insertError } = await supabaseAdmin
        .from('opportunity_performance_checks')
        .insert({
          opportunity_id: opportunity.id,
          article_id: matchingArticle.id,
          check_date: formatDate(new Date()),
          position_before: positionBefore,
          position_after: positionAfter,
          ctr_before: ctrBefore,
          ctr_after: ctrAfter,
          impressions_before: impressionsBefore,
          impressions_after: impressionsAfter,
          clicks_before: clicksBefore,
          clicks_after: clicksAfter,
          status,
        });

      if (insertError) {
        console.error('[OpportunityPerformance] Failed to insert check record:', insertError.message);
        throw new Error(`Failed to insert performance check: ${insertError.message}`);
      }

      // 8. Update opportunity's performance_status and last_checked_at
      const updateData: Record<string, unknown> = {
        performance_status: status,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 9. Auto-complete if improved by >5 positions
      if (
        status === 'improved' &&
        positionBefore !== null &&
        positionAfter !== null &&
        positionBefore - positionAfter >= this.AUTO_COMPLETE_THRESHOLD
      ) {
        updateData.status = 'completed';
        console.log(
          `[OpportunityPerformance] Auto-completing ${opportunity.id} (improved by ${positionBefore - positionAfter} positions)`
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('opportunities')
        .update(updateData)
        .eq('id', opportunity.id);

      if (updateError) {
        console.error('[OpportunityPerformance] Failed to update opportunity:', updateError.message);
        throw new Error(`Failed to update opportunity: ${updateError.message}`);
      }

      result.success = true;
      result.status = status;
      result.positionBefore = positionBefore;
      result.positionAfter = positionAfter;

      console.log(
        `[OpportunityPerformance] Check complete for ${opportunity.id}: ${status} (pos: ${positionBefore} -> ${positionAfter})`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OpportunityPerformance] Check failed for ${opportunity.id}:`, errorMessage);
      result.error = errorMessage;
    }

    return result;
  }

  /**
   * Process all opportunities due for performance check.
   * Called by the cron endpoint.
   *
   * @returns Summary of processed opportunities
   */
  async processDueOpportunities(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    results: IPerformanceCheckResult[];
  }> {
    const opportunities = await this.getOpportunitiesDueForCheck();
    const results: IPerformanceCheckResult[] = [];

    for (const opportunity of opportunities) {
      const result = await this.checkPerformance(opportunity);
      results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(
      `[OpportunityPerformance] Processed ${opportunities.length} opportunities: ${succeeded} succeeded, ${failed} failed`
    );

    return {
      processed: opportunities.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Get performance check history for an opportunity.
   *
   * @param opportunityId The opportunity ID
   * @returns Array of performance checks ordered by date descending
   */
  async getPerformanceHistory(opportunityId: string): Promise<IOpportunityPerformanceCheck[]> {
    const { data, error } = await supabaseAdmin
      .from('opportunity_performance_checks')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('check_date', { ascending: false });

    if (error) {
      console.error('[OpportunityPerformance] Failed to fetch history:', error.message);
      throw new Error(`Failed to fetch performance history: ${error.message}`);
    }

    return (data ?? []) as IOpportunityPerformanceCheck[];
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const opportunityPerformanceService = new OpportunityPerformanceService();
