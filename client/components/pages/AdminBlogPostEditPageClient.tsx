'use client';

import { useState, useEffect } from 'react';
import { BlogPostForm } from '@client/components/admin/blog/BlogPostForm';
import { adminFetch } from '@client/utils/admin-api-client';
import type { IDbBlogPost } from '@shared/types/blog.types';

interface IProps {
  postId?: string;
}

export default function AdminBlogPostEditPageClient({ postId }: IProps): JSX.Element {
  const [post, setPost] = useState<IDbBlogPost | null>(null);
  const [loading, setLoading] = useState(!!postId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        const data = await adminFetch<IDbBlogPost>(`/api/admin/blog/posts/${postId}`);
        setPost(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-error">
        <p>{error}</p>
      </div>
    );
  }

  return <BlogPostForm post={post || undefined} />;
}
