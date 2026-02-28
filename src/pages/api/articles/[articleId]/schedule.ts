/**
 * Article Schedule API Route
 * PATCH /api/articles/:articleId/schedule - Reschedule when an article should be published
 */

import { z } from 'zod';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { withAuthAndBody, jsonResponse, errorResponse, handleApiError } from '@pages/api/_utils';

/**
 * Validation schema for reschedule request
 */
const scheduleSchema = z.object({
  scheduled_publish_at: z.string().datetime(),
});

/**
 * PATCH /api/articles/:articleId/schedule
 *
 * Reschedule an article's publish date.
 * The new date must be in the future.
 */
export const PATCH = withAuthAndBody(scheduleSchema, async (userId, input, { params }) => {
  const articleId = params.articleId as string;

  // Verify article ownership
  const { data: article, error } = await supabaseAdmin
    .from('articles')
    .select('id, user_id, status')
    .eq('id', articleId)
    .eq('user_id', userId)
    .single();

  if (error || !article) {
    return errorResponse('NOT_FOUND', 'Article not found', 404);
  }

  // Validate date is in the future
  if (new Date(input.scheduled_publish_at) <= new Date()) {
    return errorResponse('INVALID_REQUEST', 'Scheduled date must be in the future', 400);
  }

  // Update scheduled_publish_at
  const { error: updateError } = await supabaseAdmin
    .from('articles')
    .update({ scheduled_publish_at: input.scheduled_publish_at })
    .eq('id', articleId);

  if (updateError) throw updateError;

  return jsonResponse({ success: true, scheduled_publish_at: input.scheduled_publish_at });
});

/**
 * Handle errors
 */
export const onError = handleApiError;
