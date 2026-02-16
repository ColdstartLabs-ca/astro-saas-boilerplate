/**
 * Admin Stats Service
 *
 * Handles admin statistics and failure metrics.
 * Extracted from AdminController for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';

// =============================================================================
// Types
// =============================================================================

export interface IAdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalCreditsIssued: number;
  totalCreditsUsed: number;
}

export type TimeWindow = 'last_hour' | 'last_24h' | 'last_7d' | 'last_30d';
export type GroupBy = 'stage' | 'provider' | 'model' | 'summary' | 'rate_over_time';

export interface IFailureMetricsParams {
  timeWindow: TimeWindow;
  groupBy: GroupBy;
  userId?: string;
  projectId?: string;
}

export interface IFailureMetricsResponse {
  timeWindow: string;
  groupBy: string;
  data: unknown;
}

// =============================================================================
// Admin Stats Service Class
// =============================================================================

export class AdminStatsService {
  /**
   * Get admin statistics (total users, active subscriptions, credits issued/used)
   */
  async getStats(): Promise<IAdminStats> {
    const [usersResult, subscriptionsResult, creditsResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabaseAdmin.from('credit_transactions').select('amount, type'),
    ]);

    const totalCreditsIssued = (creditsResult.data || [])
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCreditsUsed = Math.abs(
      (creditsResult.data || [])
        .filter(t => t.type === 'usage')
        .reduce((sum, t) => sum + t.amount, 0)
    );

    return {
      totalUsers: usersResult.count || 0,
      activeSubscriptions: subscriptionsResult.count || 0,
      totalCreditsIssued,
      totalCreditsUsed,
    };
  }

  /**
   * Get failure metrics based on grouping type
   */
  async getFailureMetrics(params: IFailureMetricsParams): Promise<IFailureMetricsResponse> {
    const hours = this.timeWindowToHours(params.timeWindow);

    switch (params.groupBy) {
      case 'stage':
        return this.getFailuresByStage(hours, params.userId, params.projectId);

      case 'provider':
        return this.getFailuresByProvider(hours, params.userId, params.projectId);

      case 'model':
        return this.getFailuresByModel(hours, params.userId, params.projectId);

      case 'rate_over_time':
        return this.getFailureRateOverTime(hours, params.userId, params.projectId);

      case 'summary':
      default:
        return this.getFailureSummary(hours, params.userId, params.projectId);
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  private timeWindowToHours(timeWindow: TimeWindow): number {
    const hoursMap: Record<TimeWindow, number> = {
      last_hour: 1,
      last_24h: 24,
      last_7d: 24 * 7,
      last_30d: 24 * 30,
    };
    return hoursMap[timeWindow] || 24;
  }

  private hoursToTimeWindow(hours: number): string {
    if (hours === 1) return 'last_hour';
    if (hours === 24) return 'last_24h';
    if (hours === 24 * 7) return 'last_7d';
    if (hours === 24 * 30) return 'last_30d';
    return 'custom';
  }

  private async getFailuresByStage(
    hoursAgo: number,
    userId?: string,
    projectId?: string
  ): Promise<IFailureMetricsResponse> {
    const { data, error } = await supabaseAdmin.rpc('get_failure_metrics_by_stage', {
      p_hours_ago: hoursAgo,
      p_user_id: userId || null,
      p_project_id: projectId || null,
    });

    if (error) throw error;

    return {
      timeWindow: this.hoursToTimeWindow(hoursAgo),
      groupBy: 'stage',
      data: data || [],
    };
  }

  private async getFailuresByProvider(
    hoursAgo: number,
    userId?: string,
    projectId?: string
  ): Promise<IFailureMetricsResponse> {
    const { data, error } = await supabaseAdmin.rpc('get_failure_metrics_by_provider', {
      p_hours_ago: hoursAgo,
      p_user_id: userId || null,
      p_project_id: projectId || null,
    });

    if (error) throw error;

    return {
      timeWindow: this.hoursToTimeWindow(hoursAgo),
      groupBy: 'provider',
      data: data || [],
    };
  }

  private async getFailuresByModel(
    hoursAgo: number,
    userId?: string,
    projectId?: string
  ): Promise<IFailureMetricsResponse> {
    const { data, error } = await supabaseAdmin.rpc('get_failure_metrics_by_model', {
      p_hours_ago: hoursAgo,
      p_user_id: userId || null,
      p_project_id: projectId || null,
    });

    if (error) throw error;

    return {
      timeWindow: this.hoursToTimeWindow(hoursAgo),
      groupBy: 'model',
      data: data || [],
    };
  }

  private async getFailureRateOverTime(
    hoursAgo: number,
    userId?: string,
    projectId?: string
  ): Promise<IFailureMetricsResponse> {
    const { data, error } = await supabaseAdmin.rpc('get_failure_rate_over_time', {
      p_hours_ago: hoursAgo,
      p_user_id: userId || null,
      p_project_id: projectId || null,
    });

    if (error) throw error;

    return {
      timeWindow: this.hoursToTimeWindow(hoursAgo),
      groupBy: 'rate_over_time',
      data: data || [],
    };
  }

  private async getFailureSummary(
    hoursAgo: number,
    userId?: string,
    projectId?: string
  ): Promise<IFailureMetricsResponse> {
    const { data, error } = await supabaseAdmin.rpc('get_failure_summary', {
      p_hours_ago: hoursAgo,
      p_user_id: userId || null,
      p_project_id: projectId || null,
    });

    if (error) throw error;

    return {
      timeWindow: this.hoursToTimeWindow(hoursAgo),
      groupBy: 'summary',
      data: data?.[0] || null,
    };
  }
}

// Export singleton instance
export const adminStatsService = new AdminStatsService();
