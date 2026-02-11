import type { APIRoute } from 'astro';
import { getAvailableWriterModels } from '@shared/config/ai-models.config';
import { getAvailableImagePresets } from '@shared/config/image-models.config';
import { serverEnv } from '@shared/config/env';
import type { IAvailableModelsResponse } from '@shared/types/models.types';

/**
 * GET /api/models — returns available writer models and image presets
 *
 * Public endpoint that returns the currently available AI writer models
 * and image generation presets based on server environment configuration.
 *
 * The response is filtered based on:
 * - AVAILABLE_WRITER_MODELS env var (comma-separated model IDs, empty = all)
 * - AVAILABLE_IMAGE_PRESETS env var (comma-separated preset keys, empty = all)
 */
export const GET: APIRoute = async () => {
  const writerModels = getAvailableWriterModels(serverEnv.AVAILABLE_WRITER_MODELS);
  const imagePresets = getAvailableImagePresets(serverEnv.AVAILABLE_IMAGE_PRESETS);

  const response: IAvailableModelsResponse = {
    writerModels,
    imagePresets,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Cache for 5 minutes since models rarely change
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
    },
  });
};
