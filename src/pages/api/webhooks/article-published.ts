/**
 * Inbound Webhook: Article Published
 *
 * Receives published article payloads from AutopilotRank webhook integrations.
 * Verifies HMAC-SHA256 signature, validates the payload, then marks the article
 * as published in the database — mirroring the final step of delivery.service.ts.
 *
 * POST /api/webhooks/article-published
 *
 * This route is public (covered by PUBLIC_API_ROUTES /api/webhooks/* wildcard)
 * and uses its own signature-based authentication.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serverEnv } from '@shared/config/env';
import { supabaseAdmin } from '@server/supabase/supabaseAdmin';
import { calculateReadingTime, generateSlug } from '@shared/utils/string';
import { renderMarkdownToHtml } from '@server/services/blog.service';

// =============================================================================
// Payload Validation Schema
// =============================================================================

const articleImageSchema = z.object({
  position: z.number(),
  url: z.string().url(),
});

const articleSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  content_html: z.string(),
  slug: z.string().nullable(),
  meta_description: z.string().nullable(),
  primary_keyword: z.string(),
  word_count: z.number().nullable(),
  seo_score: z.number().nullable(),
  images: z.array(articleImageSchema).default([]),
});

const campaignSchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .nullable();

const projectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    domain: z.string().nullable(),
  })
  .nullable();

export const webhookPayloadSchema = z.object({
  event: z.literal('article.published'),
  test: z.boolean(),
  timestamp: z.string(),
  article: articleSchema,
  campaign: campaignSchema,
  project: projectSchema,
});

export type IInboundArticlePayload = z.infer<typeof webhookPayloadSchema>;

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify the HMAC-SHA256 signature from X-Signature-256 header.
 * Uses Web Crypto API (compatible with Cloudflare Workers and Node.js).
 *
 * @returns true if signature is valid or no secret is configured
 */
async function verifySignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  const secret = serverEnv.INBOUND_WEBHOOK_SECRET;

  // No secret configured — skip verification
  if (!secret) return true;

  // Secret is configured but no signature was sent — reject
  if (!signatureHeader) return false;

  // Extract hex digest after "sha256=" prefix
  const expectedHex = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const bodyData = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, bodyData);
  const actualHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (expectedHex.length !== actualHex.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    mismatch |= expectedHex.charCodeAt(i) ^ actualHex.charCodeAt(i);
  }
  return mismatch === 0;
}

// =============================================================================
// Article Processing
// =============================================================================

/**
 * Mark the article as published in the database.
 *
 * Mirrors the final step of delivery.service.ts: updates status → published,
 * sets published_at, and backfills slug/meta_description if they were missing.
 * Silently skips if the article doesn't exist (idempotent).
 */
async function processArticle(payload: IInboundArticlePayload): Promise<void> {
  const { article, campaign } = payload;
  const publishedAt = payload.timestamp;

  // Fetch the article to check current state
  const { data: existing } = await supabaseAdmin
    .from('articles')
    .select('id, status, slug, meta_description')
    .eq('id', article.id)
    .maybeSingle();

  if (!existing) {
    // Article not in this system — nothing to update (may be a cross-system delivery)
    console.log('[WebhookReceiver] Article not found locally, skipping DB update', {
      articleId: article.id,
    });
    return;
  }

  // Build update — only set fields that would add value
  const update: Record<string, unknown> = {
    status: 'published',
    published_at: publishedAt,
  };

  // Backfill slug if it was null and we now have one
  if (!existing.slug && article.slug) {
    update.slug = article.slug;
  }

  // Backfill meta_description if it was null and we now have one
  if (!existing.meta_description && article.meta_description) {
    update.meta_description = article.meta_description;
  }

  const { error: updateError } = await supabaseAdmin
    .from('articles')
    .update(update)
    .eq('id', article.id);

  if (updateError) {
    throw new Error(`Failed to update article: ${updateError.message}`);
  }

  // Mark any pending integration_deliveries for this article's campaign as delivered
  if (campaign?.id) {
    await supabaseAdmin
      .from('integration_deliveries')
      .update({
        status: 'delivered',
        delivered_at: publishedAt,
        error: null,
      })
      .eq('article_id', article.id)
      .eq('campaign_id', campaign.id)
      .eq('status', 'delivering');
  }

  // Create/update a blog_posts entry so the article appears on /blog
  await upsertBlogPost(payload);

  console.log('[WebhookReceiver] Article marked as published', {
    articleId: article.id,
    previousStatus: existing.status,
    publishedAt,
    campaignId: campaign?.id ?? null,
  });
}

/**
 * Create or update a blog_posts row so the article is visible on /blog.
 * Uses the article slug for deduplication (unique constraint on blog_posts.slug).
 * Idempotent: repeated calls with the same slug update the existing row.
 */
async function upsertBlogPost(payload: IInboundArticlePayload): Promise<void> {
  const { article, project } = payload;
  const publishedAt = payload.timestamp;

  const slug = article.slug || generateSlug(article.title || article.primary_keyword);
  const title = article.title || article.primary_keyword;
  const content = article.content;
  const contentHtml = article.content_html || renderMarkdownToHtml(content);
  const readingTime = calculateReadingTime(content);
  const description = article.meta_description || '';
  const author = project?.name || 'AutopilotRank';

  // Find cover image URL from article images (first one, if any)
  const coverImageUrl = article.images.length > 0
    ? article.images.sort((a, b) => a.position - b.position)[0].url
    : null;

  const { error } = await supabaseAdmin
    .from('blog_posts')
    .upsert(
      {
        title,
        slug,
        description,
        content,
        content_html: contentHtml,
        author,
        status: 'published' as const,
        reading_time: readingTime,
        meta_description: description,
        published_at: publishedAt,
      },
      { onConflict: 'slug' }
    );

  if (error) {
    // Log but don't throw — the article was already marked published successfully.
    // A blog_posts failure shouldn't roll back the article status update.
    console.error('[WebhookReceiver] Failed to upsert blog_posts entry:', error.message, { slug });
    return;
  }

  // Insert tags (keyword as tag)
  const { data: blogPost } = await supabaseAdmin
    .from('blog_posts')
    .select('id')
    .eq('slug', slug)
    .single();

  if (blogPost) {
    const tags = [article.primary_keyword];

    // Delete existing tags first (idempotent)
    await supabaseAdmin
      .from('blog_post_tags')
      .delete()
      .eq('post_id', blogPost.id);

    await supabaseAdmin
      .from('blog_post_tags')
      .insert(tags.map(tag => ({ post_id: blogPost.id, tag })));
  }

  console.log('[WebhookReceiver] Blog post upserted', {
    slug,
    title,
    coverImageUrl,
  });
}

// =============================================================================
// Route Handler
// =============================================================================

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();

  // 1. Verify signature
  const signatureHeader = request.headers.get('X-Signature-256');
  const isValid = await verifySignature(rawBody, signatureHeader);

  if (!isValid) {
    console.warn('[WebhookReceiver] Invalid signature');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Parse and validate payload
  let payload: IInboundArticlePayload;
  try {
    const json = rawBody ? JSON.parse(rawBody) : {};
    payload = webhookPayloadSchema.parse(json);
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors[0]?.message ?? 'Validation failed'
        : 'Invalid JSON';
    console.warn('[WebhookReceiver] Bad payload:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Handle test payloads — acknowledge without processing
  if (payload.test) {
    console.log('[WebhookReceiver] Test payload received');
    return new Response(JSON.stringify({ received: true, test: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Process the article
  try {
    await processArticle(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Processing failed';
    console.error('[WebhookReceiver] Processing error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
