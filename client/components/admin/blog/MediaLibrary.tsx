'use client';

import { adminFetch } from '@client/utils/admin-api-client';
import type { IBlogMedia, IBlogMediaListResponse } from '@shared/types/blog.types';
import { useToastStore } from '@client/store/toastStore';
import {
  Search,
  Upload,
  Edit,
  Trash2,
  X,
  Image as ImageIcon,
  Loader2,
  Check,
  HardDrive,
  Calendar,
  Maximize,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { createClient } from '@shared/utils/supabase/client';

interface IMediaLibraryProps {
  onSelect?: (media: IBlogMedia) => void;
  selectionMode?: boolean;
}

export function MediaLibrary({ onSelect, selectionMode = false }: IMediaLibraryProps): JSX.Element {
  const { showToast } = useToastStore();
  const [media, setMedia] = useState<IBlogMedia[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editModal, setEditModal] = useState<IBlogMedia | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<IBlogMedia | null>(null);
  const [editForm, setEditForm] = useState({ alt_text: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMedia = useCallback(async (search?: string, tags?: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: '100',
        ...(search && { search }),
        ...(tags && tags.length > 0 && { tag: tags.join(',') }),
      });
      const data = await adminFetch<IBlogMediaListResponse>(`/api/admin/blog/media?${params}`);
      setMedia(data.media || []);

      // Extract unique tags from all media
      const tagSet = new Set<string>();
      data.media?.forEach(item => {
        item.tags?.forEach(tag => tagSet.add(tag));
      });
      setAllTags(Array.from(tagSet).sort());
    } catch (err) {
      console.error('Failed to fetch media:', err);
      setError(err instanceof Error ? err.message : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchMedia(value, selectedTags);
    }, 300);
  };

  // Tag filter
  const handleTagClick = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    fetchMedia(searchQuery, newTags);
  };

  // File upload handling
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      showToast({
        message: 'Please select an image file',
        type: 'error',
      });
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('alt_text', file.name.replace(/\.[^/.]+$/, ''));

      const response = await fetch('/api/admin/blog/media', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload image');
      }

      // Refresh media list
      fetchMedia(searchQuery, selectedTags);
    } catch (err) {
      console.error('Failed to upload media:', err);
      showToast({
        message: err instanceof Error ? err.message : 'Failed to upload image',
        type: 'error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Edit media
  const openEditModal = (item: IBlogMedia) => {
    setEditModal(item);
    setEditForm({
      alt_text: item.alt_text || '',
      tags: (item.tags || []).join(', '),
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      const tags = editForm.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      await adminFetch(`/api/admin/blog/media/${editModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alt_text: editForm.alt_text,
          tags,
        }),
      });

      setEditModal(null);
      fetchMedia(searchQuery, selectedTags);
    } catch (err) {
      console.error('Failed to update media:', err);
      showToast({
        message: err instanceof Error ? err.message : 'Failed to update media',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete media
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/blog/media/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      setDeleteConfirm(null);
      fetchMedia(searchQuery, selectedTags);
    } catch (err) {
      console.error('Failed to delete media:', err);
      showToast({
        message: err instanceof Error ? err.message : 'Failed to delete media',
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-primary">Media Library</h2>
        {!selectionMode && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Image
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={e => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by alt text..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent bg-surface"
          />
        </div>
      </div>

      {/* Tag Filter Chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-accent text-white'
                  : 'bg-surface-light text-muted-foreground hover:bg-accent/20'
              }`}
            >
              #{tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => {
                setSelectedTags([]);
                fetchMedia(searchQuery, []);
              }}
              className="px-3 py-1 text-xs rounded-full text-muted-foreground hover:text-error transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Upload Zone */}
      {!selectionMode && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-accent bg-accent/10'
              : 'border-border hover:border-accent/50'
          }`}
        >
          <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragOver ? 'text-accent' : 'text-muted-foreground'}`} />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop an image here, or use the upload button
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: JPG, PNG, GIF, WebP
          </p>
        </div>
      )}

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-error">{error}</div>
      ) : media.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No images found</p>
          {(searchQuery || selectedTags.length > 0) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTags([]);
                fetchMedia();
              }}
              className="text-accent hover:underline text-sm mt-2"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map(item => (
            <div
              key={item.id}
              className={`group relative bg-surface rounded-lg border border-border overflow-hidden ${
                selectionMode ? 'cursor-pointer hover:border-accent' : ''
              }`}
              onClick={() => selectionMode && onSelect?.(item)}
            >
              {/* Image */}
              <div className="aspect-video relative">
                <img
                  src={item.public_url}
                  alt={item.alt_text || ''}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay for actions */}
                {!selectionMode && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openEditModal(item);
                      }}
                      className="p-2 bg-surface/90 rounded-lg hover:bg-surface transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteConfirm(item);
                      }}
                      className="p-2 bg-error/90 rounded-lg hover:bg-error transition-colors text-white"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {selectionMode && (
                  <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-3">
                <p className="text-sm text-primary truncate mb-1">
                  {item.alt_text || 'No alt text'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <HardDrive className="h-3 w-3" />
                  <span>{formatFileSize(item.file_size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setEditModal(null);
            }
          }}
        >
          <div className="bg-surface rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium text-primary">Edit Media</h3>
              <button
                onClick={() => setEditModal(null)}
                className="p-1 hover:bg-surface-light rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="p-4 border-b border-border">
              <img
                src={editModal.public_url}
                alt={editModal.alt_text || ''}
                className="w-full rounded-lg"
              />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatFileSize(editModal.file_size)}
                </div>
                <div className="flex items-center gap-1">
                  <Maximize className="h-3 w-3" />
                  {editModal.width && editModal.height
                    ? `${editModal.width} x ${editModal.height}`
                    : 'Unknown'}
                </div>
                <div className="flex items-center gap-1 col-span-2">
                  <Calendar className="h-3 w-3" />
                  {formatDate(editModal.created_at)}
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Alt Text
                </label>
                <textarea
                  value={editForm.alt_text}
                  onChange={e => setEditForm(prev => ({ ...prev, alt_text: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Describe this image for accessibility..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Comma-separated tags (e.g., banner, product, hero)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate multiple tags with commas
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-light rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setDeleteConfirm(null);
            }
          }}
        >
          <div className="bg-surface rounded-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-error/10 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-error" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-primary mb-2">Delete Image</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to delete this image? This action cannot be undone.
                </p>
                <div className="flex items-center gap-3 p-3 bg-surface-light rounded-lg">
                  <img
                    src={deleteConfirm.public_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary truncate">
                      {deleteConfirm.alt_text || deleteConfirm.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(deleteConfirm.file_size)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-light rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-error hover:bg-error/90 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
