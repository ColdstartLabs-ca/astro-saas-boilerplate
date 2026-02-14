/**
 * Opportunity Scheduler Service
 * Handles scheduled re-analysis of GSC data for opportunity detection.
 *
 * Flow:
 * 1. Find connections due for analysis (auto_analyze = true, next_analyze_at <= NOW())
 * 2. Run the same analysis flow as manual "Analyze Now"
 * 3. Update schedule after completion
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { gscService } from '@server/services/gsc.service';
import { opportunityAnalysisService } from '@server/services/opportunity-analysis.service';
import dayjs from 'dayjs';
import type { IGscConnection, IGscSnapshot, IGscSnapshotData, IGscQueryRow, IGscPageRow, IGscQueryPagePair, IOpportunity } from '@shared/types/opportunity.types';

// =============================================================================
// Types
// =============================================================================

export type AnalyzeFrequency = 'daily' | 'weekly' | 'biweekly';

export interface IScheduledConnection {
  id: string;
  user_id: string;
  project_id: string;
  site_url: string | null;
  analyze_frequency: AnalyzeFrequency;
  next_analyze_at: string | null;
  last_analyzed_at: string | null;
}

export interface IAnalysisResult {
  connectionId: string;
  projectId: string;
  success: boolean;
  newOpportunities: number;
  updatedOpportunities: number;
  error?: string;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Manages scheduled opportunity analysis for GSC connections.
 */
export class OpportunitySchedulerService {
  /**
   * Maximum number of connections to process per cron run.
   * Prevents timeout on Cloudflare Workers (10ms CPU limit).
   */
  private readonly MAX_CONNECTIONS_PER_RUN = 5;

  /**
   * Get all GSC connections that are due for scheduled analysis.
   *
   * Criteria:
   * - auto_analyze = true
   * - next_analyze_at <= NOW() (or NULL, meaning never run)
   * - status = 'active'
   * - site_url IS NOT NULL (must have a site selected)
   *
   * @param limit Maximum connections to return
   * @returns Array of connections due for analysis
   */
  async getConnectionsDueForAnalysis(limit = this.MAX_CONNECTIONS_PER_RUN): Promise<IScheduledConnection[]> {
    const { data, error } = await supabaseAdmin
      .from('gsc_connections')
      .select('id, user_id, project_id, site_url, analyze_frequency, next_analyze_at, last_analyzed_at')
      .eq('auto_analyze', true)
      .eq('status', 'active')
      .not('site_url', 'is', null)
      .or(`next_analyze_at.is.null,next_analyze_at.lte.${new Date().toISOString()}`)
      .order('next_analyze_at', { ascending: true, nullsFirst: true })
      .limit(limit);

    if (error) {
      // If the new columns don't exist yet (migration not applied), return empty array
      // This allows the service to work during the transition period
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        console.warn('[OpportunityScheduler] Scheduling columns not yet migrated, returning empty result');
        return [];
      }
      console.error('[OpportunityScheduler] Failed to fetch due connections:', error.message);
      throw new Error(`Failed to fetch connections due for analysis: ${error.message}`);
    }

