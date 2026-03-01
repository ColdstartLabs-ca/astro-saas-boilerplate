/**
 * ArticleContentPanel Component
 *
 * Displays article markdown content with edit mode support.
 * Handles content viewing, editing via MDEditor, and save/cancel actions.
 */

'use client';

import React, { useState, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { ImageOff } from 'lucide-react';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Count words in markdown content by stripping syntax
 */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/#{1,6}\s/g, '') // Headers
    .replace(/\*\*/g, '') // Bold
    .replace(/\*/g, '') // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/`{1,3}/g, '') // Code
    .replace(/>\s/g, '') // Blockquotes
    .replace(/\n/g, ' ') // Newlines to spaces
    .trim();

  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if content has unsaved changes
 */
export function hasUnsavedChanges(original: string, current: string): boolean {
  return original !== current;
}

// =============================================================================
// MarkdownImage Component
// =============================================================================

function MarkdownImage(props: React.ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted text-xs py-1">
        <ImageOff className="w-4 h-4" />
        Image expired
      </span>
    );
  }

  return <img {...props} onError={() => setBroken(true)} />;
}

// =============================================================================
// ArticleContentPanel Props
// =============================================================================

export interface IArticleContentPanelProps {
  /** The markdown content to display */
  content: string | null;
  /** Generation error message if content failed to generate */
  generationError?: string | null;
  /** Whether edit mode is active */
  isEditing: boolean;
  /** The edited content (controlled) */
  editedContent: string;
  /** Callback when edited content changes */
  onEditedContentChange: (content: string) => void;
  /** Callback to save changes */
  onSave: () => void;
  /** Callback to cancel editing */
  onCancelEdit: () => void;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

// =============================================================================
// ArticleContentPanel Component
// =============================================================================

export const ArticleContentPanel = memo(function ArticleContentPanel({
  content,
  generationError,
  isEditing,
  editedContent,
  onEditedContentChange,
  onSave,
  onCancelEdit,
  isSaving,
  t,
}: IArticleContentPanelProps): JSX.Element {
  const handleCancel = useCallback(() => {
    onCancelEdit();
  }, [onCancelEdit]);

  // Edit mode with MDEditor
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="border border-border rounded-lg overflow-hidden" data-color-mode="dark">
          <MDEditor
            value={editedContent}
            onChange={value => onEditedContentChange(value || '')}
            height={400}
            preview="edit"
            hideToolbar={false}
            textareaProps={{
              placeholder: 'Write your article content in markdown...',
            }}
          />
          {/* Word count and dirty state indicator during editing */}
          <div className="flex items-center justify-between p-3 bg-surface-light text-xs text-muted">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges(content || '', editedContent) && (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{t('articles.detailModal.unsavedChanges')}</span>
                </>
              )}
            </div>
            <span>{t('articles.detailModal.wordCount', { count: countWords(editedContent) })}</span>
          </div>
        </div>

        {/* Edit action buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-muted hover:text-white transition-colors disabled:opacity-50"
          >
            {t('articles.detailModal.cancelEdit')}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges(content || '', editedContent)}
            className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? t('articles.detailModal.saving') : t('articles.detailModal.saveChanges')}
          </button>
        </div>
      </div>
    );
  }

  // View mode with ReactMarkdown
  return (
    <div className="prose prose-invert max-w-none text-sm">
      {content ? (
        <ReactMarkdown components={{ img: MarkdownImage }}>{content}</ReactMarkdown>
      ) : generationError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          <p className="font-medium mb-2">{t('articles.detailModal.generationFailed')}</p>
          <p className="text-sm">{generationError}</p>
        </div>
      ) : (
        <p className="text-muted italic">{t('articles.detailModal.noContent')}</p>
      )}
    </div>
  );
});
