/**
 * Admin Blog Hooks - Barrel Export
 *
 * This file re-exports all blog hooks from domain-specific files for backward compatibility.
 * Import from './blog/useBlogPosts', './blog/useBlogCategories', or './blog/useBlogMedia' directly
 * for more targeted imports.
 *
 * @deprecated Import directly from './blog/useBlogPosts', './blog/useBlogCategories', or './blog/useBlogMedia'
 */

// Posts hooks
export {
  usePosts,
  usePost,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  type IUsePostsOptions,
  type IUsePostsReturn,
  type IUsePostReturn,
  type IUseCreatePostReturn,
  type IUseUpdatePostReturn,
  type IUseDeletePostReturn,
} from './blog/useBlogPosts';

// Categories hook
export { useCategories, type IUseCategoriesReturn } from './blog/useBlogCategories';

// Media hooks
export {
  useMedia,
  useUploadMedia,
  useUpdateMedia,
  useDeleteMedia,
  type IUseMediaOptions,
  type IUseMediaReturn,
  type IUploadMediaResult,
  type IUseUploadMediaReturn,
  type IUseUpdateMediaReturn,
  type IUseDeleteMediaReturn,
} from './blog/useBlogMedia';
