/**
 * POST /api/articles/generate
 * Generate a new SEO article from a keyword
 *
 * Flow:
 * 1. Validate input (campaignId is REQUIRED)
 * 2. Check project ownership
 * 3. Verify campaign ownership
 * 4. Check sufficient credits
 * 5. Deduct 1 credit
 * 6. Create article record with status='generating'
 * 7. Fire & forget generation via waitUntil()
 * 8. Return 202 with articleId
 */

import { withAuthAndBody, jsonResponse, errorResponse, fireAndForget } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';
import { z } from 'zod';
import type { IGenerateArticleResponse } from '@shared/types/article.types';
import { isValidImagePreset, getImagePresetCreditCost } from '@shared/config/image-models.config';

// Validation schema
const generateSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200, 'Keyword is too long').trim(),
  projectId: z.string().uuid('Invalid project ID'),
  campaignId: z.string().uuid('Campaign is required'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional().default(1500),
  imagePreset: z.string().optional().refine(
    val => !val || isValidImagePreset(val),
    { message: 'Invalid image preset' }
  ),
});

export const POST = withAuthAndBody(generateSchema, async (userId, input, { locals }) => {
  // Verify project ownership
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, user_id')
    .eq('id', input.projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return errorResponse('NOT_FOUND', 'Project not found', 404);
  }

  // Check total credits (subscription + purchased)
  const { data: profile } = await supabaseAdmin
    .from('user_credits')
    .select('total_credits_balance')
    .eq('user_id', userId)
    .single();

  // Calculate total credits needed (1 base + optional image cost)
  const imageCreditCost = getImagePresetCreditCost(input.imagePreset || null);
  const totalCreditsNeeded = 1 + imageCreditCost;

  if (!profile || profile.total_credits_balance < totalCreditsNeeded) {
    return errorResponse(
      'INSUFFICIENT_CREDITS',
      `Insufficient credits for article generation. Need ${totalCreditsNeeded} credits.`,
      402
    );
  }

  // Verify campaign ownership and get project_id
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('id, project_id, name')
    .eq('id', input.campaignId)
    .eq('user_id', userId)
    .single();

  if (campaignError || !campaign) {
    return errorResponse('NOT_FOUND', 'Campaign not found', 404);
  }

  // Verify the campaign belongs to the same project
  if (campaign.project_id !== input.projectId) {
    return errorResponse('VALIDATION_ERROR', 'Campaign does not belong to this project', 400);
  }

  // Create article record first (so we have the ID for credit tracking)
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .insert({
      user_id: userId,
      campaign_id: campaign.id,
      project_id: campaign.project_id,
      primary_keyword: input.keyword,
      status: 'generating',
      credits_used: totalCreditsNeeded,
    })
    .select('id')
    .single();

  if (articleError || !article) {
    throw new Error('Failed to create article record');
  }

  // Deduct total credits (1 base + optional image cost) with article ID as reference
  await supabaseAdmin.rpc('consume_credits_v2', {
    target_user_id: userId,
    amount: totalCreditsNeeded,
    ref_id: article.id,
    description: 'Article generation',
  });

  // Fire & forget generation using waitUntil()
  fireAndForget(locals, articleGenerationService.generateArticle(article.id, userId, input));

  const response: IGenerateArticleResponse = {
    articleId: article.id,
    status: 'generating',
  };

  return jsonResponse(response, 202);
});
