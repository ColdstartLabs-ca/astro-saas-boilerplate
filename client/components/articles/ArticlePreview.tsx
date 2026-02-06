/**
 * ArticlePreview Component
 *
 * Displays a generated article with metadata and actions.
 */

'use client';

import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { IArticle } from '@shared/types/article.types';
import { Button } from '@client/components/ui/Button';

interface IArticlePreviewProps {
  article: IArticle;
  onGenerateAnother?: () => void;
}

export function ArticlePreview({ article, onGenerateAnother }: IArticlePreviewProps): JSX.Element {
  // Sanitized HTML from markdown content
  const sanitizedHtml = useMemo(() => {
    if (!article.content) return '';
    const rawHtml = marked.parse(article.content, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [article.content]);

  // Format generation time
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-light">
        <h3 className="text-lg font-semibold text-text-primary truncate">
          {article.title || 'Untitled Article'}
        </h3>
        {article.meta_description && (
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">
            {article.meta_description}
          </p>
        )}
      </div>

      {/* Metadata badges */}
      <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2">
        {article.word_count && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
            {article.word_count} words
          </span>
        )}
        {article.ai_model_used && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface border border-border text-text-secondary">
            {article.ai_model_used}
          </span>
        )}
        {article.generation_time_ms && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface border border-border text-text-secondary">
            Generated in {formatTime(article.generation_time_ms)}
          </span>
        )}
        {article.token_count && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface border border-border text-text-secondary">
            {article.token_count} tokens
          </span>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto">
        {sanitizedHtml ? (
          <div
            className="prose prose-sm max-w-none text-text-primary"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <p className="text-text-secondary italic">No content available</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border bg-surface-light flex justify-end gap-3">
        {onGenerateAnother && (
          <Button variant="outline" onClick={onGenerateAnother}>
            Generate Another
          </Button>
        )}
        <Button variant="primary" disabled>
          Edit Article (Coming Soon)
        </Button>
      </div>
    </div>
  );
}
