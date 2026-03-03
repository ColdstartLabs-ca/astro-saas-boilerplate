/**
 * POST /api/articles/:articleId/analyze
 *
 * Trigger on-demand AI detection analysis for an article.
 * Supports both free heuristic analysis and paid external provider (Originality.ai).
 */

import { z } from 'zod';
import { withAuthAndBody, jsonResponse, errorResponse } from '../../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { aiDetectionService, type AIProvider } from '@server/services/ai-detection.service';
import { serverEnv } from '@shared/config/env';

const analyzeSchema = z.object({
  provider: z.enum(['heuristic', 'originality']).default('heuristic'),
});

export const POST = withAuthAndBody(analyzeSchema, async (userId, body, context) => {
  const { articleId } = context.params;

  if (!articleId) {
    return errorResponse('INVALID_REQUEST', 'Article ID is required', 400);
  }

  // Verify article ownership and get content
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('id, user_id, content')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (articleError || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  if (!article.content) {
    return errorResponse('INVALID_REQUEST', 'Article has no content to analyze', 400);
  }

  const provider: AIProvider = body.provider;

  // Check if external provider is configured when requesting originality
  if (provider === 'originality' && !serverEnv.ORIGINALITY_AI_API_KEY) {
    return errorResponse(
      'SERVICE_UNAVAILABLE',
      'External AI detection provider is not configured. Use heuristic analysis instead.',
      503
    );
  }

  try {
    let result;

    if (provider === 'heuristic') {
      result = await aiDetectionService.analyzeHeuristic(articleId, article.content);
    } else {
      result = await aiDetectionService.analyzeWithOriginality(articleId, article.content, userId);
    }

    return jsonResponse({
      score: result.score,
      details: result.details,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';

    // Handle specific error cases
    if (message.startsWith('INSUFFICIENT_CREDITS')) {
      return errorResponse(
        'INSUFFICIENT_CREDITS',
        'Not enough credits for external AI detection. Please purchase more credits.',
        402
      );
    }

    if (message.startsWith('SERVICE_UNAVAILABLE')) {
      return errorResponse(
        'SERVICE_UNAVAILABLE',
        message.replace('SERVICE_UNAVAILABLE: ', ''),
        503
      );
    }

    // Log unexpected errors and return generic message
    console.error('[API] AI detection analysis failed:', error);
    return errorResponse('INTERNAL_ERROR', 'AI detection analysis failed', 500);
  }
});
