/**
 * Opportunity Analysis API Route
 * POST /api/opportunities/analyze — Trigger GSC data analysis for a project
 *
 * Flow:
 * 1. Verify project ownership
 * 2. Get active GSC connection
 * 3. Ensure valid access token (refresh if needed)
 * 4. Fetch search analytics (last 28 days)
 * 5. Store as GSC snapshot
 * 6. Run opportunity analysis
 * 7. Upsert results to DB
 * 8. Return analysis response
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { gscService } from '@server/services/gsc.service';
import { opportunityAnalysisService } from '@server/services/opportunity-analysis.service';
import { analyzeOpportunitiesSchema } from '@shared/validation/opportunity.schema';
import { GscConnectionError } from '@shared/types/opportunity.types';
import type {
  IAnalyzeOpportunitiesResponse,
  IGscConnection,
  IGscSnapshotData,
  IGscQueryRow,
  IGscPageRow,
  IGscSnapshot,
  IOpportunity,
  IGscQueryPagePair,
} from '@shared/types/opportunity.types';
import { withAuthAndBody, jsonResponse, errorResponse } from '../_utils';

/**
 * POST /api/opportunities/analyze
 * Trigger opportunity analysis for a project
 */
export const POST = withAuthAndBody(analyzeOpportunitiesSchema, async (userId, body) => {
  const { projectId } = body;

  // 1. Verify project ownership
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return errorResponse('NOT_FOUND', 'Project not found or access denied', 404);
  }

  // 2. Fetch active GSC connection for this project
  const { data: connection, error: connError } = await supabaseAdmin
    .from('gsc_connections')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (connError || !connection) {
    throw new GscConnectionError(projectId);
  }

  const gscConnection = connection as IGscConnection;

  // 3. Get valid access token (refresh if expired)
  const accessToken = await gscService.getValidAccessToken(gscConnection);

  if (!gscConnection.site_url) {
    throw new GscConnectionError(projectId, 'GSC connection has no site URL selected');
  }

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
      project_id: projectId,
      user_id: userId,
      date_range_start: formatDate(startDate),
      date_range_end: formatDate(endDate),
      data: snapshotData,
      query_count: snapshotData.queries.length,
    })
    .select()
    .single();

  if (snapshotError || !snapshot) {
    console.error('[OpportunitiesAnalyze] Failed to store snapshot:', snapshotError?.message);
    return errorResponse('INTERNAL_ERROR', 'Failed to store GSC snapshot', 500);
  }

  // Update last_synced_at on the connection
  await supabaseAdmin
    .from('gsc_connections')
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', gscConnection.id);

  // 7. Get existing opportunities for merge/dedup
  const { data: existingOpportunities } = await supabaseAdmin
    .from('opportunities')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId);

  // 8. Fetch the most recent previous snapshot for declining position detection
  const { data: previousSnapshotData } = await supabaseAdmin
    .from('gsc_snapshots')
    .select('*')
    .eq('connection_id', gscConnection.id)
    .eq('project_id', projectId)
    .neq('id', snapshot.id) // Exclude the current snapshot
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousSnapshot = previousSnapshotData as IGscSnapshot | null;

  // 9. Run analysis (with previous snapshot for declining position detection)
  const { newOpportunities, updatedOpportunities } =
    await opportunityAnalysisService.analyzeSnapshot(
      snapshot as IGscSnapshot,
      (existingOpportunities as IOpportunity[]) ?? [],
      projectId,
      userId,
      previousSnapshot ?? undefined
    );

  // 9. Upsert results to DB
  if (newOpportunities.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('opportunities')
      .insert(newOpportunities);

    if (insertError) {
      console.error('[OpportunitiesAnalyze] Failed to insert opportunities:', insertError.message);
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
      console.error(
        '[OpportunitiesAnalyze] Failed to update opportunity:',
        updated.id,
        updateError.message
      );
    }
  }

  // 10. Return response
  const allOpportunities = [...newOpportunities, ...updatedOpportunities];
  const response: IAnalyzeOpportunitiesResponse = {
    opportunities: allOpportunities,
    newCount: newOpportunities.length,
    updatedCount: updatedOpportunities.length,
  };

  return jsonResponse(response);
});

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
