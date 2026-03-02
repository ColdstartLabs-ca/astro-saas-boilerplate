import { useMemo, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Loader2,
  Edit2,
  ExternalLink,
  RefreshCw,
  Send,
  FileText,
} from 'lucide-react';
import { getArticleStatusStyles } from '@client/utils/statusStyles';
import {
  useArticleBlogStatus,
  useInvalidateArticleBlogStatus,
} from '@client/hooks/useArticleBlogStatus';
import { useArticleActions } from '@client/hooks/useArticleActions';
import { useToastStore } from '@client/store/toastStore';
import { useArticles } from '@client/hooks/useArticles';
import dayjs from 'dayjs';
import type { IArticleWithCampaign } from '@shared/types/article.types';

interface IArticleQueueTableProps {
  campaignId: string;
  onArticleClick: (article: IArticleWithCampaign) => void;
  onDeliver?: (articleId: string) => Promise<void>;
  t: (key: string) => string;
}

const DELIVERY_STATUS_STYLE: Record<string, string> = {
  delivered: 'text-green-400',
  delivering: 'text-amber-400',
  failed: 'text-red-400',
  pending: 'text-muted',
};

function getLatestDelivery(article: IArticleWithCampaign) {
  const deliveries = article.integration_deliveries;
  if (!deliveries || deliveries.length === 0) return null;
  return deliveries.reduce((latest, d) =>
    new Date(d.delivered_at ?? d.id) > new Date(latest.delivered_at ?? latest.id) ? d : latest
  );
}

interface IArticleQueueRowProps {
  article: IArticleWithCampaign;
  onArticleClick: (article: IArticleWithCampaign) => void;
  onDeliver?: (articleId: string) => Promise<void>;
  deliveringId: string | null;
  onDeliverStart: (id: string) => void;
  onDeliverEnd: () => void;
}

