# Internal Blog CMS - Implementation Gaps Report

**PRD:** `docs/PRDs/night-watch/internal-blog-cms.md`
**Date:** 2026-02-14
**Branch:** `night-watch/internal-blog-cms`

---

## Phase Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Database Schema & Blog Service | DONE | ~95% |
| Phase 2: Admin Blog API | DONE (bugs) | ~85% |
| Phase 3: Admin Blog UI | PARTIAL | ~35% |
| Phase 4: Public Blog Pages (SSR) | PARTIAL | ~70% |
| Phase 5: Integration Testing & Polish | PARTIAL | ~50% |

---

## CRITICAL Gaps (must fix)

### 1. No rich markdown editor (Phase 3)
- **PRD:** Use `@uiw/react-md-editor` (already installed)
- **Actual:** `BlogPostForm.tsx` uses a plain `<textarea>` for markdown content
- **Impact:** Poor authoring experience, no preview, no toolbar
- **Note:** PRD states `@uiw/react-md-editor` is already a dependency - verify `package.json`

### 2. Slug uniqueness does NOT check MDX sources (Phase 2)
- **PRD:** "Validate slug uniqueness across both MDX and DB sources"
- **Actual:** `BlogController.ts` and `blog.service.ts` `slugExists()` only queries the `blog_posts` DB table
- **Impact:** DB posts can be created with slugs that collide with MDX posts, causing unpredictable behavior in the merge logic

### 3. `deleteMedia` controller bug (Phase 2)
- **PRD:** `DELETE /api/admin/blog/media/:id` should delete media record + file from Storage
- **Actual:** `BlogController.ts` `deleteMedia` method incorrectly calls `deletePost(postId)` instead of `blogService.deleteMedia()`
- **Impact:** DELETE media endpoint is broken - deletes a blog post instead of a media record

### 4. Media Library UI missing (Phase 3)
- **PRD:** Dedicated `MediaLibrary.tsx` component with: grid view, search bar, tag filter chips, drag-and-drop upload zone, edit modal (alt text, tags), delete with confirmation, usage info (file size, dimensions, date)
- **Actual:** Only a minimal media picker modal inside `BlogPostForm.tsx` for cover image selection. No standalone management UI.
- **Impact:** Admins cannot browse, search, edit metadata, or manage uploaded images

### 5. Category listing page missing (Phase 4)
- **PRD:** `blog/category/[category]` page listing posts by category slug from merged feed
- **Actual:** Not implemented
- **Impact:** No category-based browsing for public visitors, missed SEO opportunity

### 6. Tag listing page missing (Phase 4)
- **PRD:** `blog/tag/[tag]` page listing posts by tag from merged feed
- **Actual:** Not implemented
- **Impact:** No tag-based browsing for public visitors, missed SEO opportunity

### 7. Integration tests missing (Phase 5)
- **PRD:** `tests/integration/blog-hybrid.int.spec.ts` with 3 tests: merge MDX+DB in public feed, graceful degradation to MDX-only on DB failure, draft posts not exposed publicly
- **Actual:** File does not exist
- **Impact:** Core hybrid merge behavior is untested

---

## MODERATE Gaps

### 8. No tabs structure in admin page (Phase 3)
- **PRD:** `AdminBlogPageClient.tsx` with "Posts" tab and "Media" tab
- **Actual:** Page at `app/[locale]/dashboard/admin/blog/page.tsx` shows only post list, no tabs

### 9. No `useAdminBlog` hooks (Phase 3)
- **PRD:** `client/hooks/useAdminBlog.ts` with reusable hooks: `usePosts()`, `usePost(id)`, `useCreatePost()`, `useUpdatePost()`, `useDeletePost()`, `useCategories()`, `useMedia()`, `useUploadMedia()`, `useUpdateMedia()`, `useDeleteMedia()`
- **Actual:** Direct `adminFetch` calls inline in components. No reusable hook layer.
- **Impact:** Code duplication, harder to test, no loading/error state management

### 10. No source badge (MDX/DB) in post list (Phase 3)
- **PRD:** Post list shows source badge indicating whether post is from MDX or DB
- **Actual:** No visual indicator of post source
- **Impact:** Admin cannot distinguish between content sources

### 11. "Insert from Library" toolbar button missing (Phase 3)
- **PRD:** Markdown editor toolbar button that opens media picker and inserts `![alt](url)` at cursor
- **Actual:** Not implemented (blocked by missing markdown editor)

### 12. Admin blog UI uses hardcoded English strings (Phase 5)
- **PRD:** Translation keys in `locales/en/blog.json` for admin UI (post list headers, editor labels, status badges)
- **Actual:** `BlogPostForm.tsx` and admin page use hardcoded strings like "Title", "Slug", "Draft", "Published"

### 13. Missing canonical URL on blog post page (Phase 4)
- **PRD:** Canonical URL on `[slug]` page
- **Actual:** `generateMetadata()` in `app/[locale]/blog/[slug]/page.tsx` does not set `alternates.canonical`

### 14. Client-side unit tests missing (Phase 3)
- **PRD:** `tests/unit/client/hooks/useAdminBlog.unit.spec.ts` testing hook fetch/mutation behavior
- **Actual:** No client-side tests for admin blog UI

---

## MINOR Gaps / Deviations

### 15. Markdown rendering uses regex instead of markdown-it (Phase 1)
- **PRD:** Use `markdown-it` for server-side markdown rendering
- **Actual:** `blog.service.ts` uses regex-based renderer with comment noting markdown-it can be added later
- **Impact:** Low - works for basic markdown, may miss edge cases

### 16. Controller-level auth tests missing (Phase 2)
- **PRD:** Tests for 401 (unauthenticated) and 403 (non-admin) responses, and 409 (slug collision with MDX)
- **Actual:** Test file exists but only tests utility functions, not HTTP-level auth/validation

### 17. MDX posts not shown as read-only in list (Phase 3)
- **PRD:** MDX posts shown in list with source badge, no edit/delete actions (read-only)
- **Actual:** Cannot verify since list doesn't distinguish sources. Edit/delete may incorrectly show for MDX posts.

---

## What's Working Well

- Migration file is complete with all 4 tables, indexes, RLS policies, and triggers
- `shared/types/blog.types.ts` is thorough with good type coverage
- `blog.service.ts` has full CRUD + media operations
- `server/blog.ts` merge logic is solid with DB-wins-on-collision and date sorting
- Graceful fallback to MDX-only on DB failure is properly implemented
- Public blog listing uses `getAllPostsAsync()` (merged feed)
- Public blog post page uses `getPostBySlugAsync()` with JSON-LD Article schema
- Blog sitemap uses `getAllPostsAsync()` (merged feed)
- Admin blog API routes are properly secured (not in `PUBLIC_API_ROUTES`)
- Existing MDX pipeline is preserved (non-destructive)

---

## Recommended Fix Priority

1. Fix `deleteMedia` controller bug (5 min)
2. Add MDX slug checking to `slugExists()` (15 min)
3. Replace textarea with `@uiw/react-md-editor` (30 min)
4. Build MediaLibrary component + tabs (2-3 hrs)
5. Create category and tag listing pages (1-2 hrs)
6. Add integration tests (1-2 hrs)
7. Extract `useAdminBlog` hooks (1 hr)
8. Add i18n keys for admin UI (30 min)
9. Add canonical URL to blog post metadata (5 min)
10. Add source badges to post list (15 min)
