'use client';

import { adminFetch } from '@client/utils/admin-api-client';
import type { IDbBlogPost, IBlogCategory, IBlogMedia } from '@shared/types/blog.types';
import { generateSlug } from '@shared/utils/string';
import { Image as ImageIcon, X, Loader2, Upload } from 'lucide-react';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MDEditor from '@uiw/react-md-editor';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug too long'),
  description: z.string().max(500, 'Description too long').optional(),
  content: z.string().optional(),
  author: z.string().max(100).optional(),
  category_id: z.string().optional().nullable(),
  cover_image_id: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']),
  meta_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
});

type PostFormData = z.infer<typeof postSchema>;

interface IBlogPostFormProps {
  post?: IDbBlogPost;
  onSuccess?: (postId: string) => void;
}

export function BlogPostForm({ post, onSuccess }: IBlogPostFormProps): JSX.Element {
  // Use dashboard navigation instead of Next.js router
  const isEditing = !!post;

  const [categories, setCategories] = useState<IBlogCategory[]>([]);
  const [media, setMedia] = useState<IBlogMedia[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      description: post?.description || '',
      content: post?.content || '',
      author: post?.author || '',
      category_id: post?.category_id || '',
      cover_image_id: post?.cover_image_id || '',
      status: post?.status || 'draft',
      meta_title: post?.meta_title || '',
      meta_description: post?.meta_description || '',
      tags: post?.tags || [],
    },
  });

  const title = watch('title');
  const coverImageId = watch('cover_image_id');
  const tags = watch('tags');

  // Fetch categories and media on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData] = await Promise.all([
          adminFetch<{ categories: IBlogCategory[] }>('/api/admin/blog/categories'),
        ]);
        setCategories(categoriesData.categories || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchData();
  }, []);

  // Fetch media when picker is opened
  const fetchMedia = useCallback(async () => {
    try {
      const data = await adminFetch<{ media: IBlogMedia[]; total: number }>(
        '/api/admin/blog/media?limit=50'
      );
      setMedia(data.media || []);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    }
  }, []);

  useEffect(() => {
    if (showMediaPicker) {
      fetchMedia();
    }
  }, [showMediaPicker, fetchMedia]);

  // Auto-generate slug from title (only for new posts)
  useEffect(() => {
    if (!isEditing && title && !watch('slug')) {
      setValue('slug', generateSlug(title));
    }
  }, [title, isEditing, setValue, watch]);

  const handleUploadMedia = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', file.name);

      // Use direct fetch for FormData upload (adminFetch doesn't support multipart)
      const supabase = (await import('@shared/utils/supabase/client')).createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch('/api/admin/blog/media', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadedMedia = (await response.json()) as IBlogMedia;
      setValue('cover_image_id', uploadedMedia.id);
      setShowMediaPicker(false);
    } catch (err) {
      console.error('Failed to upload media:', err);
      alert('Failed to upload image');
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags?.includes(trimmedTag)) {
      setValue('tags', [...(tags || []), trimmedTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      'tags',
      (tags || []).filter(t => t !== tagToRemove)
    );
  };

  const onSubmit = async (data: PostFormData) => {
    setSaving(true);
    setError(null);

    try {
      if (isEditing && post) {
        await adminFetch(`/api/admin/blog/posts/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (onSuccess) {
          onSuccess(post.id);
        }
      } else {
        const newPost = await adminFetch<{ id: string }>('/api/admin/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (onSuccess) {
          onSuccess(newPost.id);
        } else {
          dashboardNavigate(`/dashboard/admin/blog/${newPost.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to save post:', err);
      setError(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const selectedCoverImage = media.find(m => m.id === coverImageId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Title <span className="text-error">*</span>
            </label>
            <input
              {...register('title')}
              className="w-full px-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Enter post title"
            />
            {errors.title && <p className="text-error text-sm mt-1">{errors.title.message}</p>}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Slug <span className="text-error">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/blog/</span>
              <input
                {...register('slug')}
                className="flex-1 px-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent font-mono text-sm"
                placeholder="post-slug"
              />
            </div>
            {errors.slug && <p className="text-error text-sm mt-1">{errors.slug.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="Brief description for SEO and previews"
            />
            {errors.description && (
              <p className="text-error text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Content */}
          <div data-color-mode="dark">
            <label className="block text-sm font-medium text-primary mb-1">Content</label>
            <MDEditor
              value={watch('content') || ''}
              onChange={val => setValue('content', val || '')}
              height={400}
              preview="live"
            />
            <p className="text-xs text-muted-foreground mt-1">Supports Markdown formatting</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <label className="block text-sm font-medium text-primary mb-2">Status</label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Category */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <label className="block text-sm font-medium text-primary mb-2">Category</label>
            {loadingCategories ? (
              <div className="text-muted-foreground text-sm">Loading...</div>
            ) : (
              <select
                {...register('category_id')}
                className="w-full px-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">No category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cover Image */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <label className="block text-sm font-medium text-primary mb-2">Cover Image</label>
            {selectedCoverImage ? (
              <div className="relative">
                <img
                  src={selectedCoverImage.public_url}
                  alt={selectedCoverImage.alt_text || ''}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setValue('cover_image_id', null)}
                  className="absolute top-2 right-2 p-1 bg-surface/80 rounded hover:bg-surface"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg hover:border-accent/50 hover:bg-accent/5 transition-colors"
                >
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Choose from library</span>
                </button>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg hover:border-accent/50 hover:bg-accent/5 transition-colors cursor-pointer">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload new</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadMedia}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <label className="block text-sm font-medium text-primary mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(tags || []).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-xs rounded-full"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-error"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag"
                className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-surface-light border border-border rounded-lg text-sm hover:bg-surface transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Author */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <label className="block text-sm font-medium text-primary mb-2">Author</label>
            <input
              {...register('author')}
              className="w-full px-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Author name"
            />
          </div>

          {/* SEO Settings */}
          <div className="bg-surface rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-primary mb-3">SEO Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Meta Title</label>
                <input
                  {...register('meta_title')}
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Override title for SEO"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Meta Description</label>
                <textarea
                  {...register('meta_description')}
                  rows={2}
                  className="w-full px-3 py-1.5 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Override description for SEO"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-4 pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => dashboardNavigate('/dashboard/admin/blog')}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Post' : 'Create Post'}
        </button>
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-primary">Select Cover Image</h3>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="p-1 hover:bg-surface-light rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {media.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No images in the library</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {media.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setValue('cover_image_id', item.id);
                        setShowMediaPicker(false);
                      }}
                      className={`aspect-video rounded-lg overflow-hidden border-2 transition-colors ${
                        coverImageId === item.id
                          ? 'border-accent'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <img
                        src={item.public_url}
                        alt={item.alt_text || ''}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
