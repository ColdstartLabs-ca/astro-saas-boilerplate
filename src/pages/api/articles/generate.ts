/**
 * POST /api/articles/generate
 * Generate a new SEO article from a keyword
 *
 * Flow:
 * 1. Validate input
 * 2. Check project ownership
 * 3. Check sufficient credits
 * 4. Deduct 1 credit
 * 5. Create "Quick Generate" campaign if needed
 * 6. Create article record with status='generating'
 * 7. Fire & forget generation via waitUntil()
 * 8. Return 202 with articleId
 */

import type { APIRoute } from 'astro';
import { getUserIdFromLocals } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { articleGenerationService } from '@server/services/article-generation.service';
import { z } from 'zod';
import type { IGenerateArticleResponse } from '@shared/types/article.types';
import { ErrorCodes } from '@shared/utils/errors';

// Validation schema
const generateSchema = z.object({
  keyword: z.string().min(1, 'Keyword is required').max(200, 'Keyword is too long').trim(),
  projectId: z.string().uuid('Invalid project ID'),
  model: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'witty', 'academic']).optional(),
  targetWordCount: z.number().int().min(800).max(3000).optional().default(1500),
});

export const POST: APIRoute = async ({ request, locals }) => {
  let userId: string;
  try {
    userId = getUserIdFromLocals(locals);
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
    // Parse and validate request body
    const text = await request.text();
    const body = text ? JSON.parse(text) : {};
    const input = generateSchema.parse(body);

    // Verify project ownership
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, user_id')
      .eq('id', input.projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: ErrorCodes.NOT_FOUND, message: 'Project not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check total credits (subscription + purchased)
    const { data: profile } = await supabaseAdmin
      .from('user_credits')
      .select('total_credits_balance')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.total_credits_balance < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: ErrorCodes.INSUFFICIENT_CREDITS,
            message: 'Insufficient credits for article generation',
          },
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create "Quick Generate" campaign for this project
    let campaignId: string;
    const { data: existingCampaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('project_id', input.projectId)
      .eq('name', 'Quick Generate')
      .single();

    if (existingCampaign) {
      campaignId = existingCampaign.id;
    } else {
      // Create new Quick Generate campaign
      const { data: newCampaign } = await supabaseAdmin
        .from('campaigns')
        .insert({
          user_id: userId,
          project_id: input.projectId,
          name: 'Quick Generate',
          status: 'active',
        })
        .select('id')
        .single();

      if (!newCampaign) {
        throw new Error('Failed to create campaign');
      }
      campaignId = newCampaign.id;
    }

    // Create article record first (so we have the ID for credit tracking)
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        project_id: input.projectId,
        primary_keyword: input.keyword,
        status: 'generating',
        credits_used: 1,
      })
      .select('id')
      .single();

    if (articleError || !article) {
      throw new Error('Failed to create article record');
    }

    // Deduct 1 credit with article ID as reference (atomic, no backfill needed)
    await supabaseAdmin.rpc('consume_credits_v2', {
      target_user_id: userId,
      amount: 1,
      ref_id: article.id,
      description: 'Article generation',
    });

    // Fire & forget generation using waitUntil()
    const ctx = (
      locals as { runtime?: { ctx?: { waitUntil?: (promise: Promise<unknown>) => void } } }
    ).runtime?.ctx;
    if (ctx?.waitUntil) {
      ctx.waitUntil(articleGenerationService.generateArticle(article.id, userId, input));
    } else {
      // Fallback for dev
      articleGenerationService.generateArticle(article.id, userId, input).catch(err => {
        console.error('[ArticleGeneration] Background generation failed:', err);
      });
    }

    const response: IGenerateArticleResponse = {
      articleId: article.id,
      status: 'generating',
    };

    return new Response(JSON.stringify({ success: true, data: response }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating article:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: error.errors[0]?.message ?? 'Validation failed',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Failed to generate article' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
