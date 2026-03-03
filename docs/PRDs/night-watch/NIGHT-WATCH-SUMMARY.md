# Night Watch Summary

## E2E Articles Skip-On-Onboarding Pattern

- **PRD**: e2e-articles-skip-onboarding.md
- **Branch**: night-watch/e2e-articles-skip-onboarding
- **PR**: https://github.com/ColdstartLabs-ca/autopilotrank.com/pull/17
- **Date**: 2026-02-19
- **Status**: PR Opened

### What was done

- Added `waitForPageReady()` helper function to detect onboarding redirect
- Applied skip-on-onboarding pattern to all 35 tests in `articles.e2e.spec.ts`
- Tests now gracefully skip when auth mock doesn't work with `@supabase/ssr` 0.7.0
- Pattern matches reference implementation in `campaigns.e2e.spec.ts`

### Files changed

- `tests/e2e/articles.e2e.spec.ts`

---

## Image Semantic Reuse via Prompt Embeddings
- **PRD**: image-semantic-reuse.md
- **Branch**: night-watch/image-semantic-reuse
- **PR**: https://github.com/ColdstartLabs-ca/autopilotrank.com/pull/45
- **Date**: 2026-03-02
- **Status**: PR Opened
### What was done
- Added pgvector extension + `prompt_embedding vector(1536)` + `reused_from_image_id` to `article_images`
- Created HNSW index for approximate nearest-neighbor cosine search
- Created `find_similar_image` SQL RPC (cosine similarity >= 0.90, preset-scoped)
- New `EmbeddingService` using OpenAI `text-embedding-3-small`
- New `ImageSimilarityService` wrapping pgvector search
- Wired reuse check into `generateImagesForArticle()` pipeline
- Updated `saveArticleImages()` to persist embeddings and reuse metadata
- Created `scripts/backfill-image-embeddings.ts` for existing records
### Files changed
- supabase/migrations/20260225000000_enable_pgvector.sql
- supabase/migrations/20260225000100_add_image_similarity_function.sql
- server/services/embedding.service.ts (new)
- server/services/image-similarity.service.ts (new)
- server/services/image-generation.service.ts (modified)
- server/services/article-generation.service.ts (modified)
- scripts/backfill-image-embeddings.ts (new)
- tests/unit/embedding.service.unit.spec.ts (new)
- tests/unit/image-similarity.service.unit.spec.ts (new)
- tests/unit/server/services/image-generation.service.unit.spec.ts (modified)
---
