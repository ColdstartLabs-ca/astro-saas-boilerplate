/**
 * ArticleDetailModal Component
 *
 * Modal for viewing, editing, and managing individual articles.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Trash2, RotateCcw, ExternalLink, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from 'react-markdown-editor-lite';
import 'react-markdown-editor-lite/dist/esm/markdown-editor-lite.css';
import type { IArticleWithCampaign } from '@shared/types/article.types';
import { DashboardButton } from '@client/components/dashboard/ui/DashboardButton';
import { createClient } from '@shared/utils/supabase/client';

// Helper to get access token
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

interface IArticleDetailModalProps {
  article: IArticleWithCampaign | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function ArticleDetailModal({
  article,
  isOpen,
  onClose,
  onUpdate,
}: IArticleDetailModalProps): JSX.Element | null {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset edited content when article changes
  useEffect(() => {
    if (article?.content) {
      setEditedContent(article.content);
    }
  }, [article?.content]);

  const handleSave = useCallback(async () => {
    if (!article) return;
    setIsSaving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: editedContent }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save article');
      }

      setIsEditing(false);
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [article, editedContent, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!article || !confirm('Are you sure you want to delete this article?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${article.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete article');
      }

      onClose();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }, [article, onClose, onUpdate]);

  const handleRegenerate = useCallback(async () => {
    if (!article || !confirm('Regenerate this article? This will use 1 credit.')) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${article.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to regenerate article');
      }

      onClose();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  }, [article, onClose, onUpdate]);

  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-white">
              {article.title || article.primary_keyword}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                article.status === 'draft' ? 'bg-blue-500/10 text-blue-400' :
                article.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                'bg-gray-500/10 text-gray-400'
              }`}>
                {article.status.toUpperCase()}
              </span>
              {article.word_count && <span className="text-xs text-muted">{article.word_count} words</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {isEditing ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <MarkdownEditor
                value={editedContent}
                onChange={(data) => {
                  setEditedContent(data.text);
                }}
                renderHTML={(text) => text}
                style={{
                  height: '400px',
                  backgroundColor: 'var(--color-bg-surface, #1a1a1a)',
                  color: 'var(--color-text-primary, #ffffff)',
                }}
                view={{ menu: true, md: true, html: false }}
              />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-sm">
              {article.content ? (
                <ReactMarkdown>{article.content}</ReactMarkdown>
              ) : article.generation_error ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  <p className="font-medium mb-2">Generation Failed</p>
                  <p className="text-sm">{article.generation_error}</p>
                </div>
              ) : (
                <p className="text-muted italic">No content available...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-border bg-main/30 rounded-b-xl">
          <div className="flex gap-2">
            {/* Edit button */}
            {article.content && (
              <DashboardButton
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                disabled={isSaving || isDeleting || isRegenerating}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </DashboardButton>
            )}

            {/* Regenerate button (for failed articles) */}
            {article.status === 'failed' && (
              <DashboardButton
                variant="outline"
                onClick={handleRegenerate}
                disabled={isSaving || isDeleting || isRegenerating}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
              </DashboardButton>
            )}

            {/* Delete button */}
            <DashboardButton
              variant="ghost"
              onClick={handleDelete}
              disabled={isSaving || isDeleting || isRegenerating}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DashboardButton>
          </div>

          {/* Save button (when editing) */}
          {isEditing && (
            <DashboardButton
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || isDeleting || isRegenerating}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </DashboardButton>
          )}

          {/* Published link (when published) */}
          {!isEditing && article.published_url && (
            <a
              href={article.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-all text-sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Live
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
