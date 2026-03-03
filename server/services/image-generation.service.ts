/**
 * Image Generation Service
 *
 * Orchestrates parallel image generation via Replicate API:
 * 1. Parse image markers from article markdown
 * 2. Generate contextual image prompts via LLM
 * 3. Check pgvector similarity library — reuse if ≥ 0.90 cosine similarity
 * 4. Call Replicate API for novel prompts with rate limit awareness
 * 5. Return results with URLs and metadata
 */

import { OpenRouterService } from './openrouter.service';
import { getReplicateService } from './replicate.service';
import {
  getImagePreset,
  getPresetDescription,
  type ImagePresetKey,
} from '@shared/config/image-models.config';
import {
  getImagePromptsGenerationPrompt,
  getFallbackImagePrompt,
  type IImageMarker,
} from './prompts/image-prompts';
import { serverEnv } from '@shared/config/env';
import { EmbeddingService } from './embedding.service';
import { ImageSimilarityService } from './image-similarity.service';

/**
 * Result from generating a single image
 */
export interface IImageResult {
  position: number;
  imageUrl: string | null;
  prompt: string;
  model: string;
  presetKey: ImagePresetKey;
  status: 'completed' | 'failed';
  error?: string;
  generationTimeMs?: number;
  replicatePredictionId?: string;
  // Semantic reuse metadata
  promptEmbedding: number[] | null;
  wasReused: boolean;
  reusedFromImageId: string | null;
}

/**
 * Image generation service
 */
export class ImageGenerationService {
  private openRouter = new OpenRouterService();
  private replicate = getReplicateService();
  private embeddingService = new EmbeddingService();
  private imageSimilarityService = new ImageSimilarityService();

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate images for an article based on image markers.
   * Uses sequential generation with exponential backoff for rate limits.
   * Checks pgvector similarity library first to reuse existing images when
   * cosine similarity of prompt embeddings is ≥ 0.90 (same preset tier).
   *
   * @param markers - Array of image markers with section context
   * @param presetKey - Image preset to use
   * @param keyword - Article keyword for fallback prompts
   * @returns Array of image results (successful and failed)
   */
  async generateImagesForArticle(
    markers: IImageMarker[],
    presetKey: ImagePresetKey,
    keyword: string
  ): Promise<IImageResult[]> {
    if (markers.length === 0) {
      return [];
    }

    // Get preset configuration
    const preset = getImagePreset(presetKey);
    const presetDescription = getPresetDescription(presetKey);

    console.log(
      `[ImageGeneration] Generating ${markers.length} images with preset: ${presetKey}`
    );

    // Step 1: Generate image prompts for each marker
    const prompts = await this.generateImagePrompts(markers, keyword, presetDescription);

    // Step 2: Embed all prompts in a single batch API call
    const promptTexts = markers.map((marker, i) =>
      prompts[i] || getFallbackImagePrompt(keyword, marker.sectionContext)
    );
    const embeddings = await this.embeddingService.embedBatch(promptTexts);

    // Step 3: Generate images — reuse if similar found, else call Replicate
    const results: IImageResult[] = [];

    // Delays in milliseconds: first Replicate request no delay, then exponential backoff
    // Track separately from reused images (which skip Replicate entirely)
    const replicateDelays = [0, 3000, 5000, 10000]; // For up to 4 Replicate calls
    let replicateCallCount = 0;

    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const prompt = promptTexts[i];
      const embedding = embeddings[i] ?? null;

      // Check similarity library before calling Replicate
      const match = await this.imageSimilarityService.findSimilarImage(embedding, presetKey);

      if (match) {
        // Reuse existing image — no Replicate call, no rate-limit delay needed
        results.push({
          position: marker.position,
          imageUrl: match.imageUrl,
          prompt,
          model: preset.replicateModel,
          presetKey,
          status: 'completed',
          promptEmbedding: embedding,
          wasReused: true,
          reusedFromImageId: match.id,
        });
        console.log(
          `[ImageGeneration] Image ${marker.position} reused from library (similarity=${match.similarity.toFixed(4)})`
        );
        continue;
      }

      // No match — generate fresh via Replicate
      const delay = replicateDelays[Math.min(replicateCallCount, replicateDelays.length - 1)];
      if (delay > 0) {
        console.log(`[ImageGeneration] Waiting ${delay}ms before image ${i + 1} to respect rate limits`);
        await this.sleep(delay);
      }
      replicateCallCount++;

      try {
        const result = await this.generateSingleImage(marker, prompt, presetKey);
        results.push({ ...result, promptEmbedding: embedding, wasReused: false, reusedFromImageId: null });
      } catch (error) {
        // If generation fails, still add to results with failed status
        results.push({
          position: marker.position,
          imageUrl: null,
          prompt,
          model: preset.replicateModel,
          presetKey,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          promptEmbedding: embedding,
          wasReused: false,
          reusedFromImageId: null,
        });
      }
    }

