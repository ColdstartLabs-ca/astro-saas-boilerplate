/**
 * Create Article from Opportunity API Route
 * POST /api/opportunities/[id]/create-article
 *
 * Creates a campaign with the opportunity's query as keyword,
 * then updates the opportunity status to in_progress.
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { campaignService } from '@server/services/campaign.service';
import { createArticleFromOpportunitySchema } from '@shared/validation/opportunity-detail.schema';
import { OpportunityNotFoundError } from '@shared/types/opportunity.types';
import type {
  IOpportunity,
  ICreateArticleFromOpportunityResponse,
} from '@shared/types/opportunity.types';
import { withAuthAndBody, jsonResponse, errorResponse } from '../../_utils';

/** Content opportunity types that support article creation */
const CONTENT_OPPORTUNITY_TYPES = ['content_gap', 'low_hanging_fruit', 'topic_cluster'] as const;

/**
 * POST /api/opportunities/[id]/create-article
 * Creates an article campaign from a content opportunity.
 */
export const POST = withAuthAndBody(
  createArticleFromOpportunitySchema,
  async (userId, body, context) => {
    const opportunityId = context.params.id;
    if (!opportunityId) {
      throw new OpportunityNotFoundError('missing');
    }

    // 1. Fetch opportunity and verify ownership
    const { data: opportunity, error: fetchError } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !opportunity) {
      throw new OpportunityNotFoundError(opportunityId);
    }

    const opp = opportunity as IOpportunity;

    // 2. Verify this is a content opportunity type
    if (
      !CONTENT_OPPORTUNITY_TYPES.includes(opp.type as (typeof CONTENT_OPPORTUNITY_TYPES)[number])
    ) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Only content opportunities (content_gap, low_hanging_fruit, topic_cluster) support article creation',
        400
      );
    }

    // 3. Verify the opportunity has a query to use as keyword
    if (!opp.query) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Opportunity does not have a query to use as keyword',
        400
      );
    }

    // 4. Verify project ownership matches
    if (opp.project_id !== body.projectId) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Project ID does not match opportunity project',
        400
      );
    }

    // 5. Create campaign with the opportunity's query as keyword
    //    Credit checking happens inside campaignService.create
    const campaign = await campaignService.create(userId, {
      name: opp.title,
      projectId: opp.project_id,
      keywords: [opp.query],
    });

    // 6. Update opportunity: status = in_progress, action details
    const { error: updateError } = await supabaseAdmin
      .from('opportunities')
      .update({
        status: 'in_progress',
        action_type: 'create_article',
        action_ref_id: campaign.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
      .eq('user_id', userId);

    if (updateError) {
      console.error(
        '[CreateArticle] Failed to update opportunity after campaign creation:',
        updateError.message
      );
      // Campaign was created successfully, so we still return success
    }

    const response: ICreateArticleFromOpportunityResponse = {
      campaignId: campaign.id,
      opportunityId: opp.id,
    };

    return jsonResponse(response, 201);
  }
);
