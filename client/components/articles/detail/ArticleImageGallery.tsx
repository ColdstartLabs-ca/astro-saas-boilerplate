/**
 * ArticleImageGallery Component
 *
 * Displays generated article images in a grid layout.
 * Handles broken image states and provides full-size preview links.
 */

'use client';

import { useState, memo } from 'react';
import { Image as ImageIcon, Loader2, AlertCircle, ImageOff } from 'lucide-react';

/**
 * Simplified image type for gallery display.
 * Compatible with both IArticleImage and IArticleWithCampaign.article_images.
 */
interface IGalleryImageItem {
  id: string;
  position: number;
  image_url: string | null;
  prompt?: string;
  status: string;
}

// =============================================================================
// GalleryImage Component
// =============================================================================

interface IGalleryImageProps {
  src: string;
  alt: string;
  className?: string;
}

function GalleryImage({ src, alt, className }: IGalleryImageProps): JSX.Element {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        className={`${className ?? 'w-full h-36'} flex flex-col items-center justify-center gap-1.5 text-muted`}
      >
        <ImageOff className="w-5 h-5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">Expired</span>
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setBroken(true)} />
  );
}

// =============================================================================
// ArticleImageGallery Props
// =============================================================================

export interface IArticleImageGalleryProps {
  /** Array of article images to display */
  images: IGalleryImageItem[] | undefined;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

// =============================================================================
// ArticleImageGallery Component
// =============================================================================

export const ArticleImageGallery = memo(function ArticleImageGallery({
  images,
  t,
}: IArticleImageGalleryProps): JSX.Element | null {
  // Don't render if no images
  if (!images || images.length === 0) {
    return null;
  }

  // Sort images by position
  const sortedImages = [...images].sort((a, b) => a.position - b.position);

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-4 h-4 text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">
          {t('articles.detailModal.generatedImages', { count: sortedImages.length })}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sortedImages.map(img => (
          <div
            key={img.id}
            className="relative group rounded-lg overflow-hidden border border-border bg-surface-light"
          >
            {img.status === 'completed' && img.image_url ? (
              <>
                <GalleryImage
                  src={img.image_url}
                  alt={img.prompt?.substring(0, 80) ?? ''}
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a
                    href={img.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-xs px-3 py-1.5 bg-accent/90 rounded-md hover:bg-accent transition-colors backdrop-blur-sm"
                  >
                    {t('articles.detailModal.viewFullSize')}
                  </a>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.prompt && <p className="text-[10px] text-white/80 truncate">{img.prompt}</p>}
                </div>
              </>
            ) : img.status === 'failed' ? (
              <div className="w-full h-36 flex flex-col items-center justify-center gap-1.5 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Failed</span>
              </div>
            ) : (
              <div className="w-full h-36 flex flex-col items-center justify-center gap-1.5 text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {img.status}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
