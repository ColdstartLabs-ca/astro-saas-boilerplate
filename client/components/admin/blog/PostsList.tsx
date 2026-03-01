'use client';

import { adminFetch } from '@client/utils/admin-api-client';
import type { IDbBlogPost, IBlogCategory, BlogPostSource } from '@shared/types/blog.types';
import { ConfirmDialog } from '@client/components/ui/ConfirmDialog';
import { useToastStore } from '@client/store/toastStore';
import dayjs from 'dayjs';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  FileText,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Database,
  FileCode,
} from 'lucide-react';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Source badge component - shows where the post comes from (MDX or DB)
 */
function SourceBadge({ source }: { source: BlogPostSource }): JSX.Element {
  const isMdx = source === 'mdx';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
        isMdx
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
      }`}
    >
      {isMdx ? (
        <>
          <FileCode className="h-3 w-3" />
          MDX
        </>
      ) : (
        <>
          <Database className="h-3 w-3" />
          DB
        </>
      )}
    </span>
  );
}

export function PostsList(): JSX.Element {
  const { showToast } = useToastStore();
  const [posts, setPosts] = useState<IDbBlogPost[]>([]);
  const [categories, setCategories] = useState<IBlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<IDbBlogPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch posts
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category_id: categoryFilter }),
      });
      const postsData = await adminFetch<{
        posts: IDbBlogPost[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/admin/blog/posts?${params}`);
      setPosts(postsData.posts);
      setTotal(postsData.total);

      // Fetch categories
      const categoriesData = await adminFetch<{ categories: IBlogCategory[] }>(
        '/api/admin/blog/categories'
      );
      setCategories(categoriesData.categories || []);
    } catch (err) {
      console.error('Failed to fetch blog data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleDeletePost = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/blog/posts/${deleteConfirm.id}`, { method: 'DELETE' });
      setRefreshKey(k => k + 1);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete post:', err);
      showToast({
        message: 'Failed to delete post',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary">Blog Posts</h2>
        <button
          onClick={() => dashboardNavigate('/dashboard/admin/blog/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Post
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search posts..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Posts Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                    Loading posts...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-error">
                  {error}
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No blog posts found</p>
                  <button
                    onClick={() => dashboardNavigate('/dashboard/admin/blog/new')}
                    className="text-accent hover:underline text-sm mt-1 inline-block"
                  >
                    Create your first post
                  </button>
                </td>
              </tr>
            ) : (
              posts.map(post => (
                <tr key={post.id} className="hover:bg-surface-light">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-primary line-clamp-1">{post.title}</p>
                      <p className="text-xs text-muted-foreground">/{post.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <SourceBadge source={post.source} />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        post.status === 'published'
                          ? 'bg-success/20 text-success'
                          : 'bg-warning/20 text-warning'
                      }`}
                    >
                      {post.status === 'published' ? (
                        <>
                          <Eye className="h-3 w-3" />
                          Published
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          Draft
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {post.category_name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {dayjs(post.published_at || post.created_at).format('MMM D, YYYY')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => dashboardNavigate(`/dashboard/admin/blog/${post.id}`)}
                        className="p-2 rounded hover:bg-surface-light text-muted-foreground hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(post)}
                        className="p-2 rounded hover:bg-error/10 text-muted-foreground hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} posts
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-surface-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeletePost}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        variant="danger"
        labels={{ confirm: 'Delete', confirming: 'Deleting...' }}
        isConfirming={deleting}
      />
    </div>
  );
}
