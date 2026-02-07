/**
 * ArticleDetailModal Component
 *
 * Modal for viewing, editing, and managing individual articles.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, Trash2, RotateCcw, ExternalLink, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
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
  onUpdate?: (updatedArticle: IArticleWithCampaign) => void;
}

interface IArticleWithImages extends IArticleWithCampaign {
  article_images?: Array<{
    id: string;
    position: number;
    image_url: string | null;
    prompt: string;
    status: string;
  }>;
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
  const [currentArticle, setCurrentArticle] = useState<IArticleWithImages | null>(article as IArticleWithImages | null);

  // Sync article prop to local state
  useEffect(() => {
    setCurrentArticle(article);
    if (article?.content) {
      setEditedContent(article.content);
    }
  }, [article]);

  const handleSave = useCallback(async () => {
    if (!currentArticle) return;
    setIsSaving(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}`, {
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

      const result = await response.json();
      const updatedArticle = result.data.article as IArticleWithCampaign;

      // Update local state with the response
      setCurrentArticle(updatedArticle);
      setIsEditing(false);
      onUpdate?.(updatedArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [currentArticle, editedContent, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!currentArticle || !confirm('Are you sure you want to delete this article?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}`, {
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
      onUpdate?.(currentArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }, [currentArticle, onClose, onUpdate]);

  const handleRegenerate = useCallback(async () => {
    if (!currentArticle || !confirm('Regenerate this article? This will use 1 credit.')) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/articles/${currentArticle.id}/regenerate`, {
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
      onUpdate?.(currentArticle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  }, [currentArticle, onClose, onUpdate]);

  if (!isOpen || !currentArticle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-white">
              {currentArticle.title || currentArticle.primary_keyword}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                currentArticle.status === 'draft' ? 'bg-blue-500/10 text-blue-400' :
                currentArticle.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                'bg-gray-500/10 text-gray-400'
              }`}>
                {currentArticle.status.toUpperCase()}
              </span>
              {currentArticle.word_count && <span className="text-xs text-muted">{currentArticle.word_count} words</span>}
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
            <div className="border border-border rounded-lg overflow-hidden" data-color-mode="dark">
              <MDEditor
                value={editedContent}
                onChange={(value) => setEditedContent(value || '')}
                height={400}
                preview="edit"
                hideToolbar={false}
                textareaProps={{
                  placeholder: 'Write your article content in markdown...',
                }}
              />
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-sm">
              {currentArticle.content ? (
                <ReactMarkdown>{currentArticle.content}</ReactMarkdown>
              ) : currentArticle.generation_error ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
                  <p className="font-medium mb-2">Generation Failed</p>
                  <p className="text-sm">{currentArticle.generation_error}</p>
                </div>
              ) : (
                <p className="text-muted italic">No content available...</p>
              )}
            </div>
          )}

          {/* Images section */}
          {!isEditing && currentArticle.article_images && currentArticle.article_images.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Generated Images ({currentArticle.article_images.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {currentArticle.article_images
                  .filter(img => img.status === 'completed' && img.image_url)
                  .sort((a, b) => a.position - b.position)
                  .map((img) => (
                    <div key={img.id} className="relative group">
                      <img
                        src={img.image_url!}
                        alt={`Article image at position ${img.position}`}
                        className="w-full h-32 object-cover rounded-lg border border-border"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <a
                          href={img.image_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white text-xs px-3 py-1.5 bg-accent rounded-md hover:bg-accent-hover transition-colors"
                        >
                          View Full Size
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-border bg-main/30 rounded-b-xl">
          <div className="flex gap-2">
            {/* Edit button */}
            {currentArticle.content && (
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
            {currentArticle.status === 'failed' && (
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
          {!isEditing && currentArticle.published_url && (
            <a
              href={currentArticle.published_url}
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