    console.log(`[OpportunityScheduler] Found ${data?.length ?? 0} connections due for analysis`);
    return (data ?? []) as IScheduledConnection[];
  }

  /**
   * Calculate the next analysis date based on frequency.
   *
   * @param frequency Analysis frequency setting
   * @returns ISO timestamp for next analysis
   */
  calculateNextAnalyzeAt(frequency: AnalyzeFrequency): string {
    const now = dayjs();

    switch (frequency) {
      case 'daily':
        return now.add(1, 'day').toISOString();
      case 'weekly':
        return now.add(7, 'day').toISOString();
      case 'biweekly':
        return now.add(14, 'day').toISOString();
      default:
        return now.add(7, 'day').toISOString(); // Default to weekly
    }
  }

  /**
   * Update the schedule timestamps after a completed analysis.
   *
   * @param connectionId The connection ID to update
   * @param frequency The frequency setting (used to calculate next_analyze_at)
   */
  async updateScheduleAfterAnalysis(connectionId: string, frequency: AnalyzeFrequency): Promise<void> {
    const now = new Date().toISOString();
    const nextAnalyzeAt = this.calculateNextAnalyzeAt(frequency);

    const { error } = await supabaseAdmin
      .from('gsc_connections')
      .update({
        last_analyzed_at: now,
        next_analyze_at: nextAnalyzeAt,
        last_synced_at: now, // Also update last_synced_at
        updated_at: now,
      })
      .eq('id', connectionId);

    if (error) {
      console.error('[OpportunityScheduler] Failed to update schedule:', error.message);
      throw new Error(`Failed to update schedule: ${error.message}`);
    }

    console.log(`[OpportunityScheduler] Updated schedule for ${connectionId}, next run at ${nextAnalyzeAt}`);
  }

  /**
   * Run scheduled analysis for a specific connection.
   * This is the same flow as manual "Analyze Now" but triggered by cron.
   *
   * @param connection The connection to analyze
   * @returns Analysis result with counts and status
   */
  async runScheduledAnalysis(connection: IScheduledConnection): Promise<IAnalysisResult> {
    const result: IAnalysisResult = {
      connectionId: connection.id,
      projectId: connection.project_id,
      success: false,
      newOpportunities: 0,
      updatedOpportunities: 0,
    };

    try {
      console.log(`[OpportunityScheduler] Starting analysis for connection ${connection.id}`);

      // 1. Get the full connection with tokens
      const { data: fullConnection, error: connError } = await supabaseAdmin
        .from('gsc_connections')
        .select('*')
        .eq('id', connection.id)
        .single();

      if (connError || !fullConnection) {
        throw new Error(`Failed to fetch connection: ${connError?.message ?? 'Not found'}`);
      }

      const gscConnection = fullConnection as IGscConnection;

      // 2. Ensure site_url exists
      if (!gscConnection.site_url) {
        throw new Error('Connection has no site URL selected');
      }

      // 3. Get valid access token (refresh if expired)
      const accessToken = await gscService.getValidAccessToken(gscConnection);

      // 4. Fetch search analytics (last 28 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 28);

      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      const analyticsResponse = await gscService.getSearchAnalytics(
        accessToken,
        gscConnection.site_url,
        formatDate(startDate),
        formatDate(endDate)
      );

      // 5. Transform raw GSC data into snapshot format
      const snapshotData = transformToSnapshotData(analyticsResponse.rows ?? []);

      // 6. Store GSC snapshot
      const { data: snapshot, error: snapshotError } = await supabaseAdmin
        .from('gsc_snapshots')
        .insert({
          connection_id: gscConnection.id,
          project_id: connection.project_id,
          user_id: connection.user_id,
          date_range_start: formatDate(startDate),
          date_range_end: formatDate(endDate),
          data: snapshotData,
          query_count: snapshotData.queries.length,
        })
        .select()
        .single();

      if (snapshotError || !snapshot) {
        throw new Error(`Failed to store snapshot: ${snapshotError?.message ?? 'Unknown error'}`);
      }

      // 7. Get existing opportunities for merge/dedup
      const { data: existingOpportunities } = await supabaseAdmin
        .from('opportunities')
        .select('*')
        .eq('project_id', connection.project_id)
        .eq('user_id', connection.user_id);

      // 8. Fetch the most recent previous snapshot for declining position detection
      const { data: previousSnapshotData } = await supabaseAdmin
        .from('gsc_snapshots')
        .select('*')
        .eq('connection_id', gscConnection.id)
        .eq('project_id', connection.project_id)
        .neq('id', snapshot.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const previousSnapshot = previousSnapshotData as IGscSnapshot | null;

      // 9. Run analysis
      const { newOpportunities, updatedOpportunities } =
        await opportunityAnalysisService.analyzeSnapshot(
          snapshot as IGscSnapshot,
          (existingOpportunities as IOpportunity[]) ?? [],
          connection.project_id,
          connection.user_id,
          previousSnapshot ?? undefined
        );

      // 10. Upsert results to DB
      if (newOpportunities.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('opportunities')
          .insert(newOpportunities);

        if (insertError) {
          console.error('[OpportunityScheduler] Failed to insert opportunities:', insertError.message);
        }
      }

      for (const updated of updatedOpportunities) {
        const { error: updateError } = await supabaseAdmin
          .from('opportunities')
          .update({
            snapshot_id: updated.snapshot_id,
            metrics: updated.metrics,
            priority_score: updated.priority_score,
            estimated_impact: updated.estimated_impact,
            title: updated.title,
            description: updated.description,
            updated_at: updated.updated_at,
          })
          .eq('id', updated.id);

        if (updateError) {
          console.error('[OpportunityScheduler] Failed to update opportunity:', updated.id, updateError.message);
        }
      }

      // 11. Update schedule after successful analysis
      await this.updateScheduleAfterAnalysis(connection.id, connection.analyze_frequency);

      result.success = true;
      result.newOpportunities = newOpportunities.length;
      result.updatedOpportunities = updatedOpportunities.length;

      console.log(
        `[OpportunityScheduler] Analysis complete for ${connection.id}: ${newOpportunities.length} new, ${updatedOpportunities.length} updated`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OpportunityScheduler] Analysis failed for ${connection.id}:`, errorMessage);
      result.error = errorMessage;
    }

    return result;
  }

  /**
   * Process all connections due for analysis.
   * Called by the cron endpoint.
   *
   * @returns Summary of processed connections
   */
  async processDueConnections(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    results: IAnalysisResult[];
  }> {
    const connections = await this.getConnectionsDueForAnalysis();
    const results: IAnalysisResult[] = [];

    for (const connection of connections) {
      const result = await this.runScheduledAnalysis(connection);
      results.push(result);
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      processed: connections.length,
      succeeded,
      failed,
      results,
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

interface IRawGscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Transform raw GSC API rows (query + page dimensions) into the snapshot data format.
 * Aggregates per-query and per-page data, plus totals.
 * Also preserves raw query+page pairs for detailed analysis (cannibalization detection).
 */
function transformToSnapshotData(rows: IRawGscRow[]): IGscSnapshotData {
  const queryMap = new Map<string, IGscQueryRow>();
  const pageMap = new Map<string, IGscPageRow>();
  const queryPagePairs: IGscQueryPagePair[] = [];
  let totalClicks = 0;
  let totalImpressions = 0;
  let totalCtr = 0;
  let totalPosition = 0;

  for (const row of rows) {
    const query = row.keys[0] ?? '';
    const page = row.keys[1] ?? '';

    totalClicks += row.clicks;
    totalImpressions += row.impressions;

    // Preserve raw query+page pair for detailed analysis
    if (query && page) {
      queryPagePairs.push({
        query,
        page,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      });
    }

    // Aggregate by query
    const existing = queryMap.get(query);
    if (existing) {
      existing.clicks += row.clicks;
      existing.impressions += row.impressions;
      // Use weighted average for position and CTR
      existing.position =
        (existing.position * (existing.impressions - row.impressions) +
          row.position * row.impressions) /
        existing.impressions;
      existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
    } else {
      queryMap.set(query, {
        query,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        page: page || undefined,
      });
    }

    // Aggregate by page
    if (page) {
      const existingPage = pageMap.get(page);
      if (existingPage) {
        existingPage.clicks += row.clicks;
        existingPage.impressions += row.impressions;
        existingPage.position =
          (existingPage.position * (existingPage.impressions - row.impressions) +
            row.position * row.impressions) /
          existingPage.impressions;
        existingPage.ctr =
          existingPage.impressions > 0 ? existingPage.clicks / existingPage.impressions : 0;
      } else {
        pageMap.set(page, {
          page,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        });
      }
    }
  }

  const queryCount = queryMap.size;
  if (queryCount > 0) {
    totalCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    // Average position across all rows
    totalPosition =
      rows.reduce((sum, r) => sum + r.position * r.impressions, 0) / Math.max(1, totalImpressions);
  }

  return {
    queries: Array.from(queryMap.values()),
    pages: Array.from(pageMap.values()),
    totals: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalCtr,
      position: totalPosition,
    },
    // Include raw query+page pairs for cannibalization detection
    queryPagePairs,
  };
}

// =============================================================================
// Singleton Export
// =============================================================================

export const opportunitySchedulerService = new OpportunitySchedulerService();