function ArticleQueueRow({
  article,
  onArticleClick,
  onDeliver,
  deliveringId,
  onDeliverStart,
  onDeliverEnd,
}: IArticleQueueRowProps): JSX.Element {
  const isPublished = article.status === 'published';
  const delivery = getLatestDelivery(article);
  const viewUrl = article.published_url ?? delivery?.external_url ?? null;
  const showToast = useToastStore(s => s.showToast);

  const { data: blogStatus, isLoading: isBlogStatusLoading } = useArticleBlogStatus(
    article.id,
    isPublished
  );
  const invalidateBlogStatus = useInvalidateArticleBlogStatus();
  const { syncToBlog, isSyncingToBlog } = useArticleActions({
    onSuccess: () => invalidateBlogStatus(article.id),
  });

  const handleSyncToBlog = useCallback(async () => {
    try {
      await syncToBlog(article.id);
      showToast({ type: 'success', message: 'Article synced to blog' });
    } catch {
      showToast({ type: 'error', message: 'Failed to sync article' });
    }
  }, [article.id, syncToBlog, showToast]);

  const handleDeliver = async () => {
    if (!onDeliver) return;
    onDeliverStart(article.id);
    try {
      await onDeliver(article.id);
    } finally {
      onDeliverEnd();
    }
  };

  return (
    <tr className="hover:bg-surface-light/30 transition-colors group">
      <td className="px-6 py-3">
        <button
          type="button"
          onClick={() => onArticleClick(article)}
          className="font-medium text-secondary hover:text-white transition-colors text-left"
        >
          {article.primary_keyword}
        </button>
      </td>
      <td className="px-6 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${getArticleStatusStyles(article.status)}`}
        >
          {article.status === 'generating' && (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          )}
          {article.status}
        </span>
      </td>
      <td className="px-6 py-3 text-muted font-mono text-xs">
        {article.word_count ? article.word_count.toLocaleString() : '-'}
      </td>
      <td className="px-6 py-3">
        {delivery ? (
          <span
            className={`text-xs ${DELIVERY_STATUS_STYLE[delivery.status] ?? 'text-muted'}`}
          >
            {delivery.status === 'delivered' && delivery.delivered_at
              ? dayjs(delivery.delivered_at).format('MMM D, HH:mm')
              : delivery.status}
          </span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="px-6 py-3 text-right text-muted text-xs">
        {article.generated_at ? dayjs(article.generated_at).format('MMM D') : '-'}
      </td>
      <td className="px-6 py-3 text-right">
        <div className="flex justify-end gap-1">
          {(article.status === 'draft' ||
            article.status === 'reviewed' ||
            article.status === 'published') && (
            <button
              type="button"
              onClick={() => onArticleClick(article)}
              title="Edit article"
              className="p-1.5 hover:bg-surface-light rounded text-secondary hover:text-white"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {viewUrl && (
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Visit: ${viewUrl}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Visit
            </a>
          )}
          {isPublished && !isBlogStatusLoading && (
            blogStatus?.synced ? (
              <a
                href={`/blog/${blogStatus.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                title="View on blog"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
              >
                <FileText className="w-3 h-3" />
                Blog
              </a>
            ) : (
              <button
                type="button"
                disabled={isSyncingToBlog}
                onClick={handleSyncToBlog}
                title="Sync article to blog"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted/10 text-muted hover:bg-muted/20 hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingToBlog ? 'animate-spin' : ''}`} />
                {isSyncingToBlog ? '...' : 'Sync'}
              </button>
            )
          )}
          {onDeliver && article.status === 'published' && (
            <button
              type="button"
              onClick={handleDeliver}
              disabled={deliveringId === article.id}
              title="Re-submit to blog"
              className="p-1.5 hover:bg-surface-light rounded text-secondary hover:text-accent disabled:opacity-40"
            >
              {deliveringId === article.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function ArticleQueueTable({
  campaignId,
  onArticleClick,
  onDeliver,
  t,
}: IArticleQueueTableProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  const { articles, isLoading } = useArticles({
    campaignId,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
    limit: 100,
    enabled: !!campaignId,
  });

  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      const statusOrder: Record<string, number> = {
        generating: 0,
        queued: 1,
        draft: 2,
        reviewed: 3,
        published: 4,
        failed: 5,
      };
      const aOrder = statusOrder[a.status] ?? 99;
      const bOrder = statusOrder[b.status] ?? 99;
      return aOrder - bOrder;
    });
  }, [articles]);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex-1 flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-center bg-main/30">
        <h3 className="font-semibold text-white">{t('campaigns.detail.articleQueue')}</h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
            <input
              type="text"
              placeholder={t('campaigns.detail.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-main border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-secondary focus:border-accent outline-none w-48"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-main border border-border rounded-lg pl-3 pr-8 py-1.5 text-xs text-secondary focus:border-accent outline-none cursor-pointer hover:bg-surface-light/50"
            >
              <option value="all">{t('articles.status.all')}</option>
              <option value="queued">{t('articles.status.queued')}</option>
              <option value="generating">{t('articles.status.generating')}</option>
              <option value="draft">{t('articles.status.draft')}</option>
              <option value="reviewed">{t('articles.status.reviewed')}</option>
              <option value="published">{t('articles.status.published')}</option>
              <option value="failed">{t('articles.status.failed')}</option>
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-main/50 text-muted font-medium border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Keyword</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">{t('campaigns.detail.wordCount')}</th>
                <th className="px-6 py-3">Delivered</th>
                <th className="px-6 py-3 text-right">{t('campaigns.detail.generated')}</th>
                <th className="px-6 py-3 text-right">{t('campaigns.detail.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    {t('campaigns.detail.noArticles')}
                  </td>
                </tr>
              ) : (
                sortedArticles.map(article => (
                  <ArticleQueueRow
                    key={article.id}
                    article={article}
                    onArticleClick={onArticleClick}
                    onDeliver={onDeliver}
                    deliveringId={deliveringId}
                    onDeliverStart={setDeliveringId}
                    onDeliverEnd={() => setDeliveringId(null)}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
