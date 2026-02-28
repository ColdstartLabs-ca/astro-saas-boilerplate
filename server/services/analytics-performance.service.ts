/**
 * Analytics Performance Service
 * Syncs Google Search Console data per published article and stores snapshots.
 */

import dayjs from 'dayjs';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { gscService } from '@server/services/gsc.service';
import { GscConnectionError } from '@shared/types/opportunity.types';
import type { IGscConnection } from '@shared/types/opportunity.types';
import type {
  IAnalyticsSyncResponse,
  ITopQuery,
  IArticlePerformanceRow,
  ICampaignPerformanceRow,
  IPerformanceSummary,
  IAnalyticsData,
} from '@shared/types/article-performance.types';

// =============================================================================
// Internal Types
// =============================================================================

interface IArticleRow {
  id: string;
  title: string | null;
  published_url: string;
  campaign_id: string | null;
}

interface IGscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface IPageGroup {
  clicks: number;
  impressions: number;
  queries: IGscRowWithQuery[];
}

interface IGscRowWithQuery extends IGscRow {
  query: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize a URL for consistent matching:
 * - Lowercase
 * - Strip trailing slash(es)
 */
function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, '');
}

// =============================================================================
// Service
// =============================================================================

export class AnalyticsPerformanceService {
  /**
   * Sync GSC performance data for all published articles in a project.
   * Upserts daily snapshots into article_performance_snapshots.
   */
  async syncPerformanceData(
    userId: string,
    projectId: string,
    dateRangeDays: 7 | 28 | 90
  ): Promise<IAnalyticsSyncResponse> {
    // 1. Load active GSC connection for this project
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

    // 4. Verify site_url is set
    if (!gscConnection.site_url) {
      throw new GscConnectionError(projectId, 'GSC connection has no site URL selected');
    }

    // 5. Load all published articles with a URL for this user + project
    const { data: articles, error: articlesError } = await supabaseAdmin
      .from('articles')
      .select('id, title, published_url, campaign_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('status', 'published')
      .not('published_url', 'is', null);

    if (articlesError) {
      console.error(
        '[AnalyticsPerformanceService] Failed to load articles:',
        articlesError.message
      );
      throw new Error('Failed to load articles');
    }

    const publishedArticles = (articles ?? []) as IArticleRow[];

    // 6. No published articles — nothing to sync
    if (publishedArticles.length === 0) {
      return { synced: 0, skipped: 0, reason: 'No published articles with URL' };
    }

    // 7. Compute date range
    const endDate = dayjs().format('YYYY-MM-DD');
    const startDate = dayjs().subtract(dateRangeDays, 'day').format('YYYY-MM-DD');

    // 8. Fetch GSC search analytics
    const analyticsResponse = await gscService.getSearchAnalytics(
      accessToken,
      gscConnection.site_url,
      startDate,
      endDate,
      { dimensions: ['query', 'page'], rowLimit: 5000 }
    );

    const rows = (analyticsResponse.rows ?? []) as IGscRow[];

    // 9. Group GSC rows by normalized page URL
    const pageGroups = new Map<string, IPageGroup>();

    for (const row of rows) {
      const query = row.keys[0] ?? '';
      const page = row.keys[1] ?? '';

      if (!page) continue;

      const normalizedPage = normalizeUrl(page);
      const existing = pageGroups.get(normalizedPage);

      if (existing) {
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
        existing.queries.push({ ...row, query });
      } else {
        pageGroups.set(normalizedPage, {
          clicks: row.clicks,
          impressions: row.impressions,
          queries: [{ ...row, query }],
        });
      }
    }

    // 10–12. Match articles to GSC page groups and build snapshot rows
    let synced = 0;
    let skipped = 0;

    const snapshotDate = dayjs().format('YYYY-MM-DD');

    type SnapshotRow = {
      article_id: string;
      user_id: string;
      snapshot_date: string;
      date_range_days: number;
      clicks: number;
      impressions: number;
      ctr: number;
      avg_position: number;
      top_queries: ITopQuery[];
    };

    const snapshotRows: SnapshotRow[] = [];

    for (const article of publishedArticles) {
      const normalizedArticleUrl = normalizeUrl(article.published_url);
      const group = pageGroups.get(normalizedArticleUrl);

      if (!group || group.impressions === 0) {
        skipped++;
        continue;
      }

      // Aggregate metrics
      const clicks = group.clicks;
      const impressions = group.impressions;
      const ctr = impressions > 0 ? clicks / impressions : 0;

      // Weighted average position (weighted by impressions per query row)
      const totalWeightedPosition = group.queries.reduce(
        (sum, q) => sum + q.position * q.impressions,
        0
      );
      const avgPosition = impressions > 0 ? totalWeightedPosition / impressions : 0;

      // Top 10 queries by clicks descending
      const topQueries: ITopQuery[] = group.queries
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)
        .map(q => ({
          query: q.query,
          clicks: q.clicks,
          impressions: q.impressions,
          position: q.position,
        }));

      snapshotRows.push({
        article_id: article.id,
        user_id: userId,
        snapshot_date: snapshotDate,
        date_range_days: dateRangeDays,
        clicks,
        impressions,
        ctr,
        avg_position: avgPosition,
        top_queries: topQueries,
      });

      synced++;
    }

    // 11. Upsert snapshots
    if (snapshotRows.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('article_performance_snapshots')
        .upsert(snapshotRows, { onConflict: 'article_id,snapshot_date,date_range_days' });

      if (upsertError) {
        console.error(
          '[AnalyticsPerformanceService] Failed to upsert snapshots:',
          upsertError.message
        );
        throw new Error('Failed to store performance snapshots');
      }
    }

    console.log(
      `[AnalyticsPerformanceService] Sync complete for project ${projectId}: synced=${synced}, skipped=${skipped}`
    );

    // 13. Return result
    return { synced, skipped };
  }

