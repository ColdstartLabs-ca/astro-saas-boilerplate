/**
 * POST /api/articles/check-similarity
 *
 * Check if a topic is semantically similar to existing articles in a project
 * without actually generating an article or deducting credits.
 *
 * This helps users identify potential near-duplicates before spending credits.
 *
 * Flow:
 * 1. Validate input (topic, projectId)
 * 2. Verify project ownership
 * 3. Generate embedding for the new topic
 * 4. Fetch existing article fingerprints from the project
 * 5. Calculate cosine similarity
 * 6. Return similarity results
 */

import { withAuthAndBody, jsonResponse, errorResponse } from '../_utils';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { openaiEmbeddingsService } from '@server/services/openai-embeddings.service';
import { z } from 'zod';

// Validation schema
const checkSimilaritySchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic is too long').trim(),
  projectId: z.string().uuid('Invalid project ID'),
  threshold: z.number().min(0).max(1).optional().default(0.85),
  maxResults: z.number().int().min(1).max(20).optional().default(5),
  excludeArticleId: z.string().uuid().optional(),
});

export const POST = withAuthAndBody(checkSimilaritySchema, async (userId, input) => {
  // Verify project ownership
  const { data: project, error: projectError } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .eq('id', input.projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return errorResponse('NOT_FOUND', 'Project not found', 404);
  }

  // Check if OpenAI embeddings service is configured
  if (!openaiEmbeddingsService.isConfigured()) {
    return errorResponse(
      'SERVICE_UNAVAILABLE',
      'Semantic similarity service is not configured',
      503
    );
  }

  // Fetch existing articles with topic fingerprints from the project
  const { data: projectArticles, error: articlesError } = await supabaseAdmin
    .from('articles')
    .select('id, title, primary_keyword, status, topic_fingerprint')
    .eq('project_id', input.projectId)
    .not('topic_fingerprint', 'is', null)
    .not('status', 'eq', 'failed')
    .order('created_at', { ascending: false })
    .limit(100); // Limit to 100 most recent articles

  if (articlesError) {
    console.error('[Check Similarity] Failed to fetch project articles:', articlesError);
    return errorResponse('INTERNAL_ERROR', 'Failed to check similarity', 500);
  }

  // If no articles with fingerprints exist, return empty result
  if (!projectArticles || projectArticles.length === 0) {
    return jsonResponse({
      isSimilar: false,
      maxSimilarity: 0,
      similarArticles: [],
      message: 'No existing articles found for comparison',
    });
  }

  try {
    // Perform similarity check
    const similarityResult = await openaiEmbeddingsService.checkSimilarity(
      input.topic,
      projectArticles.map(a => ({
        id: a.id,
        title: a.title || a.primary_keyword,
        topic_fingerprint: a.topic_fingerprint as number[] | null,
      })),
      {
        threshold: input.threshold,
        maxResults: input.maxResults,
        excludeArticleId: input.excludeArticleId,
      }
    );

    // Enrich similar articles with more details
    const enrichedSimilarArticles = similarityResult.similarArticles.map(sa => {
      const originalArticle = projectArticles.find(a => a.id === sa.articleId);
      return {
        articleId: sa.articleId,
        title: sa.title,
        similarity: sa.similarity,
        similarityPercent: Math.round(sa.similarity * 100),
        status: originalArticle?.status,
        primaryKeyword: originalArticle?.primary_keyword,
      };
    });

    return jsonResponse({
      isSimilar: similarityResult.isSimilar,
      maxSimilarity: similarityResult.maxSimilarity,
      maxSimilarityPercent: Math.round(similarityResult.maxSimilarity * 100),
      similarArticleId: similarityResult.similarArticleId,
      similarArticles: enrichedSimilarArticles,
      message: similarityResult.isSimilar
        ? `Found ${enrichedSimilarArticles.length} similar article(s) in this project`
        : 'No similar articles found',
    });
  } catch (error) {
    console.error('[Check Similarity] Failed to check similarity:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Failed to check similarity',
      500
    );
  }
});
