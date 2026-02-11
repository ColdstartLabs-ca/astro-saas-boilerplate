/**
 * POST /api/admin/cleanup-quick-generate-campaigns
 *
 * Admin endpoint to delete all "Quick Generate" campaigns and their associated articles.
 * This is a one-time cleanup operation to remove auto-generated campaigns.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { withAuth, jsonResponse, errorResponse } from '../_utils';

export const POST = withAuth(async (userId) => {
  // Check if user is admin
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (!profile?.is_admin) {
    return errorResponse('FORBIDDEN', 'Admin access required', 403);
  }

  // Find all "Quick Generate" campaigns
  const { data: quickGenerateCampaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id')
    .eq('name', 'Quick Generate');

  if (!quickGenerateCampaigns || quickGenerateCampaigns.length === 0) {
    return jsonResponse({
      message: 'No "Quick Generate" campaigns found',
      deleted: 0,
    });
  }

  const campaignIds = quickGenerateCampaigns.map(c => c.id);

  // Delete all articles associated with these campaigns (cascade should handle this, but let's be explicit)
  const { error: articlesDeleteError } = await supabaseAdmin
    .from('articles')
    .delete()
    .in('campaign_id', campaignIds);

  if (articlesDeleteError) {
    console.error('[Cleanup] Error deleting articles:', articlesDeleteError);
  }

  // Delete the campaigns
  const { error: campaignsDeleteError } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .in('id', campaignIds);

  if (campaignsDeleteError) {
    throw campaignsDeleteError;
  }

  // Also delete keywords associated with these campaigns
  const { error: keywordsDeleteError } = await supabaseAdmin
    .from('keywords')
    .delete()
    .in('campaign_id', campaignIds);

  if (keywordsDeleteError) {
    console.error('[Cleanup] Error deleting keywords:', keywordsDeleteError);
  }

  return jsonResponse({
    message: `Deleted ${campaignIds.length} "Quick Generate" campaigns`,
    deleted: campaignIds.length,
  });
});
