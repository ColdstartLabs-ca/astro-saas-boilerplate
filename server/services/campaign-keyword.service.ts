/**
 * Campaign Keyword Service
 *
 * Handles keyword management operations for campaigns.
 * Extracted from CampaignService for Single Responsibility Principle.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { type IKeyword, CampaignNotFoundError } from '@shared/types/campaign.types';
import { serverEnv } from '@shared/config/env';
import { addKeywordsWithCampaignSchema } from '@shared/validation/campaign.schema';
import { testModeCampaigns } from './campaign-lifecycle.service';

// =============================================================================
// Campaign Keyword Service Class
// =============================================================================

export class CampaignKeywordService {
  /**
   * Add keywords to an existing campaign
   */
  async addKeywords(
    campaignId: string,
    userId: string,
    keywords: string[]
  ): Promise<{
    added: number;
    duplicates: number;
  }> {
    // Validate
    addKeywordsWithCampaignSchema.parse({ campaignId, keywords });

    // In test mode with mock users, verify ownership via in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaign = testModeCampaigns.get(campaignId);
      if (!campaign || campaign.user_id !== userId) {
        throw new CampaignNotFoundError(campaignId);
      }
      // Add keywords to the in-memory campaign
      const newKeywords = keywords.map(k => k.trim()).filter(k => k.length > 0);
      if (!campaign.keywords) {
        campaign.keywords = [];
      }
      const existingKeywords = new Set(campaign.keywords.map(k => k.keyword.toLowerCase()));
      const uniqueNew: string[] = [];
      const duplicates: string[] = [];
      for (const kw of newKeywords) {
        if (existingKeywords.has(kw.toLowerCase())) {
          duplicates.push(kw);
        } else {
          uniqueNew.push(kw);
          existingKeywords.add(kw.toLowerCase());
        }
      }
      for (const kw of uniqueNew) {
        campaign.keywords.push({
          id: crypto.randomUUID(),
          campaign_id: campaignId,
          keyword: kw,
          status: 'pending',
          difficulty: 'unknown',
          priority: 0,
        });
      }
      testModeCampaigns.set(campaignId, campaign);
      return {
        added: uniqueNew.length,
        duplicates: duplicates.length,
      };
    }

    // Verify campaign ownership using direct query
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    // Get existing normalized keywords to count duplicates
    const { data: existingKeywords } = await supabaseAdmin
      .from('keywords')
      .select('keyword_normalized')
      .eq('campaign_id', campaignId);

    const existingSet = new Set(existingKeywords?.map(k => k.keyword_normalized) ?? []);
    const newKeywords = keywords.map(k => k.trim()).filter(k => k.length > 0);

    // Normalize using the same logic as the DB constraint
    const normalizeKeyword = (kw: string) => kw.trim().toLowerCase().replace(/\s+/g, ' ');

    const uniqueNew: string[] = [];
    const duplicates: string[] = [];

    for (const kw of newKeywords) {
      const normalized = normalizeKeyword(kw);
      if (existingSet.has(normalized)) {
        duplicates.push(kw);
      } else {
        uniqueNew.push(kw);
        existingSet.add(normalized); // Track within batch to avoid duplicates in same request
      }
    }

    // Batch insert unique keywords
    const keywordRows = this.buildKeywordRows(campaignId, uniqueNew);

    if (keywordRows.length > 0) {
      const { error } = await supabaseAdmin.from('keywords').insert(keywordRows);

      if (error && error.code !== '23505') {
        throw new Error(`Failed to add keywords: ${error.message}`);
      }
    }

    return {
      added: uniqueNew.length,
      duplicates: duplicates.length,
    };
  }

  /**
   * Remove a single keyword with ownership check through campaign
   */
  async removeKeyword(keywordId: string, userId: string): Promise<void> {
    // First verify ownership by getting the keyword's campaign
    const { data: keyword } = await supabaseAdmin
      .from('keywords')
      .select('campaign_id')
      .eq('id', keywordId)
      .single();

    if (!keyword) {
      throw new Error('Keyword not found');
    }

    // Verify campaign ownership using direct query
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', keyword.campaign_id)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new CampaignNotFoundError(keyword.campaign_id);
    }

    // Delete keyword
    const { error } = await supabaseAdmin.from('keywords').delete().eq('id', keywordId);

    if (error) {
      throw new Error(`Failed to remove keyword: ${error.message}`);
    }
  }

  /**
   * List keywords for a campaign
   */
  async getKeywords(campaignId: string, userId: string): Promise<IKeyword[]> {
    // In test mode, get keywords from in-memory store
    if (serverEnv.ENV === 'test' && userId.includes('mock_user_')) {
      const campaignWithKeywords = testModeCampaigns.get(campaignId);
      if (!campaignWithKeywords || campaignWithKeywords.user_id !== userId) {
        throw new CampaignNotFoundError(campaignId);
      }
      // Cast test mode keywords to IKeyword (partial implementation for testing)
      return (campaignWithKeywords?.keywords ?? []) as unknown as IKeyword[];
    }

    // Verify campaign ownership using direct query
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (!campaign) {
      throw new CampaignNotFoundError(campaignId);
    }

    const { data, error } = await supabaseAdmin
      .from('keywords')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get keywords: ${error.message}`);
    }

    return data as IKeyword[];
  }

  /**
   * Get the count of pending keywords for a campaign.
   *
   * @param campaignId - The campaign ID
   * @returns Number of pending keywords
   */
  async getPendingKeywordCount(campaignId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to get pending keywords count: ${error.message}`);
    }

    return count ?? 0;
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Build keyword row objects for batch insertion
   */
  private buildKeywordRows(campaignId: string, keywords: string[]) {
    return keywords.map(keyword => ({
      campaign_id: campaignId,
      keyword,
      status: 'pending' as const,
      difficulty: 'unknown' as const,
      priority: 0,
    }));
  }
}

// Export singleton instance
export const campaignKeywordService = new CampaignKeywordService();
