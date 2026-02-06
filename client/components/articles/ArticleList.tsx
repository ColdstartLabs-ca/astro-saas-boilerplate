/**
 * ArticleList Component
 *
 * Displays a list of articles with campaign info and status.
 */

'use client';

import { useMemo, useState } from 'react';
import { FileText, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { useArticles } from '@client/hooks/useArticles';
import { useProjects } from '@client/hooks/useProjects';
import { getTranslations } from '@src/i18n/utils';
import { dashboardNavigate } from '@client/utils/dashboardNavigation';
import { ArticleDetailModal } from './ArticleDetailModal';
import type { IArticleWithCampaign } from '@shared/types/article.types';

interface IArticleListProps {
  statusFilter?: string;
}

export function ArticleList({ statusFilter }: IArticleListProps): JSX.Element {
  const t = useMemo(() => getTranslations('dashboard'), []);
  const { activeProject } = useProjects();
  const { articles, isLoading, error, refetch } = useArticles({
    projectId: activeProject?.id,
    enabled: !!activeProject,
  });

  const [selectedArticle, setSelectedArticle] = useState<IArticleWithCampaign | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filter by status if provided
  const filteredArticles = useMemo(() => {
    if (!statusFilter) return articles;
    return articles.filter(a => a.status === statusFilter);
  }, [articles, statusFilter]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-blue-500/10 text-blue-400',
      generating: 'bg-yellow-500/10 text-yellow-400',
      queued: 'bg-gray-500/10 text-gray-400',
      reviewed: 'bg-purple-500/10 text-purple-400',
      published: 'bg-green-500/10 text-green-400',
      failed: 'bg-red-500/10 text-red-400',
    };
    const labels: Record<string, string> = {
      draft: 'Draft',
      generating: 'Generating',
      queued: 'Queued',
      reviewed: 'Reviewed',
      published: 'Published',
      failed: 'Failed',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.draft}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Loading articles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <p className="text-error text-sm">Failed to load articles</p>
      </div>
    );
  }

  if (filteredArticles.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">No articles yet</h3>
        <p className="text-text-secondary text-sm">
          {statusFilter
            ? `No ${statusFilter} articles found`
            : 'Generate your first article to see it here'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">Recent Articles</h2>
      </div>
      <div className="divide-y divide-border">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            className="px-6 py-4 hover:bg-surface-light/50 transition-colors cursor-pointer"
            onClick={() => {
              setSelectedArticle(article);
              setIsDetailModalOpen(true);
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-text-primary truncate">
                    {article.title || article.primary_keyword}
                  </h3>
                  {getStatusBadge(article.status)}
                </div>
                <p className="text-xs text-muted truncate mb-2">
                  {article.primary_keyword}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {/* Campaign - hide "Quick Generate" or show as uncategorized */}
                  {article.campaigns && article.campaigns.name !== 'Quick Generate' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (article.campaigns) {
                          dashboardNavigate(`/dashboard/campaigns/${article.campaigns.id}`);
                        }
                      }}
                      className="hover:text-accent transition-colors flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      {article.campaigns.name}
                    </button>
                  )}
                  {article.campaigns?.name === 'Quick Generate' && (
                    <span className="text-muted italic">Uncategorized</span>
                  )}
                  {/* Word count */}
                  {article.word_count && (
                    <span>{article.word_count} words</span>
                  )}
                  {/* Date */}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(article.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {/* Published URL */}
              {article.published_url && (
                <a
                  href={article.published_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-light"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Article Detail Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedArticle(null);
        }}
        onUpdate={() => {
          refetch();
        }}
      />
    </div>
  );
}
