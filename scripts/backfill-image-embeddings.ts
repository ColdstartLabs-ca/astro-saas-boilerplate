/**
 * Backfill prompt embeddings for existing article_images records.
 *
 * Run once with: npx tsx scripts/backfill-image-embeddings.ts
 * Re-runnable: skips records that already have prompt_embedding set.
 */
import { supabaseAdmin } from '../server/supabase/supabaseAdmin';
import { embeddingService } from '../server/services/embedding.service';

const BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES_MS = 500;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfill() {
  console.log('[Backfill] Starting image embedding backfill...');

  let processed = 0;
  let page = 0;

  while (true) {
    // Fetch batch of images without embeddings
    const { data: rows, error } = await supabaseAdmin
      .from('article_images')
      .select('id, prompt')
      .eq('status', 'completed')
      .is('prompt_embedding', null)
      .not('image_url', 'is', null)
      .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Backfill] Fetch error:', error.message);
      break;
    }

    if (!rows || rows.length === 0) {
      console.log('[Backfill] No more rows to process.');
      break;
    }

    // Embed all prompts in this batch
    const prompts = rows.map(r => r.prompt);
    const embeddings = await embeddingService.embedBatch(prompts);

    // Update each record
    for (let i = 0; i < rows.length; i++) {
      const embedding = embeddings[i];
      if (!embedding) {
        console.warn(`[Backfill] Failed to embed row ${rows[i].id}, skipping`);
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from('article_images')
        .update({ prompt_embedding: embedding })
        .eq('id', rows[i].id);

      if (updateError) {
        console.warn(`[Backfill] Update failed for ${rows[i].id}: ${updateError.message}`);
      }
    }

    processed += rows.length;
    console.log(`[Backfill] Processed ${processed} rows (batch ${page + 1})`);

    if (rows.length < BATCH_SIZE) break;  // Last page

    page++;
    await sleep(DELAY_BETWEEN_BATCHES_MS);  // Respect OpenAI rate limits
  }

  console.log(`[Backfill] Complete. Total processed: ${processed}`);
}

backfill().catch(err => {
  console.error('[Backfill] Fatal error:', err);
  process.exit(1);
});
