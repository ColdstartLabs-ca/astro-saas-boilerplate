'use client';

import { useIsAdmin, useUserStore } from '@client/store/userStore';
import { FileText } from 'lucide-react';

interface IBlogEmptyStateProps {
  /** Message to show for non-admin users */
  message?: string;
}

/**
 * Empty state component for the blog listing page.
 * Shows a different CTA for admins vs regular visitors.
 */
export function BlogEmptyState({
  message = 'No blog posts yet. Check back soon!',
}: IBlogEmptyStateProps): JSX.Element {
  const isAdmin = useIsAdmin();
  const { isAuthenticated } = useUserStore();

  if (isAdmin) {
    return (
      <div className="text-center py-20 bg-surface rounded-3xl border border-border">
        <FileText className="w-12 h-12 text-accent/50 mx-auto mb-4" />
        <p className="text-text-secondary text-lg mb-4">No blog posts yet.</p>
        <a
          href="/dashboard/admin/blog"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          <FileText className="w-4 h-4" />
          Create your first post
        </a>
      </div>
    );
  }

  return (
    <div className="text-center py-20 bg-surface rounded-3xl border border-border">
      <FileText className="w-12 h-12 text-accent/50 mx-auto mb-4" />
      <p className="text-text-secondary text-lg">{message}</p>
      {isAuthenticated && (
        <p className="text-muted-foreground text-sm mt-2">
          Want to contribute? Contact the team!
        </p>
      )}
    </div>
  );
}
