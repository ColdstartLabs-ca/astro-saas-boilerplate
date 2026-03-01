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
import { persistArticleImages } from './image-storage.service';
import { openaiEmbeddingsService } from './openai-embeddings.service';
import {
  getOutlinePrompt,
  getArticlePrompt,
  getOutlineRetryPrompt,
  getArticleRetryPrompt,
} from './prompts/article-prompts';
import { calculateOverallSEOScore } from '@shared/utils/seo';
import type {
  ArticleStatus,
  IArticleOutline,
  IGenerateArticleInput,
  IImageMarker,
  IImageResult,
} from '@shared/types/article.types';
import type { IGscArticleContext } from '@shared/types/opportunity.types';
import { serverEnv } from '@shared/config/env';
import {
  getImageCountForWordCount,
  getImagePresetCreditCost,
  isValidImagePreset,
  type ImagePresetKey,
} from '@shared/config/image-models.config';
import { resolveWriterModel } from '@shared/config/ai-models.config';
import { calculateArticleCreditCost } from '@shared/constants';
import { articleQualityGateService, type IQualityGateResult } from './article-quality-gate.service';
import { qaService, type IQACheckResult, type IQAConfig } from './qa.service';
import {
  classifyError,
  createFailureMetadata,
  formatErrorMessage,
} from '@server/utils/error-classifier';
import type { FailureStage } from '@shared/types/failure.types';
import { getEmailService } from './email.service';

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
    // Calculate total credits using centralized function (writer base + image addon)
    const totalCredits = calculateArticleCreditCost(input.model, imagePreset);

    // Track quality gate retry locally (not on singleton) to avoid race conditions
    let hasRetriedQualityGate = false;

    try {
      // Update status to generating and set attempt tracking
      await this.supabase
        .from('articles')
        .update({
          status: 'generating',
          last_attempt_at: new Date().toISOString(),
          // Only increment attempt_count if not already set (first attempt)
          // Note: attempt_count is managed by stale recovery for retries
        })
        .eq('id', articleId)
        .eq('user_id', userId);

      // Step 1: Generate outline (with GSC context if provided)
      const outline = await this.generateOutline(input, input.gscContext);
      totalTokens += outline.usage.totalTokens;

      // Save outline to article
      await this.supabase
        .from('articles')
        .update({ outline: outline.data })
        .eq('id', articleId)
        .eq('user_id', userId);

      // Step 2: Generate full article (with IMAGE markers if enabled) with quality gate
      const targetWordCount = input.targetWordCount || 1500;
      let articleResult = await this.generateFullArticle(outline.data, input, imagePreset, false);
      totalTokens += articleResult.usage.totalTokens;

      // Step 2.5: Quality gate check with auto-retry
      let qualityResult = articleQualityGateService.checkQualityGates(
        articleResult.content,
        outline.data,
        targetWordCount,
        articleResult.finishReason
      );

      if (!qualityResult.passed && !hasRetriedQualityGate) {
        console.log(
          `[ArticleGeneration] Article ${articleId} failed quality gates: ${qualityResult.failureReason}. Retrying with stricter prompt...`
        );

        // Retry once with stricter prompt
        hasRetriedQualityGate = true;
        articleResult = await this.generateFullArticle(outline.data, input, imagePreset, true);
        totalTokens += articleResult.usage.totalTokens;

        // Re-check quality after retry
        qualityResult = articleQualityGateService.checkQualityGates(
          articleResult.content,
          outline.data,
          targetWordCount,
          articleResult.finishReason
        );

        if (!qualityResult.passed) {
          // Still failed after retry - mark as failed_quality
          console.error(
            `[ArticleGeneration] Article ${articleId} still failed quality gates after retry: ${qualityResult.failureReason}`
          );
          await this.handleQualityGateFailure(
            articleId,
            userId,
            qualityResult,
            outline.data,
            articleResult.content,
            imageCreditCost,
            input.model
          );
          return; // Exit without throwing
        }

        console.log(`[ArticleGeneration] Article ${articleId} passed quality gates on retry`);
      }

      // Step 3: Generate images if preset is provided
      let finalContent = articleResult.content;
      let successfulImageCount = 0;

      if (imagePreset) {
        const imageResults = await this.generateImagesForArticle(
          articleResult.content,
          input.keyword,
          imagePreset
        );

        // Step 4: Persist images to Supabase Storage (replace temp Replicate URLs)
        await persistArticleImages(imageResults, articleId, input.keyword);

        // Step 5: Replace markers with permanent image URLs
        finalContent = this.replaceImageMarkers(articleResult.content, imageResults);
        successfulImageCount = imageResults.filter(r => r.status === 'completed').length;

        // Save article images to database (now with permanent URLs)
        await this.saveArticleImages(articleId, imageResults);
      } else {
        // No images requested, strip any markers that might be present
        finalContent = this.stripImageMarkers(articleResult.content);
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

      // Step 5.6: Generate topic fingerprint for semantic deduplication (E10)
      let topicFingerprint: string | null = null;
      if (openaiEmbeddingsService.isConfigured()) {
        try {
          topicFingerprint = await openaiEmbeddingsService.generateEmbeddingForDB(input.keyword);
          console.log(`[ArticleGeneration] Topic fingerprint generated for article ${articleId}`);
        } catch (error) {
          // Don't fail generation if embedding generation fails
          console.warn(`[ArticleGeneration] Failed to generate topic fingerprint:`, error);
          topicFingerprint = null;
        }
      }

      // Step 5.7: Run QA pipeline checks (E11)
      let qaResults: IQACheckResult | null = null;
      let finalStatus: ArticleStatus = 'draft';
      let qaResultsForDb: IQACheckResult | null = null;

      // Get project QA config
      const { data: project } = await this.supabase
        .from('projects')
        .select('qa_config')
        .eq('id', input.projectId)
        .single();

      const qaConfig = (project?.qa_config as IQAConfig) || undefined;

      try {
        qaResults = await qaService.runQAChecks(finalContent, outline.data, qaConfig);
        qaResultsForDb = {
          ...qaResults,
          // Remove full flagged phrases for storage (keep counts only)
          results: {
            ...qaResults.results,
            plagiarism: {
              ...qaResults.results.plagiarism,
              flaggedPhrases: qaResults.results.plagiarism.flaggedPhrases.map(p => ({
                phrase: p.phrase.substring(0, 50), // Truncate for storage
                start: p.start,
                end: p.end,
              })),
            },
          },
        };

        // Determine final status based on QA results
        if (qaResults.passed) {
          finalStatus = 'qa_passed';
          console.log(`[ArticleGeneration] Article ${articleId} passed QA checks`);
        } else {
          finalStatus = 'qa_failed';
          console.warn(
            `[ArticleGeneration] Article ${articleId} failed QA checks: ${qaResults.failureReason}`
          );
        }
      } catch (error) {
        console.error(`[ArticleGeneration] QA checks failed for article ${articleId}:`, error);
        // Continue without QA if checks fail - don't block generation
        finalStatus = 'draft';
      }

      // Step 6: Save result
      await this.supabase
        .from('articles')
        .update({
          status: finalStatus,
          title: outline.data.title,
          content: finalContent,
          meta_description: outline.data.metaDescription,
          slug: outline.data.slug,
          word_count: wordCount,
          seo_score: seoResult.overallScore,
          ai_model_used: input.model || 'auto',
          token_count: totalTokens,
          generation_time_ms: generationTimeMs,
          generated_at: new Date().toISOString(),
          image_preset: imagePreset || null,
          image_count: successfulImageCount,
          credits_used: totalCredits,
          topic_fingerprint: topicFingerprint,
          qa_results: qaResultsForDb,
        })
        .eq('id', articleId)
        .eq('user_id', userId);

      console.log(
        `[ArticleGeneration] Article ${articleId} generated successfully in ${generationTimeMs}ms` +
          (imagePreset ? ` with ${successfulImageCount} images` : '')
      );

      // Step 6.5: Trigger auto-delivery if campaign has auto_publish enabled
      // Only deliver articles that passed QA or are in draft status (QA disabled/unavailable).
      // Never auto-deliver qa_failed articles — those need human review first.
      if (finalStatus === 'qa_passed' || finalStatus === 'draft') {
        try {
          await this.triggerAutoDeliveryIfNeeded(articleId, input.campaignId);
        } catch (deliveryError) {
          console.error(
            `[ArticleGeneration] Auto-delivery failed for article ${articleId}:`,
            deliveryError
          );
        }
      } else {
        console.log(
          `[ArticleGeneration] Skipping auto-delivery for article ${articleId} (status=${finalStatus})`
        );
      }

      // Step 6.6: Send article complete notification email
      // Only send for successful articles (qa_passed or draft)
      if (finalStatus === 'qa_passed' || finalStatus === 'draft') {
        try {
          const authUser = await supabaseAdmin.auth.admin.getUserById(userId);
          const userEmail = authUser.data.user?.email ?? null;
          const userName = authUser.data.user?.user_metadata?.full_name ?? 'there';

          if (!userEmail) {
            console.error(
              `[ArticleGeneration] Could not fetch user email for article complete email`
            );
          } else {
            // Get campaign name for the email
            const { data: campaign } = await this.supabase
              .from('campaigns')
              .select('name')
              .eq('id', input.campaignId)
              .single();

            const emailService = getEmailService();
            await emailService.sendArticleCompleteNotification({
              userId,
              email: userEmail,
              userName,
              articleTitle: outline.data.title,
              keyword: input.keyword,
              campaignName: campaign?.name,
              articleId,
            });
          }
        } catch (emailError) {
          // Log error but don't throw - email failure must never block generation
          console.error(
            `[ArticleGeneration] Failed to send article complete email for article ${articleId}:`,
            emailError
          );
        }
      }
    } catch (error) {
      console.error(`[ArticleGeneration] Error generating article ${articleId}:`, error);
      // Pass 'unknown' as default stage - error classifier will detect from message
      await this.handleGenerationFailure(
        articleId,
        userId,
        error,
        imageCreditCost,
        'unknown',
        input.model
      );
      throw error; // Re-throw for logging
    }
  }

  /**
   * Generate an article outline.
   */
  private async generateOutline(
    input: IGenerateArticleInput,
    gscContext?: IGscArticleContext
  ): Promise<{
    data: IArticleOutline;
    usage: { totalTokens: number };
  }> {
    const tone = input.tone || 'professional';
    const targetWordCount = input.targetWordCount || 1500;
    const model = resolveWriterModel(input.model || 'auto', serverEnv.AVAILABLE_WRITER_PRESETS);

    const systemPrompt = getOutlinePrompt(input.keyword, tone, targetWordCount, gscContext);

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
    imagePreset: ImagePresetKey | null | undefined,
    isRetry: boolean = false
  ): Promise<{ content: string; usage: { totalTokens: number }; finishReason: string }> {
    const tone = input.tone || 'professional';
    const targetWordCount = input.targetWordCount || 1500;
    const model = resolveWriterModel(input.model || 'auto', serverEnv.AVAILABLE_WRITER_PRESETS);

    // Calculate image count based on word count
    const imageCount = imagePreset ? getImageCountForWordCount(targetWordCount) : 0;

    // Use stricter prompt for retry
    const systemPrompt = isRetry
      ? getArticleRetryPrompt(outline, tone, targetWordCount, imageCount)
      : getArticlePrompt(outline, tone, targetWordCount, imageCount);

    const result = await this.openRouter.chatCompletionWithRetry({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: isRetry
            ? 'Write the COMPLETE article now. DO NOT STOP until finished.'
            : 'Write the article now.',
        },
      ],
      responseFormat: { type: 'text' },
      temperature: isRetry ? 0.6 : 0.8, // Lower temperature for more consistent output on retry
      maxTokens: isRetry ? 6000 : 4000, // Higher max tokens for retry to allow longer completion
    });

    return { content: result.content, usage: result.usage, finishReason: result.finishReason };
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
   * Uses structured error classification for monitoring and triage.
   *
   * IMPORTANT: Refund amount is read from articles.credits_used, not recomputed.
   * This prevents credit loss/minting when charge and refund formulas diverge.
   */
  private async handleGenerationFailure(
    articleId: string,
    userId: string,
    error: unknown,
    _imageCreditCost: number, // Unused: kept for backward compatibility
    failureStage: FailureStage = 'unknown',
    _writerModel?: string | null // Unused: kept for backward compatibility
  ): Promise<void> {
    // Classify the error using the error classifier
    const parsedError = classifyError(error, failureStage);
    const formattedErrorMessage = formatErrorMessage(parsedError);
    const failureMetadata = createFailureMetadata(parsedError);

    // Get current attempt count and credits_used from article
    // We read credits_used to ensure refund matches exact charge amount
    const { data: article } = await this.supabase
      .from('articles')
      .select('attempt_count, credits_used')
      .eq('id', articleId)
      .single();

    const currentAttemptCount = article?.attempt_count || 1;
    const creditsToRefund = article?.credits_used ?? 1; // Default to 1 if not set (safety)

    // Update article status with structured failure metadata
    await this.supabase
      .from('articles')
      .update({
        status: 'failed',
        generation_error: formattedErrorMessage,
        ...failureMetadata,
        // Increment attempt count
        attempt_count: currentAttemptCount + 1,
      })
      .eq('id', articleId)
      .eq('user_id', userId);

    // Refund exact amount that was charged (read from credits_used column)
    // This prevents credit loss or minting if charge/refund formulas diverge
    await this.supabase.rpc('add_purchased_credits', {
      p_user_id: userId,
      p_amount: creditsToRefund,
      p_reference_id: articleId,
      p_description: `Refund: generation failed - ${formattedErrorMessage}`,
    });

    console.log(
      `[ArticleGeneration] ${creditsToRefund} credits refunded for failed article ${articleId}` +
        ` [stage=${parsedError.stage}, provider=${parsedError.provider}, retryable=${parsedError.isRetryable}]`
    );

    // Log structured failure metrics for monitoring
    await this.logFailureMetrics(articleId, parsedError);
  }

  /**
   * Handle quality gate failure - mark article as failed_quality and refund credit.
   * Uses structured error classification for monitoring.
   * Does NOT throw - allows generation to complete gracefully.
   *
   * IMPORTANT: Refund amount is read from articles.credits_used, not recomputed.
   * This prevents credit loss/minting when charge and refund formulas diverge.
   */
  private async handleQualityGateFailure(
    articleId: string,
    userId: string,
    qualityResult: IQualityGateResult,
    outline: IArticleOutline,
    content: string,
    _imageCreditCost: number, // Unused: kept for backward compatibility
    _writerModel?: string | null // Unused: kept for backward compatibility
  ): Promise<void> {
    // Create structured error for quality gate failure
    const parsedError = classifyError(
      new Error(qualityResult.failureReason || 'Quality gate failed'),
      'quality_gate'
    );

    // Get current attempt count and credits_used from article
    // We read credits_used to ensure refund matches exact charge amount
    const { data: article } = await this.supabase
      .from('articles')
      .select('attempt_count, credits_used')
      .eq('id', articleId)
      .single();

    const currentAttemptCount = article?.attempt_count || 1;
    const creditsToRefund = article?.credits_used ?? 1; // Default to 1 if not set (safety)

    // Update article status with structured failure details
    await this.supabase
      .from('articles')
      .update({
        status: 'failed_quality',
        title: outline.title,
        content: content,
        meta_description: outline.metaDescription,
        slug: outline.slug,
        word_count: qualityResult.details.wordCountCheck.actual,
        generation_error: qualityResult.failureReason || 'Quality gate failed',
        // Structured failure metadata
        failure_stage: 'quality_gate',
        provider: 'internal',
        is_retryable: false, // Quality gate failures require human review
        attempt_count: currentAttemptCount + 1,
      })
      .eq('id', articleId)
      .eq('user_id', userId);

    // Refund exact amount that was charged (read from credits_used column)
    // This prevents credit loss or minting if charge/refund formulas diverge
    await this.supabase.rpc('add_purchased_credits', {
      p_user_id: userId,
      p_amount: creditsToRefund,
      p_reference_id: articleId,
      p_description: `Refund: quality gate failed after retry - ${qualityResult.failureReason}`,
    });

    console.log(
      `[ArticleGeneration] ${creditsToRefund} credits refunded for quality gate failure on article ${articleId}`
    );

    // Log structured failure metrics
    await this.logFailureMetrics(articleId, parsedError);
  }

  /**
   * Trigger auto-delivery if campaign has auto_publish enabled
   *
   * This method checks the campaign settings and triggers delivery asynchronously
   * if auto_publish is enabled. It's designed to be called without awaiting.
   *
   * @param articleId - The article ID to deliver
   * @param campaignId - The campaign ID to check for auto_publish setting
   */
  private async triggerAutoDeliveryIfNeeded(articleId: string, campaignId: string): Promise<void> {
    try {
      // Dynamic import to avoid circular dependencies
      // eslint-disable-next-line no-restricted-syntax
      const { deliveryService } = await import('@server/services/delivery.service');

      // Check if auto-publish is enabled for this campaign
      const shouldDeliver = await deliveryService.shouldAutoDeliver(campaignId);

      if (shouldDeliver) {
        console.log(
          `[ArticleGeneration] Auto-delivery enabled for campaign ${campaignId}, triggering delivery for article ${articleId}`
        );
        await deliveryService.deliverArticle(articleId);
      } else {
        console.log(
          `[ArticleGeneration] Auto-delivery disabled for campaign ${campaignId}, skipping delivery for article ${articleId}`
        );
      }
    } catch (error) {
      // Don't throw - auto-delivery failure should not fail the generation
      console.error(
        `[ArticleGeneration] Failed to trigger auto-delivery for article ${articleId}:`,
        error
      );
    }
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

  /**
   * Log structured failure metrics for monitoring and analytics.
   * Uses console.error for Baselime alert compatibility.
   *
   * Structured fields enable Baselime alert queries like:
   * - stage=article_generation AND httpStatus>=500
   * - provider=openrouter AND httpStatus=503
   * - isRetryable=true
   */
  private async logFailureMetrics(
    articleId: string,
    parsedError: ReturnType<typeof classifyError>
  ): Promise<void> {
    // Structured error log for Baselime alert queries
    // All fields are logged as a single JSON object for queryability
    const structuredError = {
      message: 'Article generation failed',
      level: 'error',
      articleId,
      timestamp: new Date().toISOString(),
      stage: parsedError.stage,
      provider: parsedError.provider,
      category: parsedError.category,
      isRetryable: parsedError.isRetryable,
      httpStatus: parsedError.httpStatus,
      errorMessage: parsedError.message,
    };

    // Use console.error for Baselime error-level alerting
    console.error(
      '[ArticleGeneration] Article generation failed:',
      JSON.stringify(structuredError)
    );
  }
}

// Export singleton instance
export const articleGenerationService = new ArticleGenerationService();
