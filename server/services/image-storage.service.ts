/**
 * Image Storage Service
 *
 * Persists generated images to Supabase Storage.
 * Replicate delivery URLs are temporary (~1h), so we fetch the image
 * and upload it to the `autopilotrank-images` bucket for permanent storage.
 *
 * Naming convention: articles/{articleId}/{position}-{slug}.webp
 * Example: articles/abc123/1-best-seo-tools-for-startups.webp
 */

import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { clientEnv } from '@shared/config/env';

const BUCKET = 'autopilotrank-images';

/**
 * Slugify a string for use in filenames.
 * Keeps only alphanumeric and hyphens, max 60 chars.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

/**
 * Detect content type from response headers or default to webp.
 */
function getContentType(response: Response): string {
  const ct = response.headers.get('content-type');
  if (ct && ct.startsWith('image/')) return ct;
  return 'image/webp';
}

/**
 * Get file extension from content type.
 */
function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/webp': 'webp',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
  };
  return map[contentType] || 'webp';
}

/**
 * Build the public URL for a stored image.
 */
function getPublicUrl(path: string): string {
  return `${clientEnv.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

export interface IUploadResult {
  permanentUrl: string;
  storagePath: string;
}

/**
 * Fetch an image from a temporary URL and upload it to Supabase Storage.
 *
 * @param temporaryUrl - The Replicate delivery URL (expires)
 * @param articleId - Article UUID for folder structure
 * @param position - Image position in the article (1-based)
 * @param keyword - Article keyword for meaningful filename
 * @returns Permanent public URL, or null if upload fails
 */
export async function persistImage(
  temporaryUrl: string,
  articleId: string,
  position: number,
  keyword: string
): Promise<IUploadResult | null> {
  try {
    // Fetch image bytes from temporary URL
    const response = await fetch(temporaryUrl);
    if (!response.ok) {
      console.error(`[ImageStorage] Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = getContentType(response);
    const ext = getExtension(contentType);
    const slug = slugify(keyword);
    const storagePath = `articles/${articleId}/${position}-${slug}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[ImageStorage] Upload failed:', error.message);
      return null;
    }

    const permanentUrl = getPublicUrl(storagePath);
    console.log(`[ImageStorage] Persisted image: ${storagePath}`);

    return { permanentUrl, storagePath };
  } catch (error) {
    console.error('[ImageStorage] Error persisting image:', error);
    return null;
  }
}

/**
 * Persist multiple image results, replacing temporary URLs with permanent ones.
 * Mutates the imageUrl field in each result that succeeds.
 *
 * @param results - Array of image generation results
 * @param articleId - Article UUID
 * @param keyword - Article keyword for meaningful filenames
 * @returns Count of successfully persisted images
 */
export async function persistArticleImages(
  results: Array<{ position: number; imageUrl: string | null; status: string }>,
  articleId: string,
  keyword: string
): Promise<number> {
  let persisted = 0;

  // Upload sequentially to avoid overwhelming the storage API
  for (const result of results) {
    if (result.status !== 'completed' || !result.imageUrl) continue;

    const uploaded = await persistImage(result.imageUrl, articleId, result.position, keyword);
    if (uploaded) {
      result.imageUrl = uploaded.permanentUrl;
      persisted++;
    }
    // If upload fails, keep the temporary URL as fallback
  }

  console.log(`[ImageStorage] Persisted ${persisted}/${results.length} images for article ${articleId}`);
  return persisted;
}
