/**
 * Article Generation Service
 *
 * Orchestrates the full article generation pipeline:
 * 1. Credit check
 * 2. Outline generation
 * 3. Full article generation (with IMAGE markers if enabled)
 * 4. Image generation (parallel, if enabled)
 * 5. Metadata extraction
 * 6. Article storage
 * 7. Credit refund on failure
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { OpenRouterService } from './openrouter.service';
import { imageGenerationService } from './image-generation.service';
import {
  getOutlinePrompt,
  getArticlePrompt,
  getOutlineRetryPrompt,
} from './prompts/article-prompts';
import { calculateOverallSEOScore } from '@shared/utils/seo';
import type {
  IArticleOutline,
  IGenerateArticleInput,
  IImageMarker,
  IImageResult,
} from '@shared/types/article.types';
import { serverEnv } from '@shared/config/env';
import {
  getImageCountForWordCount,
  getImagePresetCreditCost,
  isValidImagePreset,
  type ImagePresetKey,
} from '@shared/config/image-models.config';

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
   * 4. Generate full article via OpenRouter (with IMAGE markers if enabled)
   * 5. Generate images via Replicate (parallel, if enabled)
   * 6. Replace markers with real image URLs
   * 7. Extract metadata (word count, etc.)
   * 8. Save result with status='draft'
   * 9. On error: set status='failed' and refund credit
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

    // Determine image preset and credit cost
    const imagePreset = this.parseImagePreset(input.imagePreset);
    const imageCreditCost = getImagePresetCreditCost(imagePreset);
    const totalCredits = 1 + imageCreditCost;

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

      // Step 2: Generate full article (with IMAGE markers if enabled)
      const article = await this.generateFullArticle(outline.data, input, imagePreset);
      totalTokens += article.usage.totalTokens;

      // Step 3: Generate images if preset is provided
      let finalContent = article.content;
      let successfulImageCount = 0;

      if (imagePreset) {
        const imageResults = await this.generateImagesForArticle(
          article.content,
          input.keyword,
          imagePreset
        );

        // Step 4: Replace markers with real image URLs
        finalContent = this.replaceImageMarkers(article.content, imageResults);
        successfulImageCount = imageResults.filter(r => r.status === 'completed').length;

        // Save article images to database
        await this.saveArticleImages(articleId, imageResults);
      } else {
        // No images requested, strip any markers that might be present
        finalContent = this.stripImageMarkers(article.content);
      }

      // Step 5: Extract metadata
      const wordCount = this.countWords(finalContent);
      const generationTimeMs = Date.now() - startTime;

      // Step 5.5: Calculate SEO score
      const seoResult = calculateOverallSEOScore({
        title: outline.data.title,
        content: finalContent,
        meta_description: outline.data.metaDescription,
        primary_keyword: input.keyword,
        word_count: wordCount,
      });

      // Step 6: Save result
      await this.supabase
        .from('articles')
        .update({
          status: 'draft',
          title: outline.data.title,
          content: finalContent,
          meta_description: outline.data.metaDescription,
          slug: outline.data.slug,
          word_count: wordCount,
          seo_score: seoResult.overallScore,
          ai_model_used: input.model || serverEnv.OPENROUTER_TEXT_MODEL,
          token_count: totalTokens,
          generation_time_ms: generationTimeMs,
          generated_at: new Date().toISOString(),
          image_preset: imagePreset || null,
          image_count: successfulImageCount,
          credits_used: totalCredits,
        })
        .eq('id', articleId)
        .eq('user_id', userId);

      console.log(
        `[ArticleGeneration] Article ${articleId} generated successfully in ${generationTimeMs}ms` +
          (imagePreset ? ` with ${successfulImageCount} images` : '')
      );
    } catch (error) {
      console.error(`[ArticleGeneration] Error generating article ${articleId}:`, error);
      await this.handleGenerationFailure(articleId, userId, error, imageCreditCost);
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
    input: IGenerateArticleInput,
    imagePreset: ImagePresetKey | null | undefined
  ): Promise<{ content: string; usage: { totalTokens: number } }> {
    const tone = input.tone || 'professional';
    const targetWordCount = input.targetWordCount || 1500;
    const model = input.model || serverEnv.OPENROUTER_TEXT_MODEL;

    // Calculate image count based on word count
    const imageCount = imagePreset ? getImageCountForWordCount(targetWordCount) : 0;

    const systemPrompt = getArticlePrompt(outline, tone, targetWordCount, imageCount);

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
   * Generate images for an article.
   * Parses markers, generates prompts, and calls Replicate in parallel.
   */
  private async generateImagesForArticle(
    content: string,
    keyword: string,
    presetKey: ImagePresetKey | null
  ): Promise<IImageResult[]> {
    // Step 1: Parse image markers
    const markers = this.parseImageMarkers(content);

    if (markers.length === 0) {
      console.warn('[ArticleGeneration] No image markers found in generated content');
      return [];
    }

    if (!presetKey) {
      console.warn('[ArticleGeneration] No preset key provided, skipping image generation');
      return [];
    }

    console.log(`[ArticleGeneration] Found ${markers.length} image markers, generating images...`);

    // Step 2: Generate images via ImageGenerationService
    return await imageGenerationService.generateImagesForArticle(markers, presetKey, keyword);
  }

  /**
   * Parse [IMAGE:n] markers from markdown content.
   * Extracts surrounding section context for each marker.
   */
  private parseImageMarkers(markdown: string): IImageMarker[] {
    const markers: IImageMarker[] = [];
    const regex = /\[IMAGE:(\d+)\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(markdown)) !== null) {
      const position = parseInt(match[1], 10);
      const markerStart = match.index;
      const markerEnd = match.index + match[0].length;

      // Extract surrounding context (200 chars before and after)
      const contextStart = Math.max(0, markerStart - 200);
      const contextEnd = Math.min(markdown.length, markerEnd + 200);
      const sectionContext = markdown.substring(contextStart, contextEnd).trim();

      markers.push({
        position,
        sectionContext,
      });
    }

    return markers;
  }

  /**
   * Replace [IMAGE:n] markers with real image URLs.
   * Strips markers for failed images.
   */
  private replaceImageMarkers(markdown: string, results: IImageResult[]): string {
    let content = markdown;

    for (const result of results) {
      const marker = `[IMAGE:${result.position}]`;

      if (result.status === 'completed' && result.imageUrl) {
        // Generate alt text from prompt (first 100 chars)
        const altText = result.prompt.substring(0, 100).replace(/"/g, '');
        const replacement = `![${altText}](${result.imageUrl})`;
        content = content.replace(marker, replacement);
      } else {
        // Strip failed markers
        content = content.replace(marker, '');
      }
    }

    return content;
  }

  /**
   * Strip all [IMAGE:n] markers from content.
   */
  private stripImageMarkers(markdown: string): string {
    return markdown.replace(/\[IMAGE:\d+\]/g, '');
  }

  /**
   * Save article images to database.
   */
  private async saveArticleImages(articleId: string, results: IImageResult[]): Promise<void> {
    if (results.length === 0) {
      return;
    }

    const records = results.map(r => ({
      article_id: articleId,
      position: r.position,
      image_url: r.imageUrl,
      prompt: r.prompt,
      replicate_model: r.model,
      preset_key: r.presetKey,
      status: r.status === 'completed' ? 'completed' : 'failed',
      error: r.error || null,
      generation_time_ms: r.generationTimeMs || null,
    }));

    const { error } = await this.supabase.from('article_images').insert(records);

    if (error) {
      console.error('[ArticleGeneration] Failed to save article images:', error);
    }
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
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
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
    error: unknown,
    imageCreditCost: number
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

    // Refund total credits (base article + image cost)
    const totalRefund = 1 + imageCreditCost;
    await this.supabase.rpc('add_purchased_credits', {
      p_user_id: userId,
      p_amount: totalRefund,
      p_reference_id: articleId,
      p_description: `Refund: generation failed - ${errorMessage}`,
    });

    console.log(
      `[ArticleGeneration] ${totalRefund} credits refunded for failed article ${articleId}`
    );
  }

  /**
   * Parse and validate image preset from input.
   */
  private parseImagePreset(preset?: string): ImagePresetKey | null {
    if (!preset) {
      return null;
    }
    if (isValidImagePreset(preset)) {
      return preset as ImagePresetKey;
    }
    console.warn(`[ArticleGeneration] Invalid image preset: ${preset}, ignoring`);
    return null;
  }

  /**
   * Parse and validate image preset from input (allows undefined).
   */
  private parseImagePresetAllowUndefined(preset?: string): ImagePresetKey | null | undefined {
    if (!preset) {
      return undefined;
    }
    if (isValidImagePreset(preset)) {
      return preset as ImagePresetKey;
    }
    console.warn(`[ArticleGeneration] Invalid image preset: ${preset}, ignoring`);
    return undefined;
  }
}

// Export singleton instance
export const articleGenerationService = new ArticleGenerationService();
