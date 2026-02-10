/**
 * Image Generation Service
 *
 * Orchestrates parallel image generation via Replicate API:
 * 1. Parse image markers from article markdown
 * 2. Generate contextual image prompts via LLM
 * 3. Call Replicate API with rate limit awareness
 * 4. Return results with URLs and metadata
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
}

/**
 * Image generation service
 */
export class ImageGenerationService {
  private openRouter = new OpenRouterService();
  private replicate = getReplicateService();

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate images for an article based on image markers.
   * Uses sequential generation with exponential backoff for rate limits.
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

    // Step 2: Generate images sequentially with exponential backoff
    // Free tier Replicate: 1 request burst, 6 requests/minute
    // We use exponential backoff: 3s, 5s, 10s between requests
    const results: IImageResult[] = [];

    // Delays in milliseconds: first request no delay, then exponential backoff
    const delays = [0, 3000, 5000, 10000]; // For up to 4 images

    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const prompt = prompts[i] || getFallbackImagePrompt(keyword, marker.sectionContext);

      // Add delay between requests to respect rate limits (except for first request)
      const delay = delays[Math.min(i, delays.length - 1)];
      if (delay > 0) {
        console.log(`[ImageGeneration] Waiting ${delay}ms before image ${i + 1} to respect rate limits`);
        await this.sleep(delay);
      }

      try {
        const result = await this.generateSingleImage(marker, prompt, presetKey);
        results.push(result);
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
      };
    }
  }
}

/**
 * Singleton instance
 */
export const imageGenerationService = new ImageGenerationService();
