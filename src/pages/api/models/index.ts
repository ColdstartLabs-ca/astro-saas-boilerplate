import type { APIRoute } from 'astro';
import {
  getAvailableWriterPresets,
  getAvailableWriterModels,
} from '@shared/config/ai-models.config';
import { getAvailableImagePresets } from '@shared/config/image-models.config';
import { serverEnv } from '@shared/config/env';
import type { IAvailableModelsResponse } from '@shared/types/models.types';

/**
 * GET /api/models — returns available writer presets and image presets
 *
 * Public endpoint that returns the currently available AI writer presets
 * and image generation presets based on server environment configuration.
 *
 * The response is filtered based on:
 * - AVAILABLE_WRITER_PRESETS env var (key(model) format, empty = all)
 * - AVAILABLE_IMAGE_PRESETS env var (key(model) format, empty = all)
 */
export const GET: APIRoute = async () => {
  const writerPresets = getAvailableWriterPresets(serverEnv.AVAILABLE_WRITER_PRESETS);
  const imagePresets = getAvailableImagePresets(serverEnv.AVAILABLE_IMAGE_PRESETS);

  // Deprecated: writerModels for backward compatibility
  const writerModels = getAvailableWriterModels(serverEnv.AVAILABLE_WRITER_PRESETS);

  const response: IAvailableModelsResponse = {
    writerPresets,
    imagePresets,
    writerModels,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
    },
  });
};
