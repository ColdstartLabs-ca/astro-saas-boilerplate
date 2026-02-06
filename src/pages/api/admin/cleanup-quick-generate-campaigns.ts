/**
 * POST /api/admin/cleanup-quick-generate-campaigns
 *
 * Admin endpoint to delete all "Quick Generate" campaigns and their associated articles.
 * This is a one-time cleanup operation to remove auto-generated campaigns.
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { ErrorCodes } from '@shared/utils/errors';

export const POST: APIRoute = async ({ locals }) => {
  let userId: string;
  let isAdmin = false;
  try {
    userId = getUserIdFromLocals(locals);

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    isAdmin = profile?.is_admin ?? false;

    if (!isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: ErrorCodes.FORBIDDEN, message: 'Admin access required' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'Authentication required' },
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Find all "Quick Generate" campaigns
    const { data: quickGenerateCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('name', 'Quick Generate');

    if (!quickGenerateCampaigns || quickGenerateCampaigns.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          message: 'No "Quick Generate" campaigns found',
          deleted: 0,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
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

    return new Response(JSON.stringify({
      success: true,
      data: {
        message: `Deleted ${campaignIds.length} "Quick Generate" campaigns`,
        deleted: campaignIds.length,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error cleaning up Quick Generate campaigns:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to cleanup campaigns' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
