/**
 * Article Generation Service
 *
 * Orchestrates the full article generation pipeline:
 * 1. Credit check
 * 2. Outline generation
 * 3. Full article generation
 * 4. Metadata extraction
 * 5. Article storage
 * 6. Credit refund on failure
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { OpenRouterService } from './openrouter.service';
import {
  getOutlinePrompt,
  getArticlePrompt,
  getOutlineRetryPrompt,
} from './prompts/article-prompts';
import type { IArticleOutline, IGenerateArticleInput } from '@shared/types/article.types';
import { serverEnv } from '@shared/config/env';

export class ArticleGenerationService {
  private openRouter = new OpenRouterService();
  private supabase = supabaseAdmin;

  /**
   * Generate an article from a keyword.
   *
   * This method runs the full generation pipeline:
   * 1. Update article status to 'generating'
   * 2. Generate outline via OpenRouter
   * 3. Save outline to article record
   * 4. Generate full article via OpenRouter
   * 5. Extract metadata (word count, etc.)
   * 6. Save result with status='draft'
   * 7. On error: set status='failed' and refund credit
   *
   * @param articleId - The article ID to update
   * @param userId - The user ID for credit operations
   * @param input - Generation parameters
   */
  async generateArticle(
    articleId: string,
    userId: string,
    input: IGenerateArticleInput
  ): Promise<void> {
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      // Update status to generating
      await this.supabase
        .from('articles')
        .update({ status: 'generating' })
        .eq('id', articleId)
        .eq('user_id', userId);

      // Step 1: Generate outline
      const outline = await this.generateOutline(input);
      totalTokens += outline.usage.totalTokens;

      // Save outline to article
      await this.supabase
        .from('articles')
        .update({ outline: outline.data })
        .eq('id', articleId)
        .eq('user_id', userId);

      // Step 2: Generate full article
      const article = await this.generateFullArticle(outline.data, input);
      totalTokens += article.usage.totalTokens;

      // Step 3: Extract metadata
      const wordCount = this.countWords(article.content);
      const generationTimeMs = Date.now() - startTime;

      // Step 4: Save result
      await this.supabase
        .from('articles')
        .update({
          status: 'draft',
          title: outline.data.title,
          content: article.content,
          meta_description: outline.data.metaDescription,
          slug: outline.data.slug,
          word_count: wordCount,
          ai_model_used: input.model || serverEnv.OPENROUTER_TEXT_MODEL,
          token_count: totalTokens,
          generation_time_ms: generationTimeMs,
          generated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .eq('user_id', userId);

      console.log(
        `[ArticleGeneration] Article ${articleId} generated successfully in ${generationTimeMs}ms`
      );
    } catch (error) {
      console.error(`[ArticleGeneration] Error generating article ${articleId}:`, error);
      await this.handleGenerationFailure(articleId, userId, error);
      throw error; // Re-throw for logging
    }
  }

  /**
   * Generate an article outline.
   */
  private async generateOutline(input: IGenerateArticleInput): Promise<{
    data: IArticleOutline;
    usage: { totalTokens: number };
  }> {
    const tone = input.tone || 'professional';
    const targetWordCount = input.targetWordCount || 1500;
    const model = input.model || serverEnv.OPENROUTER_TEXT_MODEL;

    const systemPrompt = getOutlinePrompt(input.keyword, tone, targetWordCount);

    try {
      const result = await this.openRouter.chatCompletionWithRetry({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.keyword },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.7,
        maxTokens: 2000,
      });

      const outline = JSON.parse(result.content) as IArticleOutline;
      return { data: outline, usage: result.usage };
    } catch (_error) {
      // Retry with stricter prompt if JSON parsing fails
      console.log('[ArticleGeneration] Outline generation failed, retrying with stricter prompt');

      const retryResult = await this.openRouter.chatCompletionWithRetry({
        model,
        messages: [
          { role: 'system', content: getOutlineRetryPrompt(input.keyword) },
          { role: 'user', content: input.keyword },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.5,
        maxTokens: 1500,
      });

      const outline = JSON.parse(retryResult.content) as IArticleOutline;
      return { data: outline, usage: retryResult.usage };
    }
  }

  /**
   * Generate the full article from an outline.
   */
  private async generateFullArticle(
    outline: IArticleOutline,
    input: IGenerateArticleInput
  ): Promise<{ content: string; usage: { totalTokens: number } }> {
    const tone = input.tone || 'professional';
    const targetWordCount = input.targetWordCount || 1500;
    const model = input.model || serverEnv.OPENROUTER_TEXT_MODEL;

    const systemPrompt = getArticlePrompt(outline, tone, targetWordCount);

    const result = await this.openRouter.chatCompletionWithRetry({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Write the article now.' },
      ],
      responseFormat: { type: 'text' },
      temperature: 0.8,
      maxTokens: 4000,
    });

    return { content: result.content, usage: result.usage };
  }

  /**
   * Count words in markdown content.
   * Strips markdown syntax and counts words.
   */
  private countWords(markdown: string): number {
    // Remove markdown syntax
    const plainText = markdown
      .replace(/#{1,6}\s/g, '') // Headers
      .replace(/\*\*/g, '') // Bold
      .replace(/\*/g, '') // Italic
      .replace(/`/g, '') // Code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/\n+/g, ' ') // Newlines to spaces
      .trim();

    // Count words (split by whitespace, filter empty strings)
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Handle generation failure - mark article as failed and refund credit.
   */
  private async handleGenerationFailure(
    articleId: string,
    userId: string,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update article status
    await this.supabase
      .from('articles')
      .update({
        status: 'failed',
        generation_error: errorMessage,
      })
      .eq('id', articleId)
      .eq('user_id', userId);

    // Refund credit using add_purchased_credits
    await this.supabase.rpc('add_purchased_credits', {
      p_user_id: userId,
      p_amount: 1,
      p_reference_id: articleId,
      p_description: `Refund: generation failed - ${errorMessage}`,
    });

    console.log(`[ArticleGeneration] Credit refunded for failed article ${articleId}`);
  }
}

// Export singleton instance
export const articleGenerationService = new ArticleGenerationService();