    return results;
  }

  /**
   * Generate contextual image prompts for all markers.
   * Uses a single LLM call to generate all prompts at once.
   *
   * @param markers - Array of image markers
   * @param keyword - Article keyword
   * @param presetDescription - Style description for the preset
   * @returns Array of image prompt strings
   */
  private async generateImagePrompts(
    markers: IImageMarker[],
    keyword: string,
    presetDescription: string
  ): Promise<string[]> {
    if (markers.length === 0) {
      return [];
    }

    const systemPrompt = getImagePromptsGenerationPrompt(
      markers,
      keyword,
      presetDescription
    );

    try {
      const result = await this.openRouter.chatCompletionWithRetry({
        model: serverEnv.OPENROUTER_TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the image prompts now.' },
        ],
        responseFormat: { type: 'json_object' },
        temperature: 0.7,
        maxTokens: 1000,
      });

      // Parse response - may be a plain array or an object wrapping one
      // (json_object mode forces models to return objects, not bare arrays)
      const parsed = JSON.parse(result.content);
      const prompts: string[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(Object.values(parsed)[0])
          ? (Object.values(parsed)[0] as string[])
          : (() => { throw new Error(`Unexpected response shape: ${Object.keys(parsed).join(', ')}`); })();

      // Validate we got the right number of prompts
      if (prompts.length !== markers.length) {
        throw new Error(`Expected ${markers.length} prompts, got ${prompts.length}`);
      }

      console.log(`[ImageGeneration] Generated ${prompts.length} image prompts via LLM`);

      return prompts;
    } catch (error) {
      console.warn('[ImageGeneration] Failed to generate prompts via LLM, using fallbacks:', error);
      // Return fallback prompts for each marker
      return markers.map(marker =>
        getFallbackImagePrompt(keyword, marker.sectionContext)
      );
    }
  }

  /**
   * Generate a single image via Replicate.
   *
   * @param marker - Image marker with position and context
   * @param prompt - Image generation prompt
   * @param preset - Image preset configuration
   * @returns Image generation result
   */
  private async generateSingleImage(
    marker: IImageMarker,
    prompt: string,
    preset: ImagePresetKey
  ): Promise<IImageResult> {
    const startTime = Date.now();

    try {
      // Use Replicate service with retry logic
      const imageUrl = await this.replicate.withRetry(() =>
        this.replicate.generateImage(
          getImagePreset(preset).replicateModel,
          prompt,
          getImagePreset(preset).defaultParams
        )
      );

      const generationTimeMs = Date.now() - startTime;

      console.log(
        `[ImageGeneration] Image ${marker.position} generated in ${generationTimeMs}ms`
      );

      return {
        position: marker.position,
        imageUrl,
        prompt,
        model: getImagePreset(preset).replicateModel,
        presetKey: preset,
        status: 'completed',
        generationTimeMs,
        promptEmbedding: null,
        wasReused: false,
        reusedFromImageId: null,
      };
    } catch (error) {
      const generationTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error(`[ImageGeneration] Image ${marker.position} failed:`, errorMessage);

      return {
        position: marker.position,
        imageUrl: null,
        prompt,
        model: getImagePreset(preset).replicateModel,
        presetKey: preset,
        status: 'failed',
        error: errorMessage,
        generationTimeMs,
        promptEmbedding: null,
        wasReused: false,
        reusedFromImageId: null,
      };
    }
  }
}

/**
 * Singleton instance
 */
export const imageGenerationService = new ImageGenerationService();