  /**
   * Retrieve aggregated performance data for all published articles in a project.
   * Returns per-article rows, campaign aggregates, and summary totals built from
   * the most recent snapshot per article for the requested date range.
   */
  async getPerformanceData(
    userId: string,
    projectId: string,
    dateRangeDays: 7 | 28 | 90 = 28
  ): Promise<IAnalyticsData> {
    // 1. Check if an active GSC connection exists for this project
    const { data: connection } = await supabaseAdmin
      .from('gsc_connections')
      .select('id, last_synced_at')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const hasGscConnection = !!connection;

    // 2a. Load all published articles with a URL for this user + project
    const { data: articles } = await supabaseAdmin
      .from('articles')
      .select('id, title, primary_keyword, published_url, published_at, campaign_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('status', 'published')
      .not('published_url', 'is', null);

    const articleList = (articles ?? []) as Array<{
      id: string;
      title: string | null;
      primary_keyword: string | null;
      published_url: string;
      published_at: string | null;
      campaign_id: string | null;
    }>;

    const articleIds = articleList.map(a => a.id);

    // 2b. Load campaign names for all campaigns referenced by articles
    const campaignIds = [
      ...new Set(articleList.map(a => a.campaign_id).filter(Boolean)),
    ] as string[];

    const { data: campaigns } =
      campaignIds.length > 0
        ? await supabaseAdmin.from('campaigns').select('id, name').in('id', campaignIds)
        : { data: [] as Array<{ id: string; name: string }> };

    const campaignMap = new Map((campaigns ?? []).map(c => [c.id, c.name]));

    // 2c. Get the most recent snapshot per article for this date_range_days
    const snapshotRows: IArticlePerformanceRow[] = [];
    let lastSyncedAt: string | null = null;

    if (articleIds.length > 0) {
      const { data: snapshots } = await supabaseAdmin
        .from('article_performance_snapshots')
        .select('article_id, snapshot_date, clicks, impressions, ctr, avg_position, top_queries')
        .in('article_id', articleIds)
        .eq('date_range_days', dateRangeDays)
        .order('snapshot_date', { ascending: false });

      // Keep only the most recent snapshot per article (query is already ordered DESC)
      type SnapshotRecord = {
        article_id: string;
        snapshot_date: string;
        clicks: number;
        impressions: number;
        ctr: number;
        avg_position: number;
        top_queries: unknown;
      };

      const latestByArticle = new Map<string, SnapshotRecord>();
      for (const snap of (snapshots ?? []) as SnapshotRecord[]) {
        if (!latestByArticle.has(snap.article_id)) {
          latestByArticle.set(snap.article_id, snap);
          if (!lastSyncedAt || snap.snapshot_date > lastSyncedAt) {
            lastSyncedAt = snap.snapshot_date;
          }
        }
      }

      for (const article of articleList) {
        const snap = latestByArticle.get(article.id);
        if (snap) {
          snapshotRows.push({
            article_id: article.id,
            title: article.title,
            primary_keyword: article.primary_keyword ?? '',
            published_url: article.published_url,
            published_at: article.published_at,
            campaign_id: article.campaign_id ?? '',
            campaign_name: campaignMap.get(article.campaign_id ?? '') ?? 'Unknown Campaign',
            clicks: snap.clicks,
            impressions: snap.impressions,
            ctr: snap.ctr,
            avg_position: snap.avg_position,
            top_queries: (snap.top_queries as ITopQuery[]) ?? [],
            snapshot_date: snap.snapshot_date,
          });
        }
      }
    }

    // 3. Compute campaign-level aggregates from snapshot rows
    const campaignAggMap = new Map<string, ICampaignPerformanceRow & { _count: number }>();
    for (const row of snapshotRows) {
      const existing = campaignAggMap.get(row.campaign_id);
      if (existing) {
        existing._count++;
        existing.article_count = existing._count;
        existing.total_clicks += row.clicks;
        existing.total_impressions += row.impressions;
        // Running weighted average for position
        existing.avg_position =
          (existing.avg_position * (existing._count - 1) + row.avg_position) / existing._count;
      } else {
        campaignAggMap.set(row.campaign_id, {
          campaign_id: row.campaign_id,
          campaign_name: row.campaign_name,
          article_count: 1,
          total_clicks: row.clicks,
          total_impressions: row.impressions,
          avg_ctr: 0, // computed after full aggregation
          avg_position: row.avg_position,
          _count: 1,
        });
      }
    }

    const campaignResultRows: ICampaignPerformanceRow[] = Array.from(campaignAggMap.values()).map(
      ({ _count: _ignored, ...c }) => ({
        ...c,
        avg_ctr: c.total_impressions > 0 ? c.total_clicks / c.total_impressions : 0,
      })
    );

    // 4. Compute summary totals
    const totalClicks = snapshotRows.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = snapshotRows.reduce((s, r) => s + r.impressions, 0);
    const avgPosition =
      snapshotRows.length > 0
        ? snapshotRows.reduce((s, r) => s + r.avg_position, 0) / snapshotRows.length
        : 0;

    const summary: IPerformanceSummary = {
      total_clicks: totalClicks,
      total_impressions: totalImpressions,
      avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      avg_position: avgPosition,
      articles_tracked: snapshotRows.length,
      articles_published: articleList.length,
    };

    return {
      articles: snapshotRows,
      campaigns: campaignResultRows,
      summary,
      lastSyncedAt,
      hasGscConnection,
      dateRangeDays,
    };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const analyticsPerformanceService = new AnalyticsPerformanceService();
