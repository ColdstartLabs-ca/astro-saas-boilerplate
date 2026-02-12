/**
 * Campaign Integrations API Routes
 * GET /api/campaigns/:campaignId/integrations - Get campaign integrations
 * PUT /api/campaigns/:campaignId/integrations - Set campaign integrations
 */

import { z } from 'zod';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import {
  withAuth,
  withAuthAndBody,
  jsonResponse,
  errorResponse,
  handleApiError,
} from '@pages/api/_utils';
import type {
  ICampaignIntegrationsResponse,
  ICampaignIntegrationWithDetails,
} from '@shared/types/integration.types';

/**
 * Campaign settings structure (from settings JSONB)
 */
interface ICampaignSettings {
  auto_publish?: boolean;
}

/**
 * Supabase join response shape - returns joined data as array under table name
 */
interface ISupabaseCampaignIntegrationJoin {
  id: string;
  campaign_id: string;
  integration_id: string;
  enabled: boolean;
  created_at: string;
  integrations: Array<{
    id: string;
    user_id: string;
    type: string;
    name: string;
    config: unknown;
    status: string;
    last_tested_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * Validation schema for setting campaign integrations
 */
const setCampaignIntegrationsSchema = z.object({
  integrationIds: z.array(z.string().uuid()).min(0),
  autoPublish: z.boolean(),
});

/**
 * GET /api/campaigns/:campaignId/integrations
 *
 * Get integrations assigned to a campaign and the auto_publish setting.
 */
export const GET = withAuth(async (userId, { params }) => {
  const campaignId = params.campaignId as string;

  // Verify campaign ownership
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('id, settings')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (campaignError || !campaign) {
    return errorResponse('NOT_FOUND', 'Campaign not found', 404);
  }

  // Get campaign integrations with integration details
  const { data: campaignIntegrations, error: integrationsError } = await supabaseAdmin
    .from('campaign_integrations')
    .select(
      `
      id,
      campaign_id,
      integration_id,
      enabled,
      created_at,
      integrations (
        id,
        user_id,
        type,
        name,
        config,
        status,
        last_tested_at,
        created_at,
        updated_at
      )
      `
    )
    .eq('campaign_id', campaignId);

  if (integrationsError) {
    throw integrationsError;
  }

  const settings = (campaign.settings as ICampaignSettings) || {};
  const autoPublish = settings.auto_publish === true;

  // Transform Supabase response to match expected type
  // Note: Supabase returns joined data as an array, extract first element
  const integrations: ICampaignIntegrationWithDetails[] = (campaignIntegrations || [])
    .map((ci: ISupabaseCampaignIntegrationJoin) => {
      const integration = ci.integrations && ci.integrations.length > 0 ? ci.integrations[0] : null;
      if (!integration) return null;
      return {
        id: ci.id,
        campaign_id: ci.campaign_id,
        integration_id: ci.integration_id,
        enabled: ci.enabled,
        created_at: ci.created_at,
        integration,
      };
    })
    .filter((item): item is ICampaignIntegrationWithDetails => item !== null);

  const response: ICampaignIntegrationsResponse = {
    integrations,
    autoPublish,
  };

  return jsonResponse(response);
});

/**
 * PUT /api/campaigns/:campaignId/integrations
 *
 * Set integrations for a campaign and update auto_publish setting.
 *
 * Replaces all existing integrations with the provided list.
 * Updates the campaign's settings.auto_publish flag.
 */
export const PUT = withAuthAndBody(
  setCampaignIntegrationsSchema,
  async (userId, input, { params }) => {
    const campaignId = params.campaignId as string;

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, settings')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      return errorResponse('NOT_FOUND', 'Campaign not found', 404);
    }

    // Get existing integrations to determine what to add/remove
    const { data: existing } = await supabaseAdmin
      .from('campaign_integrations')
      .select('integration_id')
      .eq('campaign_id', campaignId);

    const existingIds = new Set(existing?.map(e => e.integration_id) || []);
    const newIds = new Set(input.integrationIds);

    // Remove integrations not in new list
    const toRemove = [...existingIds].filter(id => !newIds.has(id));
    if (toRemove.length > 0) {
      await supabaseAdmin
        .from('campaign_integrations')
        .delete()
        .eq('campaign_id', campaignId)
        .in('integration_id', toRemove);
    }

    // Add new integrations (with ownership validation)
    const toAdd = [...newIds].filter(id => !existingIds.has(id));
    if (toAdd.length > 0) {
      // Verify all new integration IDs belong to the same user
      const { data: ownedIntegrations } = await supabaseAdmin
        .from('integrations')
        .select('id')
        .eq('user_id', userId)
        .in('id', toAdd);

      const ownedIds = new Set(ownedIntegrations?.map(i => i.id) || []);
      const unauthorizedIds = toAdd.filter(id => !ownedIds.has(id));
      if (unauthorizedIds.length > 0) {
        return errorResponse('FORBIDDEN', 'One or more integration IDs do not belong to you', 403);
      }

      const inserts = toAdd.map(integrationId => ({
        campaign_id: campaignId,
        integration_id: integrationId,
        enabled: true,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('campaign_integrations')
        .insert(inserts);

      if (insertError) {
        throw insertError;
      }
    }

    // Update campaign settings for auto_publish
    const currentSettings = (campaign.settings as ICampaignSettings) || {};
    const newSettings = {
      ...currentSettings,
      auto_publish: input.autoPublish,
    };

    await supabaseAdmin
      .from('campaigns')
      .update({
        settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // Fetch updated integrations
    const { data: updatedIntegrations } = await supabaseAdmin
      .from('campaign_integrations')
      .select(
        `
      id,
      campaign_id,
      integration_id,
      enabled,
      created_at,
      integrations (
        id,
        user_id,
        type,
        name,
        config,
        status,
        last_tested_at,
        created_at,
        updated_at
      )
      `
      )
      .eq('campaign_id', campaignId);

    // Transform Supabase response to match expected type
    // Note: Supabase returns joined data as an array, extract first element
    const integrations: ICampaignIntegrationWithDetails[] = (updatedIntegrations || [])
      .map((ci: ISupabaseCampaignIntegrationJoin) => {
        const integration =
          ci.integrations && ci.integrations.length > 0 ? ci.integrations[0] : null;
        if (!integration) return null;
        return {
          id: ci.id,
          campaign_id: ci.campaign_id,
          integration_id: ci.integration_id,
          enabled: ci.enabled,
          created_at: ci.created_at,
          integration,
        };
      })
      .filter((item): item is ICampaignIntegrationWithDetails => item !== null);

    const response: ICampaignIntegrationsResponse = {
      integrations,
      autoPublish: input.autoPublish,
    };

    return jsonResponse(response);
  }
);

/**
 * Handle errors
 */
export const onError = handleApiError;
