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
  getArticleQARetryPrompt,
  getQAFixPrompt,
} from './prompts/article-prompts';
import type { IQAResult } from '@shared/types/article.types';
import { calculateOverallSEOScore } from '@shared/utils/seo';
import type {
  ArticleStatus,
  IArticleOutline,
  IArticleStylePreferences,
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
      // Fetch internal links if needed before generating the outline
      const stylePreferences = input.stylePreferences;
      const internalLinksCount = stylePreferences?.internalLinksCount ?? 0;
      const internalLinks: Array<{ title: string; url: string }> =
        input.internalLinks ??
        (internalLinksCount > 0
          ? await this.fetchInternalLinks(input.projectId, internalLinksCount)
          : []);

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
      let articleResult = await this.generateFullArticle(
        outline.data,
        input,
        imagePreset,
        false,
        undefined,
        stylePreferences,
        internalLinks
      );
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
        articleResult = await this.generateFullArticle(
          outline.data,
          input,
          imagePreset,
          true,
          undefined,
          stylePreferences,
          internalLinks
        );
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
      let imageResults: IImageResult[] = [];
      let finalContent = articleResult.content;
      let successfulImageCount = 0;

      if (imagePreset) {
        imageResults = await this.generateImagesForArticle(
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

      // Step 5: Run QA pipeline checks with up to MAX_QA_RETRIES retries (E11).
      // After exhausting retries, publish as draft so a human can review — never block forever.
      const MAX_QA_RETRIES = 2; // 1 initial check + 2 retries = 3 total QA checks
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

        // Retry loop: up to MAX_QA_RETRIES additional attempts when QA fails
        for (let qaAttempt = 1; qaAttempt <= MAX_QA_RETRIES && !qaResults.passed; qaAttempt++) {
          console.log(
            `[ArticleGeneration] Article ${articleId} failed QA check (attempt ${qaAttempt}/${MAX_QA_RETRIES}): ${qaResults.failureReason}. Retrying with feedback...`
          );

          const qaFeedback = this.buildQAFeedback(qaResults);
          const qaRetryResult = await this.generateFullArticle(
            outline.data,
            input,
            imagePreset,
            false,
            qaFeedback,
            stylePreferences,
            internalLinks
          );
          totalTokens += qaRetryResult.usage.totalTokens;

          // Re-apply already-generated images to the new content
          const qaRetryContent = imagePreset
            ? this.replaceImageMarkers(qaRetryResult.content, imageResults)
            : this.stripImageMarkers(qaRetryResult.content);

          // Always advance to latest content (best-effort for final publish)
          finalContent = qaRetryContent;

          qaResults = await qaService.runQAChecks(qaRetryContent, outline.data, qaConfig);

          if (qaResults.passed) {
            console.log(`[ArticleGeneration] Article ${articleId} passed QA on retry ${qaAttempt}`);
          }
        }

        const safeFlaggedPhrases = Array.isArray(qaResults.results?.plagiarism?.flaggedPhrases)
          ? qaResults.results.plagiarism.flaggedPhrases
          : [];

        qaResultsForDb = {
          ...qaResults,
          results: {
            ...qaResults.results,
            plagiarism: {
              ...qaResults.results.plagiarism,
              flaggedPhrases: safeFlaggedPhrases.map(p => ({
                phrase: p.phrase.substring(0, 50),
                start: p.start,
                end: p.end,
              })),
            },
          },
        };

        if (qaResults.passed) {
          finalStatus = 'qa_passed';
          console.log(`[ArticleGeneration] Article ${articleId} passed QA`);
        } else {
          // Exhausted all retries — publish as qa_failed so a human can review; never block forever.
          // Note: qa_failed status prevents auto-approve/auto-delivery (intentional safeguard)
          finalStatus = 'qa_failed';
          console.warn(
            `[ArticleGeneration] Article ${articleId} still failed QA after ${MAX_QA_RETRIES} retries ` +
              `(${qaResults.failureReason}). Publishing as qa_failed for manual review.`
          );
        }
      } catch (error) {
        console.error(`[ArticleGeneration] QA checks failed for article ${articleId}:`, error);
        // QA pipeline error — publish as qa_failed so the article isn't blocked permanently.
        finalStatus = 'qa_failed';
      }

      // Step 5.5: Extract metadata from final content (after QA retries may have updated it)
      const wordCount = this.countWords(finalContent);
      const generationTimeMs = Date.now() - startTime;

      // Step 5.6: Calculate SEO score from final content
      const seoResult = calculateOverallSEOScore({
        title: outline.data.title,
        content: finalContent,
        meta_description: outline.data.metaDescription,
        primary_keyword: input.keyword,
        word_count: wordCount,
      });

      // Step 5.7: Generate topic fingerprint for semantic deduplication (E10)
      let topicFingerprint: string | null = null;
      if (openaiEmbeddingsService.isConfigured()) {
        try {
          topicFingerprint = await openaiEmbeddingsService.generateEmbeddingForDB(input.keyword);
          console.log(`[ArticleGeneration] Topic fingerprint generated for article ${articleId}`);
        } catch (error) {
          console.warn(`[ArticleGeneration] Failed to generate topic fingerprint:`, error);
          topicFingerprint = null;
        }
      }

      // Step 6: Save result
      // Calculate AI detection score from QA results (invert: QA aiScore 0-1 higher=AI → display score 0-100 higher=human)
      const aiDetectionScore =
        qaResults?.results?.aiLikelihood?.aiScore !== undefined
          ? Math.round((1 - qaResults.results.aiLikelihood.aiScore) * 100)
          : null;

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
          ai_detection_score: aiDetectionScore,
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

      // Step 6.4: Auto-approve if project setting enabled
      // If autoApprove is set, transition draft/qa_passed → approved → published.
      let autoApproved = false;
      if (finalStatus === 'qa_passed' && input.projectId) {
        const shouldAutoApprove = await this.shouldAutoApprove(input.projectId);
        if (shouldAutoApprove) {
          autoApproved = true;
          await this.supabase.from('articles').update({ status: 'approved' }).eq('id', articleId);
          try {
            // eslint-disable-next-line no-restricted-syntax
            const { deliveryService } = await import('@server/services/delivery.service');
            const result = await deliveryService.deliverArticle(articleId);
            if (result.successful > 0) {
              await this.supabase
                .from('articles')
                .update({
                  status: 'published',
                  published_at: new Date().toISOString(),
                })
                .eq('id', articleId);
            }
          } catch (deliveryError) {
            console.error(
              `[ArticleGeneration] Auto-approve delivery failed for article ${articleId}:`,
              deliveryError
            );
            // Keep as approved even if delivery fails
          }
        }
      }

      // Step 6.5: Trigger auto-delivery if campaign has auto_publish enabled
      // Deliver qa_passed articles and draft articles (QA-exhausted or QA-disabled).
      // Skip if already handled by auto-approve (Step 6.4).
      if (!autoApproved && finalStatus === 'qa_passed') {
        try {
          await this.triggerAutoDeliveryIfNeeded(articleId, input.campaignId);
        } catch (deliveryError) {
          console.error(
            `[ArticleGeneration] Auto-delivery failed for article ${articleId}:`,
            deliveryError
          );
        }
      } else if (!autoApproved) {
        console.log(
          `[ArticleGeneration] Skipping auto-delivery for article ${articleId} (status=${finalStatus})`
        );
      }

      // Step 6.6: Send article complete notification email
      // Only send for successful articles (qa_passed or draft)
      if (finalStatus === 'qa_passed') {
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

    const systemPrompt = getOutlinePrompt(
      input.keyword,
      tone,
      targetWordCount,
      gscContext,
      input.stylePreferences
    );

    const outlineJsonSchema = {
      type: 'json_schema' as const,
      json_schema: {
        name: 'article_outline',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            metaDescription: { type: 'string' },
            slug: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  subheadings: { type: 'array', items: { type: 'string' } },
                  keyPoints: { type: 'array', items: { type: 'string' } },
                },
                required: ['heading', 'subheadings', 'keyPoints'],
                additionalProperties: false,
              },
            },
          },
          required: ['title', 'metaDescription', 'slug', 'sections'],
          additionalProperties: false,
        },
      },
    };

    try {
      const result = await this.openRouter.chatCompletionWithRetry({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.keyword },
        ],
        responseFormat: outlineJsonSchema,
        temperature: 0.7,
        maxTokens: 4000,
      });

      if (result.finishReason === 'length') {
        console.warn(
          `[ArticleGeneration] Outline response truncated (finish_reason=length). ` +
            `tokens=${result.usage.totalTokens} prompt_approx=${result.usage.promptTokens} ` +
            `completion_approx=${result.usage.completionTokens}. ` +
            `Raw content (first 300): ${result.content.substring(0, 300)}`
        );
        throw new Error('Outline response truncated by token limit (finish_reason=length)');
      }

      const outline = this.parseOutlineJson(result.content);
      return { data: outline, usage: result.usage };
    } catch (firstError) {
      // Retry with stricter (shorter) prompt — keeps the same generous token budget
      console.log(
        `[ArticleGeneration] Outline generation failed (${firstError instanceof Error ? firstError.message : firstError}), retrying with stricter prompt`
      );

      const retryResult = await this.openRouter.chatCompletionWithRetry({
        model,
        messages: [
          { role: 'system', content: getOutlineRetryPrompt(input.keyword) },
          { role: 'user', content: input.keyword },
        ],
        responseFormat: outlineJsonSchema,
        temperature: 0.5,
        maxTokens: 4000,
      });

      if (retryResult.finishReason === 'length') {
        console.error(
          `[ArticleGeneration] Outline RETRY also truncated (finish_reason=length). ` +
            `tokens=${retryResult.usage.totalTokens}. ` +
            `Raw content (first 300): ${retryResult.content.substring(0, 300)}`
        );
        throw new Error('Outline retry also truncated by token limit (finish_reason=length)');
      }

      const outline = this.parseOutlineJson(retryResult.content);
      return { data: outline, usage: retryResult.usage };
    }
  }

  /**
   * Parse outline JSON from a model response, stripping markdown code fences if present.
   * Logs the raw content on failure to help diagnose model output issues.
   */
  private parseOutlineJson(raw: string): IArticleOutline {
    // Strip markdown code fences: ```json\n...\n``` or ```\n...\n```
    const stripped = raw
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    try {
      return JSON.parse(stripped) as IArticleOutline;
    } catch (err) {
      console.error(
        `[ArticleGeneration] JSON parse failed for outline. ` +
          `Error: ${err instanceof Error ? err.message : err}. ` +
          `Raw content (first 500 chars): ${raw.substring(0, 500)}`
      );
      throw err;
    }
  }

  /**
   * Generate the full article from an outline.
   *
   * @param qaFindings - Optional QA failure findings from a previous attempt.
   *   When provided, uses the QA-guided retry prompt so the AI knows what to fix.
   * @param stylePreferences - Optional style preferences to include in the prompt.
   * @param internalLinks - Optional pre-fetched internal links to include in the prompt.
   */
  private async generateFullArticle(
    outline: IArticleOutline,
    input: IGenerateArticleInput,
    imagePreset: ImagePresetKey | null | undefined,
    isRetry: boolean = false,
    qaFindings?: string,
    stylePreferences?: IArticleStylePreferences,
    internalLinks?: Array<{ title: string; url: string }>
  ): Promise<{ content: string; usage: { totalTokens: number }; finishReason: string }> {
    const tone = input.tone || 'professional';
    const targetWordCount = input.targetWordCount || 1500;
    // QA retries always use the 'balanced' model to keep cost predictable,
    // regardless of the user's selected writer preset.
    const model = qaFindings
      ? resolveWriterModel('balanced', serverEnv.AVAILABLE_WRITER_PRESETS)
      : resolveWriterModel(input.model || 'auto', serverEnv.AVAILABLE_WRITER_PRESETS);

    // Calculate image count based on word count
    const imageCount = imagePreset ? getImageCountForWordCount(targetWordCount) : 0;

    // Select prompt: QA-guided retry > quality-gate retry > standard
    const systemPrompt = qaFindings
      ? getArticleQARetryPrompt(
          outline,
          tone,
          targetWordCount,
          imageCount,
          qaFindings,
          stylePreferences,
          internalLinks
        )
      : isRetry
        ? getArticleRetryPrompt(
            outline,
            tone,
            targetWordCount,
            imageCount,
            stylePreferences,
            internalLinks
          )
        : getArticlePrompt(
            outline,
            tone,
            targetWordCount,
            imageCount,
            stylePreferences,
            internalLinks
          );

    const attemptLabel = qaFindings ? 'qa-retry' : isRetry ? 'quality-retry' : 'initial';
    console.log(
      `[ArticleGeneration] generateFullArticle attempt=${attemptLabel} model=${model} targetWords=${targetWordCount} imageCount=${imageCount}`
    );

    const result = await this.openRouter.chatCompletionWithRetry({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            qaFindings || isRetry
              ? 'Write the COMPLETE article now. DO NOT STOP until finished.'
              : 'Write the article now.',
        },
      ],
      responseFormat: { type: 'text' },
      temperature: qaFindings || isRetry ? 0.6 : 0.8,
      maxTokens: qaFindings || isRetry ? 16000 : 12000,
    });

    console.log(
      `[ArticleGeneration] generateFullArticle done: attempt=${attemptLabel} finishReason=${result.finishReason} tokens=total:${result.usage.totalTokens} prompt:${result.usage.promptTokens} completion:${result.usage.completionTokens} contentLength=${result.content.length}`
    );

    return { content: result.content, usage: result.usage, finishReason: result.finishReason };
  }

  /**
   * Fetch published articles from the same project for internal linking.
   * Returns up to `limit` articles with their titles and published URLs.
   *
   * @param projectId - The project to fetch articles from
   * @param limit - Maximum number of internal links to fetch
   */
  private async fetchInternalLinks(
    projectId: string,
    limit: number
  ): Promise<Array<{ title: string; url: string }>> {
    if (limit <= 0) {
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('title, published_url')
        .eq('project_id', projectId)
        .eq('status', 'published')
        .not('published_url', 'is', null)
        .not('title', 'is', null)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        console.warn(
          `[ArticleGeneration] Failed to fetch internal links for project ${projectId}:`,
          error?.message
        );
        return [];
      }

      return data
        .filter(a => a.title && a.published_url)
        .map(a => ({ title: a.title as string, url: a.published_url as string }));
    } catch (err) {
      console.warn(`[ArticleGeneration] Error fetching internal links:`, err);
      return [];
    }
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
   * Format QA check results into actionable feedback for the retry prompt.
   * Produces a bullet-list of what failed and how to fix it.
   */
  private buildQAFeedback(qaResults: IQACheckResult): string {
    const lines: string[] = [];
    const aiLikelihood = qaResults.results?.aiLikelihood;
    const readability = qaResults.results?.readability;
    const plagiarism = qaResults.results?.plagiarism;
    const factConsistency = qaResults.results?.factConsistency;

    if (aiLikelihood && !aiLikelihood.passed) {
      const aiScore = typeof aiLikelihood.aiScore === 'number' ? aiLikelihood.aiScore : 1;
      const detectedPatterns = Array.isArray(aiLikelihood.detectedPatterns)
        ? aiLikelihood.detectedPatterns
        : [];
      lines.push(
        `- AI Detection: Content scored ${Math.round(aiScore * 100)}% AI likelihood (threshold: 80%).` +
          (detectedPatterns.length > 0 ? ` Detected: ${detectedPatterns.join(', ')}.` : '') +
          ' Fix: Vary sentence length, avoid generic transitions (furthermore, moreover, additionally), use contractions, add concrete examples and a personal voice.'
      );
    }

    if (readability && !readability.passed) {
      const fleschKincaidGrade =
        typeof readability.fleschKincaidGrade === 'number' ? readability.fleschKincaidGrade : 18;
      const fleschReadingEase =
        typeof readability.fleschReadingEase === 'number' ? readability.fleschReadingEase : 0;
      lines.push(
        `- Readability: Grade level ${fleschKincaidGrade.toFixed(1)} (max: 12), reading ease ${fleschReadingEase.toFixed(1)} (min: 30).` +
          ' Fix: Shorten sentences, use simpler vocabulary, prefer active voice, and break up long paragraphs.'
      );
    }

    if (plagiarism && !plagiarism.passed) {
      const similarityScore =
        typeof plagiarism.similarityScore === 'number' ? plagiarism.similarityScore : 1;
      const consecutiveMatches =
        typeof plagiarism.consecutiveMatches === 'number' ? plagiarism.consecutiveMatches : 0;
      lines.push(
        `- Originality: Similarity score ${Math.round(similarityScore * 100)}% (threshold: 15%), ${consecutiveMatches} repeated phrase groups detected.` +
          ' Fix: Rephrase repeated sections, avoid generic filler phrases, and express ideas in a unique way.'
      );
    }

    if (factConsistency && !factConsistency.passed) {
      const flaggedStatements = Array.isArray(factConsistency.flaggedStatements)
        ? factConsistency.flaggedStatements
        : [];
      lines.push(
        `- Consistency: ${flaggedStatements.length} inconsistencies found.` +
          (flaggedStatements.length > 0
            ? ` Issues: ${flaggedStatements.slice(0, 3).join('; ')}.`
            : '') +
          ' Fix: Ensure all outline sections and headings appear in the content, and that the title keyword is used.'
      );
    }

    if (lines.length === 0) {
      return (
        '- QA checks reported failure with incomplete diagnostics.' +
        ' Fix: improve originality, readability, factual consistency, and natural writing style.'
      );
    }

    return lines.join('\n');
  }

  /**
   * Build QA feedback string from the stored IQAResult (DB format).
   * Used by fixArticleQAIssues which reads from the articles table.
   */
  private buildQAFeedbackFromStored(qa: IQAResult): string {
    const lines: string[] = [];
    const r = qa.results;

    if (r?.aiLikelihood && !r.aiLikelihood.passed) {
      lines.push(
        `- AI Detection: Content scored ${Math.round(r.aiLikelihood.aiScore * 100)}% AI likelihood (threshold: 80%).` +
          ' Fix: Vary sentence length, avoid generic transitions (furthermore, moreover, additionally), use contractions, add concrete examples and a personal voice.'
      );
    }

    if (r?.readability && !r.readability.passed) {
      lines.push(
        `- Readability: Grade level ${r.readability.fleschKincaidGrade.toFixed(1)} (max: 12), reading ease ${r.readability.fleschReadingEase.toFixed(1)} (min: 30).` +
          ' Fix: Shorten sentences, use simpler vocabulary, prefer active voice, and break up long paragraphs.'
      );
    }

    if (r?.plagiarism && !r.plagiarism.passed) {
      const phraseCount = Array.isArray(r.plagiarism.flaggedPhrases)
        ? r.plagiarism.flaggedPhrases.length
        : r.plagiarism.flaggedPhrases;
      lines.push(
        `- Originality: Similarity score ${Math.round(r.plagiarism.similarityScore * 100)}% (threshold: 15%), ${phraseCount} repeated phrase groups detected.` +
          ' Fix: Rephrase repeated sections, avoid generic filler phrases, and express ideas in a unique way.'
      );
    }

    if (r?.factConsistency && !r.factConsistency.passed) {
      lines.push(
        `- Consistency: ${r.factConsistency.inconsistencyCount} inconsistencies found.` +
          ' Fix: Ensure all outline sections and headings appear in the content, and that the title keyword is used.'
      );
    }

    if (lines.length === 0) {
      return (
        '- QA checks reported failure with incomplete diagnostics.' +
        ' Fix: improve originality, readability, factual consistency, and natural writing style.'
      );
    }

    return lines.join('\n');
  }

  /**
   * Fix QA issues in an existing qa_failed article using targeted AI edits.
   *
   * Unlike full regeneration, this method:
   * - Takes the existing content and applies targeted fixes to QA failures
   * - Does NOT charge credits (lightweight targeted edit)
   * - Preserves article structure, headings, and facts
   * - Re-runs QA checks and updates the article status accordingly
   */
  async fixArticleQAIssues(articleId: string, userId: string): Promise<void> {
    const { data: article } = await this.supabase
      .from('articles')
      .select(
        'id, content, title, primary_keyword, meta_description, outline, qa_results, campaigns(id, project_id, ai_model)'
      )
      .eq('id', articleId)
      .eq('user_id', userId)
      .single();

    if (!article || !article.content || !article.qa_results) {
      await this.supabase
        .from('articles')
        .update({
          status: 'qa_failed',
          generation_error: 'Cannot fix: missing content or QA results',
        })
        .eq('id', articleId);
      return;
    }

    try {
      // Build targeted QA feedback from stored results
      const qaFeedback = this.buildQAFeedbackFromStored(article.qa_results as IQAResult);

      // Use balanced model for cost efficiency
      const model = resolveWriterModel('balanced', serverEnv.AVAILABLE_WRITER_PRESETS);
      const systemPrompt = getQAFixPrompt(article.content, qaFeedback);

      const result = await this.openRouter.chatCompletionWithRetry({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: 'Apply the fixes now. Return only the revised article in markdown.',
          },
        ],
        responseFormat: { type: 'text' },
        temperature: 0.5,
        maxTokens: 12000,
      });

      const fixedContent = result.content;

      // Get project QA config (if any)
      const campaign = article.campaigns as unknown as {
        id: string;
        project_id: string | null;
        ai_model: string | null;
      } | null;
      let qaConfig: IQAConfig | undefined;
      if (campaign?.project_id) {
        const { data: project } = await this.supabase
          .from('projects')
          .select('qa_config')
          .eq('id', campaign.project_id)
          .single();
        qaConfig = (project?.qa_config as IQAConfig) || undefined;
      }

      // Re-run QA on fixed content
      const qaResults = await qaService.runQAChecks(
        fixedContent,
        (article.outline as IArticleOutline) ?? {
          title: article.title ?? '',
          sections: [],
          primaryKeyword: article.primary_keyword,
          metaDescription: article.meta_description ?? '',
        },
        qaConfig
      );

      // Prepare DB-safe QA results (cap flaggedPhrases array)
      const safeFlaggedPhrases = Array.isArray(qaResults.results?.plagiarism?.flaggedPhrases)
        ? qaResults.results.plagiarism.flaggedPhrases
        : [];
      const qaResultsForDb = {
        ...qaResults,
        results: {
          ...qaResults.results,
          plagiarism: {
            ...qaResults.results.plagiarism,
            flaggedPhrases: safeFlaggedPhrases.map(p => ({
              phrase: p.phrase.substring(0, 50),
              start: p.start,
              end: p.end,
            })),
          },
        },
      };

      // Recalculate SEO score
      const wordCount = this.countWords(fixedContent);
      const seoResult = calculateOverallSEOScore({
        title: article.title,
        content: fixedContent,
        meta_description: article.meta_description,
        primary_keyword: article.primary_keyword,
        word_count: wordCount,
      });

      // Calculate AI detection score (invert: QA aiScore 0-1 higher=AI → display score 0-100 higher=human)
      const aiDetectionScore =
        qaResults?.results?.aiLikelihood?.aiScore !== undefined
          ? Math.round((1 - qaResults.results.aiLikelihood.aiScore) * 100)
          : null;

      await this.supabase
        .from('articles')
        .update({
          status: qaResults.passed ? 'qa_passed' : 'qa_failed',
          content: fixedContent,
          word_count: wordCount,
          qa_results: qaResultsForDb,
          seo_score: seoResult.overallScore,
          ai_detection_score: aiDetectionScore,
          generation_error: null,
        })
        .eq('id', articleId);
    } catch (error) {
      console.error(`[ArticleGeneration] QA fix failed for article ${articleId}:`, error);
      await this.supabase
        .from('articles')
        .update({
          status: 'qa_failed',
          generation_error: `QA fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
        .eq('id', articleId);
    }
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
      prompt_embedding: r.promptEmbedding ?? null,
      reused_from_image_id: r.reusedFromImageId ?? null,
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
    const { error: refundError } = await this.supabase.rpc('add_purchased_credits', {
      target_user_id: userId,
      amount: creditsToRefund,
      ref_id: articleId,
      description: `Refund: generation failed - ${formattedErrorMessage}`,
    });

    if (refundError) {
      console.error(
        `[ArticleGeneration] CRITICAL: Failed to refund ${creditsToRefund} credits for article ${articleId}:`,
        refundError
      );
    } else {
      console.log(
        `[ArticleGeneration] ${creditsToRefund} credits refunded for failed article ${articleId}` +
          ` [stage=${parsedError.stage}, provider=${parsedError.provider}, retryable=${parsedError.isRetryable}]`
      );
    }

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
    const { error: refundError } = await this.supabase.rpc('add_purchased_credits', {
      target_user_id: userId,
      amount: creditsToRefund,
      ref_id: articleId,
      description: `Refund: quality gate failed after retry - ${qualityResult.failureReason}`,
    });

    if (refundError) {
      console.error(
        `[ArticleGeneration] CRITICAL: Failed to refund ${creditsToRefund} credits for quality gate failure on article ${articleId}:`,
        refundError
      );
    } else {
      console.log(
        `[ArticleGeneration] ${creditsToRefund} credits refunded for quality gate failure on article ${articleId}`
      );
    }

    // Log structured failure metrics
    await this.logFailureMetrics(articleId, parsedError);
  }

  /**
   * Check if the project has auto-approve enabled.
   * Returns true only when content_preferences.autoApprove === true.
   */
  private async shouldAutoApprove(projectId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('projects')
      .select('content_preferences')
      .eq('id', projectId)
      .single();
    return data?.content_preferences?.autoApprove === true;
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
