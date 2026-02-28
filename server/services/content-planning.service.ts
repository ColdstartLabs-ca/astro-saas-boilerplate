/**
 * Content Planning Service
 *
 * Creates 'planned' article stubs from a campaign's pending keywords,
 * distributing them across future dates based on the campaign's schedule frequency.
 * Planned articles have no content and no credits spent — they are lightweight placeholders.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { CampaignNotFoundError } from '@shared/types/campaign.types';
import type { ScheduleFrequency, IKeywordCoverage } from '@shared/types/campaign.types';
import type { IPlanContentResponse } from '@shared/types/calendar.types';
import { keywordCannibalizationService } from './keyword-cannibalization.service';
import {
  calculateNextRunAt,
  DEFAULT_SCHEDULE_TIMEZONE,
  DEFAULT_SCHEDULE_HOUR,
  SCHEDULE_FREQUENCIES,
} from '@shared/config/scheduling.config';

// =============================================================================
// Content Planning Service Class
// =============================================================================

export class ContentPlanningService {
  /**
   * Plan content for a campaign by creating 'planned' article stubs from
   * pending keywords, spaced according to the campaign's schedule frequency.
   *
   * - Validates campaign ownership
   * - Deletes any existing planned articles for the campaign
   * - Inserts new planned articles for each pending keyword with calculated dates
   *
   * @param campaignId - The campaign ID to plan content for
   * @param userId - The user ID making the request (must own the campaign)
   * @returns Object with count of planned articles and date range
   * @throws CampaignNotFoundError if campaign not found or not owned by user
   */
  async planContent(campaignId: string, userId: string): Promise<IPlanContentResponse> {
    // Step 1: Fetch campaign with ownership check
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, user_id, project_id, schedule_frequency, schedule_hour, schedule_timezone')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // Step 2: Fetch pending keywords for this campaign
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('id, keyword')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('priority', { ascending: false });

    if (keywordsError) {
      throw new Error(`Failed to fetch pending keywords: ${keywordsError.message}`);
    }

    // Step 3: Return early if no pending keywords
    if (!keywords || keywords.length === 0) {
      return { planned: 0, startDate: null, endDate: null, message: 'No pending keywords' };
    }

    // Step 3b: Re-check sitemap coverage (catches new content published since keywords were added)
    let keywordsToPlan = keywords;
    const skippedAsCovered: IKeywordCoverage[] = [];

    if (campaign.project_id) {
      try {
        const coverageResult = await keywordCannibalizationService.checkSitemapCoverage(
          campaign.project_id,
          keywords.map(k => k.keyword)
        );
        skippedAsCovered.push(...coverageResult.covered);
        // Filter to only plan uncovered keywords
        const uncoveredSet = new Set(coverageResult.uncovered.map(k => k.toLowerCase().trim()));
        keywordsToPlan = keywords.filter(k => uncoveredSet.has(k.keyword.toLowerCase().trim()));
      } catch (error) {
        console.warn('[ContentPlanningService] Sitemap coverage check failed:', error);
        // Fail-open: plan all keywords
      }
    }

    if (keywordsToPlan.length === 0) {
      return {
        planned: 0,
        startDate: null,
        endDate: null,
        message: 'All keywords already covered by published content',
        skippedAsCovered,
      };
    }

    // Step 4: Delete existing planned articles for this campaign
    const { error: deleteError } = await supabaseAdmin
      .from('articles')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('status', 'planned');

    if (deleteError) {
      throw new Error(`Failed to delete existing planned articles: ${deleteError.message}`);
    }

    // Step 5: Calculate scheduled dates for each keyword
    const frequency = (campaign.schedule_frequency as ScheduleFrequency) ?? 'daily';
    const scheduleHour = campaign.schedule_hour ?? DEFAULT_SCHEDULE_HOUR;
    const scheduleTimezone = campaign.schedule_timezone ?? DEFAULT_SCHEDULE_TIMEZONE;

    const frequencyConfig = SCHEDULE_FREQUENCIES[frequency];
    const intervalMs = frequencyConfig.intervalHours * 60 * 60 * 1000;

    // Start from tomorrow at the configured hour in the configured timezone
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scheduledDates: string[] = keywordsToPlan.map((_, index) => {
      const baseDate = new Date(tomorrow.getTime() + index * intervalMs);
      return calculateNextRunAt(frequency, scheduleTimezone, scheduleHour, baseDate);
    });

    // Step 6: Insert planned article stubs
    const articlesToInsert = keywordsToPlan.map((keyword, index) => ({
      campaign_id: campaignId,
      user_id: userId,
      project_id: campaign.project_id ?? null,
      primary_keyword: keyword.keyword,
      title: keyword.keyword,
      content: null,
      status: 'planned' as const,
      credits_used: 0,
      scheduled_publish_at: scheduledDates[index],
    }));

    const { error: insertError } = await supabaseAdmin.from('articles').insert(articlesToInsert);

    if (insertError) {
      throw new Error(`Failed to insert planned articles: ${insertError.message}`);
    }

    // Step 7: Return result with date range
    const startDate = scheduledDates[0] ?? null;
    const endDate = scheduledDates[scheduledDates.length - 1] ?? null;

    return {
      planned: keywordsToPlan.length,
      startDate,
      endDate,
      skippedAsCovered: skippedAsCovered.length > 0 ? skippedAsCovered : undefined,
    };
  }
}

// Export singleton instance
export const contentPlanningService = new ContentPlanningService();
